import type { Express } from "express";
import { createServer, type Server } from "http";
import rateLimit from "express-rate-limit";
import { storage } from "./storage";
import { initializeApp as initializeFirebaseApp, getApps } from "firebase/app";
import { getFirestore, collection, getDocs, query, orderBy, limit, where, Timestamp } from "firebase/firestore";
import { handleChatMessage, setEventsCache, setAnnouncementsCache } from "./chatbot";
import { createRequire } from "module";
import { fileURLToPath } from "url";
const _filename = typeof __filename !== 'undefined' ? __filename : fileURLToPath(import.meta.url);
const _require = createRequire(_filename);
const PaytmChecksum = _require("paytmchecksum");

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  const SRINGERI_API_URL = process.env.VITE_SRINGERI_API_URL || "https://dsspv2.lcpl.in";
  const SRINGERI_API_KEY = process.env.SRINGERI_API_KEY;

  // ---------------------------------------------------------------------------
  // In-memory TTL cache — reduces upstream API calls for static/semi-static data
  // ---------------------------------------------------------------------------
  function makeCache(ttlMs: number): { get(k: string): any; set(k: string, v: any): void } {
    const s = new Map<string, { v: any; t: number }>();
    return {
      get(k: string) { const e = s.get(k); return (e && Date.now() - e.t < ttlMs) ? e.v : null; },
      set(k: string, v: any) { s.set(k, { v, t: Date.now() }); },
    };
  }
  const _c = {
    launchStatus:        makeCache(30_000),              // 30 s  — DB hit reduction
    rashis:              makeCache(12 * 3600_000),        // 12 hr — never changes
    nakshatras:          makeCache(12 * 3600_000),
    tithis:              makeCache(12 * 3600_000),
    chandraMasas:        makeCache(12 * 3600_000),
    souraMasas:          makeCache(12 * 3600_000),
    calendarTypes:       makeCache(12 * 3600_000),
    recurrenceTypes:     makeCache(12 * 3600_000),
    govtIdTypes:         makeCache(12 * 3600_000),
    postageOptions:      makeCache(3600_000),
  };
  // Transliterate cache: same input always gives same output
  const _xlitCache = new Map<string, string>();
  const XLIT_MAX = 5000;

  const firebaseAdminMod = await import("firebase-admin");
  if (!firebaseAdminMod.default.apps.length) {
    const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    const credential = serviceAccountJson
      ? firebaseAdminMod.default.credential.cert(JSON.parse(serviceAccountJson) as object)
      : undefined;
    firebaseAdminMod.default.initializeApp({
      credential,
      projectId: process.env.VITE_FIREBASE_PROJECT_ID || process.env.SRINGERI_NET_FIREBASE_PROJECT_ID || undefined,
    });
  }
  const adminAuthEarly = firebaseAdminMod.default.auth();

  async function verifyFirebaseTokenEarly(idToken: string): Promise<string | null> {
    try {
      const decoded = await adminAuthEarly.verifyIdToken(idToken);
      return decoded.uid;
    } catch {
      return null;
    }
  }

  async function verifyFirebaseTokenWithEmail(idToken: string): Promise<{ uid: string; email: string | null } | null> {
    try {
      const decoded = await adminAuthEarly.verifyIdToken(idToken);
      return { uid: decoded.uid, email: decoded.email ?? null };
    } catch {
      return null;
    }
  }

  async function getFirebaseUidAndEmail(req: any): Promise<{ uid: string; email: string | null } | null> {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) return null;
    const token = authHeader.slice(7);
    return verifyFirebaseTokenWithEmail(token);
  }

  const ALL_FALLBACK_UIDS = [...new Set([
    ...(process.env.ANALYTICS_ADMIN_UIDS || "").split(","),
    ...(process.env.QUIZ_ADMIN_UIDS || "").split(","),
  ])].map(s => s.trim()).filter(Boolean);

  async function getUidAndAdminRoles(req: any): Promise<{ uid: string | null; roles: string[] }> {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) return { uid: null, roles: [] };
    const token = authHeader.slice(7);
    const uid = await verifyFirebaseTokenEarly(token);
    if (!uid) return { uid: null, roles: [] };
    if (ALL_FALLBACK_UIDS.includes(uid)) return { uid, roles: ["super_admin"] };
    const roles = await storage.getAdminRolesForUser(uid);
    return { uid, roles };
  }

  async function requireRole(req: any, ...allowedRoles: string[]): Promise<boolean> {
    const { uid, roles } = await getUidAndAdminRoles(req);
    if (!uid) return false;
    if (roles.includes("super_admin")) return true;
    return allowedRoles.some(r => roles.includes(r));
  }

  const DEMO_USER_EMAIL = (process.env.DEMO_USER_EMAIL || "demo@dssps.app").toLowerCase();
  function isDemoEmail(email: string | null | undefined): boolean {
    return !!email && email.toLowerCase() === DEMO_USER_EMAIL;
  }

  const sringeriNetConfig = {
    apiKey: process.env.SRINGERI_NET_FIREBASE_API_KEY,
    authDomain: process.env.SRINGERI_NET_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.SRINGERI_NET_FIREBASE_PROJECT_ID,
  };

  let sringeriDb: ReturnType<typeof getFirestore> | null = null;
  
  if (sringeriNetConfig.apiKey && sringeriNetConfig.projectId) {
    try {
      const existingApps = getApps();
      const sringeriApp = existingApps.find(a => a.name === 'sringeri-net') 
        || initializeFirebaseApp(sringeriNetConfig, 'sringeri-net');
      sringeriDb = getFirestore(sringeriApp);
      console.log("Sringeri.net Firestore initialized successfully");
    } catch (error) {
      console.error("Failed to initialize Sringeri.net Firestore:", error);
    }
  }

  const FIREBASE_REST_KEY = process.env.SRINGERI_NET_FIREBASE_API_KEY || process.env.VITE_FIREBASE_API_KEY || "";
  const hasServiceAccount = !!process.env.FIREBASE_SERVICE_ACCOUNT_JSON;

  const passwordResetIpLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many password reset attempts. Please wait 15 minutes before trying again." },
  });

  const passwordResetEmailCooldown = new Map<string, number>();
  const EMAIL_COOLDOWN_MS = 2 * 60 * 1000;

  app.post("/api/auth/request-password-reset", passwordResetIpLimiter, async (req, res) => {
    const { email } = req.body;
    if (!email || typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return res.status(400).json({ error: "A valid email address is required." });
    }
    const normalizedEmail = email.trim().toLowerCase();

    const lastSent = passwordResetEmailCooldown.get(normalizedEmail);
    if (lastSent && Date.now() - lastSent < EMAIL_COOLDOWN_MS) {
      const secsLeft = Math.ceil((EMAIL_COOLDOWN_MS - (Date.now() - lastSent)) / 1000);
      return res.status(429).json({ error: `A reset link was already sent. Please wait ${secsLeft} seconds before requesting another.` });
    }

    try {
      if (hasServiceAccount) {
        const { sendPasswordResetEmail: sendResetEmail, isEmailServiceConfigured } = await import("./email-service.js");
        if (!isEmailServiceConfigured()) {
          return res.status(503).json({ error: "Email service is not configured." });
        }
        let userRecord: any;
        try {
          userRecord = await adminAuthEarly.getUserByEmail(normalizedEmail);
        } catch (err: any) {
          const code = err?.code || err?.errorInfo?.code || "";
          if (code === "auth/user-not-found" || code === "auth/invalid-email") {
            return res.status(404).json({ error: "No account found for that email address." });
          }
          throw err;
        }
        const providers: string[] = (userRecord.providerData || []).map((p: any) => p.providerId);
        const hasPassword = providers.includes("password");
        if (!hasPassword) {
          const providerNames = providers
            .map((p: string) => p === "google.com" ? "Google" : p === "apple.com" ? "Apple" : p)
            .join(" / ");
          return res.status(400).json({
            error: `This email is registered via ${providerNames || "a social login"}. Please sign in using that method instead.`,
          });
        }
        let firebaseLink: string;
        try {
          firebaseLink = await adminAuthEarly.generatePasswordResetLink(normalizedEmail);
        } catch (err: any) {
          const code = err?.code || err?.errorInfo?.code || "";
          if (code === "auth/too-many-requests") {
            return res.status(429).json({ error: "Too many requests. Please try again in a few minutes." });
          }
          throw err;
        }
        const oobCode = new URL(firebaseLink).searchParams.get("oobCode") || "";
        const host = req.headers.host || "sringeri.app";
        const proto = (req.headers["x-forwarded-proto"] as string) || (host.includes("localhost") ? "http" : "https");
        const resetLink = `${proto}://${host}/reset-password?oobCode=${encodeURIComponent(oobCode)}`;
        await sendResetEmail(normalizedEmail, resetLink);
        passwordResetEmailCooldown.set(normalizedEmail, Date.now());
        return res.json({ success: true });
      }

      // Fallback (no service account): use Firebase REST API
      if (!FIREBASE_REST_KEY) {
        return res.status(503).json({ error: "Authentication service is not configured." });
      }
      const checkRes = await fetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:createAuthUri?key=${FIREBASE_REST_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ identifier: normalizedEmail, continueUri: "https://example.com" }),
        }
      );
      const checkData = await checkRes.json() as { registered?: boolean; signinMethods?: string[]; allProviders?: string[] };
      if (!checkData.registered) {
        return res.status(404).json({ error: "No account found for that email address." });
      }
      const providers: string[] = checkData.signinMethods || checkData.allProviders || [];
      const hasPassword = providers.includes("password") || providers.includes("emailLink");
      if (!hasPassword) {
        const providerNames = providers
          .map((p) => p === "google.com" ? "Google" : p === "apple.com" ? "Apple" : p)
          .join(" / ");
        return res.status(400).json({
          error: `This email is registered via ${providerNames || "a social login"}. Please sign in using that method instead.`,
        });
      }
      const sendRes = await fetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=${FIREBASE_REST_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ requestType: "PASSWORD_RESET", email: normalizedEmail }),
        }
      );
      if (!sendRes.ok) {
        const errData = await sendRes.json() as any;
        const errCode = errData?.error?.message || "";
        if (errCode === "EMAIL_NOT_FOUND") {
          return res.status(404).json({ error: "No account found for that email address." });
        }
        if (errCode === "TOO_MANY_ATTEMPTS_TRY_LATER") {
          return res.status(429).json({ error: "Too many requests. Please try again in a few minutes." });
        }
        throw new Error(errCode || "Failed to send reset email");
      }
      passwordResetEmailCooldown.set(normalizedEmail, Date.now());
      res.json({ success: true });
    } catch (err: any) {
      console.error("[PasswordReset] Failed to send reset email:", err);
      res.status(500).json({ error: "Failed to send password reset email. Please try again." });
    }
  });

  app.post("/api/auth/confirm-password-reset", async (req, res) => {
    const { oobCode, password } = req.body;
    if (!oobCode || typeof oobCode !== "string") {
      return res.status(400).json({ error: "Reset code is required." });
    }
    if (!password || typeof password !== "string" || password.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters." });
    }
    try {
      if (!FIREBASE_REST_KEY) {
        return res.status(503).json({ error: "Authentication service is not configured." });
      }
      const resetRes = await fetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:resetPassword?key=${FIREBASE_REST_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ oobCode, newPassword: password }),
        }
      );
      if (!resetRes.ok) {
        const errData = await resetRes.json() as any;
        const code = errData?.error?.message || "";
        if (code === "EXPIRED_OOB_CODE") {
          return res.status(400).json({ error: "This reset link has expired. Please request a new one." });
        }
        if (code === "INVALID_OOB_CODE") {
          return res.status(400).json({ error: "This reset link is invalid or has already been used." });
        }
        throw new Error(code || "Failed to update password");
      }
      res.json({ success: true });
    } catch (err: any) {
      console.error("[PasswordReset] Failed to confirm password reset:", err);
      res.status(500).json({ error: "Failed to update password. Please try again." });
    }
  });

  app.get("/api/launch-status", async (_req, res) => {
    try {
      const cached = _c.launchStatus.get("v");
      if (cached !== null) return res.json(cached);
      const val = await storage.getAppSetting("isLaunched");
      const result = { isLaunched: val === "true" };
      _c.launchStatus.set("v", result);
      res.json(result);
    } catch (error) {
      res.json({ isLaunched: false });
    }
  });

  app.post("/api/launch", async (req, res) => {
    try {
      if (!await requireRole(req, "super_admin")) return res.status(403).json({ error: "Forbidden" });
      const { uid } = await getUidAndAdminRoles(req);
      await storage.setAppSetting("isLaunched", "true");
      console.log(`[Launch] App launched by admin UID: ${uid}`);
      res.json({ success: true, isLaunched: true });
    } catch (error) {
      console.error("[Launch] Error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/launch/reset", async (req, res) => {
    try {
      if (!await requireRole(req, "super_admin")) return res.status(403).json({ error: "Forbidden" });
      const { uid } = await getUidAndAdminRoles(req);
      await storage.setAppSetting("isLaunched", "false");
      console.log(`[Launch] App reset to pre-launch by admin UID: ${uid}`);
      res.json({ success: true, isLaunched: false });
    } catch (error) {
      console.error("[Launch Reset] Error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/user/profile", async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const token = authHeader.split(" ")[1];

      const response = await fetch(`${SRINGERI_API_URL}/api/user/profile`, {
        headers: {
          Authorization: `Bearer ${token}`,
          ...(SRINGERI_API_KEY && { "X-API-Key": SRINGERI_API_KEY }),
        },
      });

      if (!response.ok) {
        return res.status(response.status).json({ error: "Failed to fetch profile" });
      }

      const data = await response.json();
      res.json(data);
    } catch (error) {
      console.error("Error fetching user profile:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/setOnlineSession/:uid", async (req, res) => {
    try {
      const { uid } = req.params;
      
      if (!uid) {
        return res.status(400).json({ error: "User ID is required" });
      }

      const response = await fetch(`${SRINGERI_API_URL}/api/setOnlineSession/${uid}`, {
        headers: {
          "Content-Type": "application/json",
          ...(SRINGERI_API_KEY && { "X-API-Key": SRINGERI_API_KEY }),
        },
      });

      if (!response.ok) {
        return res.status(response.status).json({ error: "Failed to set online session" });
      }

      const data = await response.json();
      return res.json(data);
    } catch (error) {
      console.error("Error setting online session:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/onlineDevotee/:uid", async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const token = authHeader.slice(7);
      const verifiedUid = await verifyFirebaseTokenEarly(token);
      if (!verifiedUid) {
        return res.status(401).json({ error: "Invalid or expired token" });
      }

      const { uid } = req.params;
      
      if (!uid || uid !== verifiedUid) {
        return res.status(403).json({ error: "Not authorized to update this profile" });
      }

      const allowedFields = ["name", "nameK", "mobile", "countryCode", "city"];
      const filtered: Record<string, string> = {};
      for (const key of allowedFields) {
        if (req.body[key] !== undefined) {
          filtered[key] = req.body[key];
        }
      }

      const response = await fetch(`${SRINGERI_API_URL}/api/onlineDevotee/${uid}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(SRINGERI_API_KEY && { "X-API-Key": SRINGERI_API_KEY }),
        },
        body: JSON.stringify(filtered),
      });

      if (!response.ok) {
        return res.status(response.status).json({ error: "Failed to update devotee profile" });
      }

      const text = await response.text();
      let data;
      try {
        const jsonStart = text.indexOf('{');
        if (jsonStart !== -1) {
          data = JSON.parse(text.substring(jsonStart));
        } else {
          data = JSON.parse(text);
        }
      } catch {
        data = { success: true };
      }

      if (data.status_code === 0 || data.status === "Nothing Updated") {
        console.log("[Profile Update] API returned 'Nothing Updated':", JSON.stringify(data));
        return res.status(422).json({ error: "Profile update was not accepted by the server. Please ensure you are changing at least one field." });
      }

      return res.json(data);
    } catch (error) {
      console.error("Error updating devotee profile:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/devoteeKarta", async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const token = authHeader.slice(7);
      const verifiedUid = await verifyFirebaseTokenEarly(token);
      if (!verifiedUid) {
        return res.status(401).json({ error: "Invalid or expired token" });
      }

      const allowedFields = ["name", "nameK", "city", "rashiId", "gotra", "gotraK", "nakshatraId"];
      const filtered: Record<string, string | number> = {};
      for (const key of allowedFields) {
        if (req.body[key] !== undefined) {
          filtered[key] = req.body[key];
        }
      }

      // Always use the server-verified UID — never trust client-supplied devoteeId
      filtered.devoteeId = verifiedUid;

      const response = await fetch(`${SRINGERI_API_URL}/api/devoteeKarta`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(SRINGERI_API_KEY && { "X-API-Key": SRINGERI_API_KEY }),
        },
        body: JSON.stringify(filtered),
      });

      if (!response.ok) {
        return res.status(response.status).json({ error: "Failed to create karta" });
      }

      const text = await response.text();
      let data;
      try {
        const jsonStart = text.indexOf('{');
        if (jsonStart !== -1) {
          data = JSON.parse(text.substring(jsonStart));
        } else {
          data = JSON.parse(text);
        }
      } catch {
        data = { success: true };
      }

      if (data.status_code === 0) {
        return res.status(422).json({ error: "Karta could not be created. Please try again." });
      }

      return res.json(data);
    } catch (error) {
      console.error("Error creating karta:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/devoteeKarta/:id", async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const token = authHeader.slice(7);
      const verifiedUid = await verifyFirebaseTokenEarly(token);
      if (!verifiedUid) {
        return res.status(401).json({ error: "Invalid or expired token" });
      }

      const { id } = req.params;
      if (!id || isNaN(Number(id))) {
        return res.status(400).json({ error: "Valid Karta ID is required" });
      }

      const allowedFields = ["name", "nameK", "city", "rashiId", "gotra", "gotraK", "nakshatraId", "status"];
      const filtered: Record<string, string | number> = {};
      for (const key of allowedFields) {
        if (req.body[key] !== undefined) {
          filtered[key] = req.body[key];
        }
      }
      // Always stamp the server-verified UID so the upstream can enforce ownership
      filtered.devoteeId = verifiedUid;

      const response = await fetch(`${SRINGERI_API_URL}/api/devoteeKarta/${id}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(SRINGERI_API_KEY && { "X-API-Key": SRINGERI_API_KEY }),
        },
        body: JSON.stringify(filtered),
      });

      if (!response.ok) {
        return res.status(response.status).json({ error: "Failed to update karta" });
      }

      const text = await response.text();
      let data;
      try {
        const jsonStart = text.indexOf('{');
        if (jsonStart !== -1) {
          data = JSON.parse(text.substring(jsonStart));
        } else {
          data = JSON.parse(text);
        }
      } catch {
        data = { success: true };
      }

      if (data.status_code === 0 || data.status === "Nothing Updated") {
        return res.status(422).json({ error: "Karta update was not accepted by the server. Please ensure you are changing at least one field." });
      }

      return res.json(data);
    } catch (error) {
      console.error("Error updating karta:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/onlineDevotee/:uid", async (req, res) => {
    try {
      const { uid } = req.params;
      
      if (!uid) {
        return res.status(400).json({ error: "User ID is required" });
      }

      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const token = authHeader.slice(7);
      const verifiedUid = await verifyFirebaseTokenEarly(token);
      if (!verifiedUid) {
        return res.status(401).json({ error: "Invalid or expired token" });
      }
      if (verifiedUid !== uid) {
        return res.status(403).json({ error: "Forbidden" });
      }

      const response = await fetch(`${SRINGERI_API_URL}/api/onlineDevotee/${uid}`, {
        headers: {
          "Content-Type": "application/json",
          ...(SRINGERI_API_KEY && { "X-API-Key": SRINGERI_API_KEY }),
        },
      });

      if (!response.ok) {
        return res.status(response.status).json({ error: "Failed to fetch devotee data" });
      }

      const text = await response.text();
      
      // Parse JSON, stripping any PHP warnings
      let data;
      try {
        const jsonStart = text.indexOf('{');
        if (jsonStart !== -1) {
          data = JSON.parse(text.substring(jsonStart));
        } else {
          data = JSON.parse(text);
        }
      } catch (parseError) {
        console.error("Error parsing API response:", text);
        return res.status(500).json({ error: "Invalid API response" });
      }

      res.json(data);
    } catch (error) {
      console.error("Error fetching devotee data:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  app.get("/api/article-of-the-day", async (req, res) => {
    try {
      if (!sringeriDb) {
        return res.status(503).json({ error: "Sringeri.net Firestore not configured" });
      }

      const sringeriBaseUrl = "https://www.sringeri.net";
      const colRef = collection(sringeriDb, "temporaryPages");
      const q = query(colRef, where("mainMenu", "==", "About"));
      const snapshot = await getDocs(q);

      const pages: any[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        if (data.link) {
          const desc = data.content ? data.content.replace(/<[^>]*>/g, '').trim().substring(0, 200) : "";
          pages.push({
            id: doc.id,
            title: data.title || "",
            description: desc,
            link: data.link,
            url: `${sringeriBaseUrl}/${data.link}`,
          });
        }
      });

      if (pages.length === 0) {
        return res.json({ article: null });
      }

      const random = req.query.random === "true";
      const excludeId = req.query.exclude as string | undefined;

      let index: number;
      if (random) {
        let pool = excludeId ? pages.filter(p => p.id !== excludeId) : pages;
        if (pool.length === 0) pool = pages;
        index = Math.floor(Math.random() * pool.length);
        return res.json({ article: pool[index] });
      }

      const today = new Date();
      const dayOfYear = Math.floor((today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / 86400000);
      index = dayOfYear % pages.length;
      
      res.json({ article: pages[index] });
    } catch (error) {
      console.error("Error fetching article of the day:", error);
      res.status(500).json({ error: "Failed to fetch article of the day" });
    }
  });

  app.get("/api/stotra-of-the-day", async (req, res) => {
    try {
      if (!sringeriDb) {
        return res.status(503).json({ error: "Sringeri.net Firestore not configured" });
      }

      const colRef = collection(sringeriDb, "deities");
      const snapshot = await getDocs(colRef);

      const allStotras: any[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        const deityTitle = data.title || [];
        const saTitle = deityTitle.find((t: any) => t.lang === "sa")?.value || "";
        const enTitle = deityTitle.find((t: any) => t.lang === "en")?.value || "";
        if (data.stotras && Array.isArray(data.stotras)) {
          data.stotras.forEach((stotra: any) => {
            const stotraTitle = stotra.title || [];
            const saStotra = stotraTitle.find((t: any) => t.lang === "sa")?.value || "";
            const enStotra = stotraTitle.find((t: any) => t.lang === "en")?.value || "";
            const knStotra = stotraTitle.find((t: any) => t.lang === "kn")?.value || "";
            allStotras.push({
              id: stotra.id || doc.id,
              title: saStotra || enStotra || knStotra,
              titleEn: enStotra,
              deityName: saTitle || enTitle,
              deityNameEn: enTitle,
              url: `https://www.sringeri.net/stotras/${data.url}/${stotra.url}`,
              totalShlokas: stotra.totalShlokas || 0,
            });
          });
        }
      });

      if (allStotras.length === 0) {
        return res.json({ stotra: null });
      }

      const random = req.query.random === "true";
      const excludeId = req.query.exclude as string | undefined;

      let index: number;
      if (random) {
        let pool = excludeId ? allStotras.filter(s => s.id !== excludeId) : allStotras;
        if (pool.length === 0) pool = allStotras;
        index = Math.floor(Math.random() * pool.length);
        return res.json({ stotra: pool[index] });
      }

      const today = new Date();
      const dayOfYear = Math.floor((today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / 86400000);
      index = dayOfYear % allStotras.length;
      res.json({ stotra: allStotras[index] });
    } catch (error) {
      console.error("Error fetching stotra of the day:", error);
      res.status(500).json({ error: "Failed to fetch stotra of the day" });
    }
  });

  app.get("/api/jagadguru-anugraha", async (req, res) => {
    try {
      if (!sringeriDb) {
        return res.status(503).json({ error: "Sringeri.net Firestore not configured" });
      }

      const colRef = collection(sringeriDb, "benedictoryCourses");
      const snapshot = await getDocs(colRef);

      const discourses: any[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        if (data.slug) {
          const desc = data.description ? data.description.replace(/<[^>]*>/g, '').trim().substring(0, 200) : "";
          discourses.push({
            id: doc.id,
            title: data.title || "",
            description: desc,
            slug: data.slug,
            place: data.place || "",
            language: data.language?.full || "",
            videoId: data.videoId || null,
            url: `https://www.sringeri.net/anugraha-bhashanam/${data.language?.short || "en"}/${data.slug}`,
          });
        }
      });

      if (discourses.length === 0) {
        return res.json({ discourse: null });
      }

      const random = req.query.random === "true";
      const excludeId = req.query.exclude as string | undefined;

      let index: number;
      if (random) {
        let pool = excludeId ? discourses.filter(d => d.id !== excludeId) : discourses;
        if (pool.length === 0) pool = discourses;
        index = Math.floor(Math.random() * pool.length);
        return res.json({ discourse: pool[index] });
      }

      const today = new Date();
      const dayOfYear = Math.floor((today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / 86400000);
      index = dayOfYear % discourses.length;
      res.json({ discourse: discourses[index] });
    } catch (error) {
      console.error("Error fetching jagadguru anugraha:", error);
      res.status(500).json({ error: "Failed to fetch jagadguru anugraha" });
    }
  });

  app.get("/api/announcements", async (req, res) => {
    try {
      if (!sringeriDb) {
        return res.status(503).json({ error: "Sringeri.net Firestore not configured" });
      }

      const limitNum = Math.min(parseInt(req.query.limit as string) || 10, 20);
      const colRef = collection(sringeriDb, "announcements");
      const snapshot = await getDocs(colRef);

      const announcements: any[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        if (!data.title) return;
        const desc = data.description ? data.description.replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').trim().substring(0, 300) : "";
        const dateVal = data.date?.toDate ? data.date.toDate() : (data.date?.seconds ? new Date(data.date.seconds * 1000) : (data.date ? new Date(data.date) : null));
        if (!dateVal || isNaN(dateVal.getTime())) return;
        announcements.push({
          id: doc.id,
          title: (data.title || "").replace(/&amp;/g, '&'),
          description: desc,
          slug: data.slug || "",
          url: data.slug ? `https://www.sringeri.net/announcement/${data.slug}` : null,
          date: dateVal.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }).toUpperCase(),
          dateTimestamp: dateVal.getTime(),
        });
      });

      announcements.sort((a, b) => b.dateTimestamp - a.dateTimestamp);
      setAnnouncementsCache(announcements);
      res.json({ announcements: announcements.slice(0, limitNum) });
    } catch (error) {
      console.error("Error fetching announcements:", error);
      res.status(500).json({ error: "Failed to fetch announcements" });
    }
  });

  const ytCache: { videos: any[]; timestamp: number } = { videos: [], timestamp: 0 };
  const YT_CACHE_TTL = 10 * 60 * 1000;

  const STATIC_FALLBACK_VIDEOS = [
    { videoId: "TMK0LDSERhc", title: "Ugadi - Jagadguru Shankaracharya's Anugraha Sandesha", published: "2026-03-20" },
    { videoId: "Y6bY5HdEkhc", title: "Yugadi Sandarbhadalli Sringeri Jagadgurugalavara Anugraha Sandesha", published: "2026-03-20" },
    { videoId: "jHCWpLPG7gA", title: "Saraswathi Puja | Vidya Bhooshan International School | Sri Sharada Krupa", published: "2026-03-11" },
    { videoId: "UgwWvDwTWfc", title: "Saraswathi Puja at Shree Sharada Vidyaniketan School | Sri Sharada Krupa", published: "2026-03-10" },
    { videoId: "Bq2hPBo0zrw", title: "Saraswathi Puja at Oxford English School | Sri Sharada Krupa", published: "2026-03-09" },
    { videoId: "1F2Ct6QbkiA", title: "Saraswathi Puja at Marvel Kidzee Public School | Sri Sharada Krupa", published: "2026-03-09" },
    { videoId: "XCbEIctTzTM", title: "Saraswathi Puja at Anjana Vidya Kendra High School | Sri Sharada Krupa", published: "2026-03-08" },
    { videoId: "UXW6uq4Tkp4", title: "Saraswathi Puja at Vedam School Kalyan Nagar | Sri Sharada Krupa", published: "2026-03-08" },
  ].map(v => ({
    ...v,
    date: v.published ? new Date(v.published).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : null,
    thumbnail: `https://i.ytimg.com/vi/${v.videoId}/mqdefault.jpg`,
    url: `https://www.youtube.com/watch?v=${v.videoId}`,
  }));

  const scrapeYtInitialData = async (url: string, label: string, timeoutMs = 10000): Promise<any[]> => {
    const out: any[] = [];
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), timeoutMs);
      let pageRes;
      try {
        pageRes = await fetch(url, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
            "Accept-Language": "en-US,en;q=0.9",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          },
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timeout);
      }
      if (!pageRes.ok) {
        console.log(`[YouTube] ${label} returned HTTP ${pageRes.status}`);
        return out;
      }
      const html = await pageRes.text();
      let dataJson: string | null = null;
      const patterns = [
        /var ytInitialData\s*=\s*(\{[\s\S]*?\});\s*<\/script>/,
        /ytInitialData\s*=\s*(\{[\s\S]*?\});\s*(?:var |let |const |window\.)/,
        /window\["ytInitialData"\]\s*=\s*(\{[\s\S]*?\});/,
      ];
      for (const pattern of patterns) {
        const m = html.match(pattern);
        if (m) { dataJson = m[1]; break; }
      }
      if (!dataJson) {
        const startIdx = html.indexOf('var ytInitialData = ');
        if (startIdx !== -1) {
          const jsonStart = html.indexOf('{', startIdx);
          if (jsonStart !== -1) {
            let depth = 0, i = jsonStart, inStr = false, escape = false;
            for (; i < html.length; i++) {
              const ch = html[i];
              if (escape) { escape = false; continue; }
              if (ch === '\\' && inStr) { escape = true; continue; }
              if (ch === '"') { inStr = !inStr; continue; }
              if (!inStr) {
                if (ch === '{') depth++;
                else if (ch === '}') { depth--; if (depth === 0) { dataJson = html.slice(jsonStart, i + 1); break; } }
              }
            }
          }
        }
      }
      if (!dataJson) {
        console.log(`[YouTube] ${label}: no ytInitialData found in response`);
        return out;
      }
      let data: any;
      try {
        data = JSON.parse(dataJson);
      } catch {
        console.log(`[YouTube] ${label}: failed to parse ytInitialData JSON`);
        return out;
      }
      const found: any[] = [];
      const seen = new Set<string>();
      const findVideos = (obj: any, depth = 0): void => {
        if (!obj || typeof obj !== 'object' || depth > 30) return;
        if (obj.videoId && obj.title && !seen.has(obj.videoId)) {
          seen.add(obj.videoId);
          const title = obj.title?.runs?.[0]?.text || obj.title?.simpleText || "";
          const pub = obj.publishedTimeText?.simpleText || "";
          found.push({ videoId: obj.videoId, title, published: pub });
          return;
        }
        for (const v of Object.values(obj)) findVideos(v, depth + 1);
      };
      findVideos(data);
      for (const v of found.slice(0, 10)) {
        out.push({
          videoId: v.videoId,
          title: v.title,
          published: v.published,
          date: v.published || null,
          thumbnail: `https://i.ytimg.com/vi/${v.videoId}/mqdefault.jpg`,
          url: `https://www.youtube.com/watch?v=${v.videoId}`,
        });
      }
      if (out.length > 0) {
        console.log(`[YouTube] ${label} succeeded: ${out.length} videos found`);
      } else {
        console.log(`[YouTube] ${label} returned data but parsed 0 videos`);
      }
    } catch (err) {
      console.log(`[YouTube] ${label} failed: ${String(err)}`);
    }
    return out;
  };

  const fetchFromPiped = async (channelId: string): Promise<any[]> => {
    const instances = [
      "https://pipedapi.kavin.rocks",
      "https://pipedapi.in",
      "https://piped-api.lunar.icu",
      "https://api.piped.yt",
    ];
    for (const base of instances) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000);
        let res;
        try {
          res = await fetch(`${base}/channel/${channelId}`, {
            headers: { "Accept": "application/json" },
            signal: controller.signal,
          });
        } finally {
          clearTimeout(timeout);
        }
        if (!res.ok) {
          console.log(`[YouTube] Piped ${base} returned HTTP ${res.status}`);
          continue;
        }
        const json = await res.json();
        const items: any[] = json.relatedStreams || json.latestVideos || [];
        if (items.length === 0) {
          console.log(`[YouTube] Piped ${base} returned 0 videos`);
          continue;
        }
        const out = items.slice(0, 10).map((v: any) => {
          const videoId = (v.url || "").replace("/watch?v=", "");
          const uploadedMs = v.uploaded ? (v.uploaded > 1e12 ? v.uploaded : v.uploaded * 1000) : 0;
          return {
            videoId,
            title: v.title || "",
            published: uploadedMs ? new Date(uploadedMs).toISOString() : "",
            date: uploadedMs ? new Date(uploadedMs).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : null,
            thumbnail: v.thumbnail || `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`,
            url: `https://www.youtube.com/watch?v=${videoId}`,
          };
        }).filter((v: any) => v.videoId);
        if (out.length === 0) {
          console.log(`[YouTube] Piped ${base} returned data but parsed 0 valid videos`);
          continue;
        }
        console.log(`[YouTube] Piped ${base} succeeded: ${out.length} videos found`);
        return out;
      } catch (err) {
        console.log(`[YouTube] Piped ${base} failed: ${String(err)}`);
      }
    }
    return [];
  };

  const fetchFromRss2Json = async (channelId: string): Promise<any[]> => {
    const feedUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
    const proxies = [
      `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(feedUrl)}&count=10`,
      `https://rss.app/feeds/v1.1/${encodeURIComponent(feedUrl)}.json`,
    ];
    for (const url of proxies) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000);
        let res;
        try {
          res = await fetch(url, { headers: { Accept: "application/json" }, signal: controller.signal });
        } finally {
          clearTimeout(timeout);
        }
        if (!res.ok) { console.log(`[YouTube] RSS2JSON proxy ${url.split("?")[0]} returned HTTP ${res.status}`); continue; }
        const json = await res.json();
        const items: any[] = json.items || json.entries || [];
        if (!items.length) { console.log(`[YouTube] RSS2JSON proxy returned 0 items`); continue; }
        const out = items.slice(0, 10).map((item: any) => {
          const link = item.link || item.url || item.guid || "";
          const videoId = link.match(/[?&]v=([^&]+)/)?.[1] || String(item.guid || "").split(":").pop() || "";
          if (!videoId) return null;
          const pubRaw = item.pubDate || item.published || item.date_published || "";
          return {
            videoId,
            title: item.title || "",
            published: pubRaw,
            date: pubRaw ? new Date(pubRaw).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : null,
            thumbnail: item.thumbnail || item.enclosure?.link || `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`,
            url: `https://www.youtube.com/watch?v=${videoId}`,
          };
        }).filter(Boolean) as any[];
        if (out.length > 0) {
          console.log(`[YouTube] RSS2JSON proxy succeeded: ${out.length} videos found`);
          return out;
        }
        console.log(`[YouTube] RSS2JSON proxy returned data but parsed 0 valid videos`);
      } catch (err) {
        console.log(`[YouTube] RSS2JSON proxy failed: ${String(err)}`);
      }
    }
    return [];
  };

  const fetchFromInvidious = async (channelId: string): Promise<any[]> => {
    const instances = [
      "https://inv.nadeko.net",
      "https://invidious.privacyredirect.com",
      "https://invidious.nerdvpn.de",
      "https://yt.cdaut.de",
      "https://invidious.darkness.services",
      "https://invidious.incogniweb.net",
      "https://inv.tux.pizza",
    ];
    for (const base of instances) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000);
        let res;
        try {
          res = await fetch(`${base}/api/v1/channels/${channelId}/videos?page=1`, {
            headers: { "Accept": "application/json" },
            signal: controller.signal,
          });
        } finally {
          clearTimeout(timeout);
        }
        if (!res.ok) {
          console.log(`[YouTube] Invidious ${base} returned HTTP ${res.status}`);
          continue;
        }
        const json = await res.json();
        const items: any[] = json.videos || json.latestVideos || [];
        if (items.length === 0) {
          console.log(`[YouTube] Invidious ${base} returned 0 videos`);
          continue;
        }
        const out = items.slice(0, 10).map((v: any) => ({
          videoId: v.videoId,
          title: v.title || "",
          published: v.published ? new Date(v.published * 1000).toISOString() : "",
          date: v.published ? new Date(v.published * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : null,
          thumbnail: v.videoThumbnails?.[0]?.url || `https://i.ytimg.com/vi/${v.videoId}/mqdefault.jpg`,
          url: `https://www.youtube.com/watch?v=${v.videoId}`,
        }));
        console.log(`[YouTube] Invidious ${base} succeeded: ${out.length} videos found`);
        return out;
      } catch (err) {
        console.log(`[YouTube] Invidious ${base} failed: ${String(err)}`);
      }
    }
    return [];
  };

  app.get("/api/youtube-videos", async (req, res) => {
    try {
      if (ytCache.videos.length > 0 && Date.now() - ytCache.timestamp < YT_CACHE_TTL) {
        return res.json({ videos: ytCache.videos });
      }

      const channelId = "UCC7AKcYvtFdlubqwW6Ave2Q";
      const uploadsPlaylistId = "UU" + channelId.slice(2);
      let videos: any[] = [];

      videos = await scrapeYtInitialData(
        `https://www.youtube.com/@SharadaPeetham/videos`,
        "Channel page scrape",
      );

      if (videos.length === 0) {
        const feedUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
        try {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 8000);
          let response;
          try {
            response = await fetch(feedUrl, { signal: controller.signal });
          } finally {
            clearTimeout(timeout);
          }
          if (response.ok) {
            const xml = await response.text();
            const entryRegex = /<entry>([\s\S]*?)<\/entry>/g;
            let match;
            while ((match = entryRegex.exec(xml)) !== null && videos.length < 10) {
              const entry = match[1];
              const videoId = entry.match(/<yt:videoId>(.*?)<\/yt:videoId>/)?.[1] || "";
              const title = entry.match(/<title>(.*?)<\/title>/)?.[1] || "";
              const published = entry.match(/<published>(.*?)<\/published>/)?.[1] || "";
              const thumbnail = `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`;
              if (videoId) {
                videos.push({
                  videoId,
                  title: title.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#39;/g, "'").replace(/&quot;/g, '"'),
                  published,
                  date: published ? new Date(published).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : null,
                  thumbnail,
                  url: `https://www.youtube.com/watch?v=${videoId}`,
                });
              }
            }
            if (videos.length > 0) {
              console.log(`[YouTube] RSS feed succeeded: ${videos.length} videos found`);
            }
          } else {
            console.log(`[YouTube] RSS feed returned ${response.status}`);
          }
        } catch (rssErr) {
          console.log(`[YouTube] RSS feed also failed: ${String(rssErr)}`);
        }
      }

      if (videos.length === 0) {
        videos = await fetchFromRss2Json(channelId);
      }

      if (videos.length === 0) {
        videos = await scrapeYtInitialData(
          `https://www.youtube.com/channel/${channelId}/videos`,
          "Channel ID page scrape",
        );
      }

      if (videos.length === 0) {
        videos = await scrapeYtInitialData(
          `https://www.youtube.com/playlist?list=${uploadsPlaylistId}`,
          "Uploads playlist scrape",
        );
      }

      if (videos.length === 0) {
        videos = await fetchFromPiped(channelId);
      }

      if (videos.length === 0) {
        videos = await fetchFromInvidious(channelId);
      }

      if (videos.length > 0) {
        ytCache.videos = videos;
        ytCache.timestamp = Date.now();
      } else if (ytCache.videos.length > 0) {
        console.log("[YouTube] Using cached videos");
        return res.json({ videos: ytCache.videos });
      } else {
        console.log("[YouTube] All methods failed, using static fallback videos");
        videos = STATIC_FALLBACK_VIDEOS;
      }

      res.json({ videos });
    } catch (error) {
      console.error("[YouTube] Error fetching videos:", error);
      if (ytCache.videos.length > 0) {
        return res.json({ videos: ytCache.videos });
      }
      res.json({ videos: STATIC_FALLBACK_VIDEOS });
    }
  });

  app.get("/api/vijayayatra", async (req, res) => {
    try {
      if (!sringeriDb) {
        return res.status(503).json({ error: "Sringeri.net Firestore not configured" });
      }

      const fetchLimit = Math.min(parseInt(req.query.limit as string) || 10, 50);
      const sringeriBaseUrl = "https://www.sringeri.net";

      const colRef = collection(sringeriDb, "vijayayatra");
      const q = query(colRef, orderBy("date", "desc"), limit(100));
      const snapshot = await getDocs(q);

      const allItems: any[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        if (data.status && data.status !== "published") return;
        const dateSeconds = data.date?.seconds;
        const dateStr = dateSeconds
          ? new Date(dateSeconds * 1000).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })
          : null;

        const rawImage = data.featuredImage || null;
        const imageUrl = rawImage
          ? (rawImage.startsWith('http') ? rawImage : `https://files.sringeri.net/${rawImage}`)
          : null;

        const itemUrl = data.slug ? `${sringeriBaseUrl}/vijaya-yatra/${data.slug}` : (data.url || null);

        allItems.push({
          id: doc.id,
          title: data.title || "",
          description: data.description ? data.description.replace(/<[^>]*>/g, '').substring(0, 200) : "",
          date: dateStr,
          dateTimestamp: dateSeconds || 0,
          featuredImage: imageUrl,
          location: data.location || "",
          status: data.status || "",
          url: itemUrl,
          slug: data.slug || "",
          isOnline: data.isOnline || false,
        });
      });

      const offset = parseInt(req.query.offset as string) || 0;
      const paginated = allItems.slice(offset, offset + fetchLimit);
      const hasMore = offset + fetchLimit < allItems.length;

      res.json({ items: paginated, hasMore, total: allItems.length });
    } catch (error) {
      console.error("Error fetching vijayayatra:", error);
      res.status(500).json({ error: "Failed to fetch vijayayatra" });
    }
  });

  app.get("/api/sringeri-events", async (req, res) => {
    try {
      if (!sringeriDb) {
        return res.status(503).json({ error: "Sringeri.net Firestore not configured" });
      }

      const fetchLimit = Math.min(parseInt(req.query.limit as string) || 10, 50);
      const sringeriBaseUrl = "https://www.sringeri.net";

      const colRef = collection(sringeriDb, "events");
      const q = query(colRef, orderBy("date", "desc"), limit(100));
      const snapshot = await getDocs(q);

      const allEvents: any[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        if (data.status && data.status !== "published") return;
        const dateSeconds = data.date?.seconds;
        const dateStr = dateSeconds 
          ? new Date(dateSeconds * 1000).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })
          : null;

        const rawImage = data.featuredImage || null;
        const imageUrl = rawImage
          ? (rawImage.startsWith('http') ? rawImage : `https://files.sringeri.net/${rawImage}`)
          : null;

        const eventUrl = data.slug ? `${sringeriBaseUrl}/events/${data.slug}` : null;

        allEvents.push({
          id: doc.id,
          title: data.title || "",
          description: data.description ? data.description.replace(/<[^>]*>/g, '').substring(0, 200) : "",
          date: dateStr,
          dateTimestamp: dateSeconds || 0,
          featuredImage: imageUrl,
          location: data.location || "",
          status: data.status || "",
          url: eventUrl,
          slug: data.slug || "",
          isOnline: data.isOnline || false,
          showLiveStream: data.showLiveStream || false,
        });
      });

      const offset = parseInt(req.query.offset as string) || 0;
      const paginatedEvents = allEvents.slice(offset, offset + fetchLimit);
      const hasMore = offset + fetchLimit < allEvents.length;

      setEventsCache(allEvents);
      res.json({ events: paginatedEvents, hasMore, total: allEvents.length });
    } catch (error) {
      console.error("Error fetching sringeri events:", error);
      res.status(500).json({ error: "Failed to fetch events" });
    }
  });

  app.get("/api/todayDetails/:date", async (req, res) => {
    try {
      const { date } = req.params;
      const response = await fetch(`${SRINGERI_API_URL}/api/todayDetails/${date}`, {
        headers: {
          "Content-Type": "application/json",
          ...(SRINGERI_API_KEY && { "X-API-Key": SRINGERI_API_KEY }),
        },
      });

      if (!response.ok) {
        return res.status(response.status).json({ error: "Failed to fetch today details" });
      }

      const text = await response.text();
      
      let data;
      try {
        const jsonStart = text.indexOf('{');
        if (jsonStart !== -1) {
          data = JSON.parse(text.substring(jsonStart));
        } else {
          data = JSON.parse(text);
        }
      } catch (parseError) {
        console.error("Error parsing API response:", text);
        return res.status(500).json({ error: "Invalid API response" });
      }

      res.json(data);
    } catch (error) {
      console.error("Error fetching today details:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Accommodation API routes
  app.get("/api/onlineInventory", async (req, res) => {
    try {
      const response = await fetch(`${SRINGERI_API_URL}/api/onlineInventory`, {
        headers: {
          "Content-Type": "application/json",
          ...(SRINGERI_API_KEY && { "X-API-Key": SRINGERI_API_KEY }),
        },
      });

      if (!response.ok) {
        return res.status(response.status).json({ error: "Failed to fetch inventory" });
      }

      const text = await response.text();
      let data;
      try {
        const jsonStart = text.indexOf('[');
        const jsonStartObj = text.indexOf('{');
        const start = jsonStart !== -1 && (jsonStartObj === -1 || jsonStart < jsonStartObj) ? jsonStart : jsonStartObj;
        if (start !== -1) {
          data = JSON.parse(text.substring(start));
        } else {
          data = JSON.parse(text);
        }
      } catch (parseError) {
        console.error("Error parsing inventory response:", text.substring(0, 200));
        return res.status(500).json({ error: "Invalid API response" });
      }

      res.json(data);
    } catch (error) {
      console.error("Error fetching inventory:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/govtIdTypes", async (req, res) => {
    try {
      const cached = _c.govtIdTypes.get("v");
      if (cached !== null) return res.json(cached);
      const response = await fetch(`${SRINGERI_API_URL}/api/govtIdTypes`, {
        headers: {
          "Content-Type": "application/json",
          ...(SRINGERI_API_KEY && { "X-API-Key": SRINGERI_API_KEY }),
        },
      });

      if (!response.ok) {
        return res.status(response.status).json({ error: "Failed to fetch ID types" });
      }

      const text = await response.text();
      let data;
      try {
        const jsonStart = text.indexOf('[');
        const jsonStartObj = text.indexOf('{');
        const start = jsonStart !== -1 && (jsonStartObj === -1 || jsonStart < jsonStartObj) ? jsonStart : jsonStartObj;
        if (start !== -1) {
          data = JSON.parse(text.substring(start));
        } else {
          data = JSON.parse(text);
        }
      } catch (parseError) {
        return res.status(500).json({ error: "Invalid API response" });
      }

      _c.govtIdTypes.set("v", data);
      res.json(data);
    } catch (error) {
      console.error("Error fetching govt ID types:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/checkReservationAadhaar/:aadhaar/:date", async (req, res) => {
    try {
      const { aadhaar, date } = req.params;
      const response = await fetch(`${SRINGERI_API_URL}/api/checkReservationAadhaar/${aadhaar}/${date}`, {
        headers: {
          "Content-Type": "application/json",
          ...(SRINGERI_API_KEY && { "X-API-Key": SRINGERI_API_KEY }),
        },
      });

      if (!response.ok) {
        return res.status(response.status).json({ error: "Failed to check Aadhaar" });
      }

      const text = await response.text();
      let data;
      try {
        const jsonStart = text.indexOf('{');
        if (jsonStart !== -1) {
          data = JSON.parse(text.substring(jsonStart));
        } else {
          data = JSON.parse(text);
        }
      } catch (parseError) {
        return res.status(500).json({ error: "Invalid API response" });
      }

      res.json(data);
    } catch (error) {
      console.error("Error checking Aadhaar:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/onlineReservationPtm", async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ error: "Authentication required" });
      }
      const verifiedUid = await verifyFirebaseTokenEarly(authHeader.slice(7));
      if (!verifiedUid) {
        return res.status(401).json({ error: "Invalid or expired session" });
      }

      const PAYTM_MID_VAL = process.env.PAYTM_MID;
      const PAYTM_KEY_VAL = process.env.PAYTM_MERCHANT_KEY;

      if (!PAYTM_MID_VAL || !PAYTM_KEY_VAL) {
        return res.status(500).json({ error: "Paytm credentials not configured" });
      }

      const { reservedDate, mobileNumber, email, occupantName1, occupantAge1,
              occupantIdType1, occupantIdNumber1, occupantName2, occupantAge2,
              occupantIdType2, occupantIdNumber2, roomCount,
              inventoryId, rent: clientRent, deposit: clientDeposit, filter } = req.body;

      if (!inventoryId) {
        return res.status(400).json({ error: "inventoryId is required" });
      }

      const rent = Number(clientRent ?? 0);
      const deposit = Number(clientDeposit ?? 0);

      const totalAmount = rent + deposit;
      if (!totalAmount || totalAmount <= 0) {
        return res.status(400).json({ error: "Valid amount is required" });
      }

      const now = new Date();
      const ts = now.getFullYear().toString() +
        String(now.getMonth() + 1).padStart(2, "0") +
        String(now.getDate()).padStart(2, "0") +
        String(now.getHours()).padStart(2, "0") +
        String(now.getMinutes()).padStart(2, "0") +
        String(now.getSeconds()).padStart(2, "0");
      const rand = String(Math.floor(Math.random() * 1000)).padStart(3, "0");
      const orderId = `YATRI_${ts}_${rand}`;
      const reservationPayload = {
        reservedDate: reservedDate || "",
        mobileNumber: mobileNumber || "",
        email: email || "",
        occupantName1: occupantName1 || "",
        occupantAge1: occupantAge1 || "",
        occupantIdType1: occupantIdType1 || 1,
        occupantIdNumber1: occupantIdNumber1 || "",
        occupantName2: occupantName2 || "",
        occupantAge2: occupantAge2 || "",
        occupantIdType2: occupantIdType2 || 1,
        occupantIdNumber2: occupantIdNumber2 || "",
        roomCount: roomCount || 1,
        rent: rent,
        deposit: deposit,
        inventoryId: inventoryId,
        uid: verifiedUid,
        filter: filter || {},
        orderId: orderId,
      };

      console.log("Sending reservation to Sringeri:", JSON.stringify({
        orderId, inventoryId, reservedDate, rent, deposit, totalAmount,
        roomCount: reservationPayload.roomCount, uid: reservationPayload.uid,
      }));

      const sringeriRes = await fetch(`${SRINGERI_API_URL}/api/onlineReservationPtm`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(SRINGERI_API_KEY && { "X-API-Key": SRINGERI_API_KEY }),
        },
        body: JSON.stringify(reservationPayload),
      });

      const sringeriResText = await sringeriRes.text().catch(() => "");
      console.log("Sringeri onlineReservationPtm response:", sringeriRes.status, sringeriResText);

      if (!sringeriRes.ok) {
        console.error("Sringeri onlineReservationPtm failed:", sringeriRes.status, sringeriResText);
        return res.status(502).json({ error: "Reservation registration failed", details: "Could not register reservation with the server. Please try again." });
      }

      if (!sringeriResText.trim()) {
        console.error("Sringeri onlineReservationPtm returned empty body");
        return res.status(502).json({ error: "Reservation registration failed", details: "Server returned an empty response. Please try again." });
      }

      let sringeriData: any = null;
      try {
        const jsonStart = sringeriResText.indexOf("{");
        if (jsonStart !== -1) {
          sringeriData = JSON.parse(sringeriResText.substring(jsonStart));
        } else {
          sringeriData = JSON.parse(sringeriResText);
        }
      } catch (parseError) {
        console.error("Sringeri onlineReservationPtm response not valid JSON:", sringeriResText);
        return res.status(502).json({ error: "Reservation registration failed", details: "Invalid response from server. Please try again." });
      }

      const sringeriStatus = String(sringeriData?.status || "").toLowerCase();
      const reservationId = Number(sringeriData?.reservationId ?? sringeriData?.id ?? 1);
      const isNoRooms = sringeriResText.toLowerCase().includes("no more rooms") || reservationId <= 0;

      if (isNoRooms) {
        console.error("Sringeri onlineReservationPtm: no rooms available:", sringeriResText);
        return res.status(409).json({ error: "No rooms available", details: "Rooms got full by the time the request was submitted. Please go back and select a different date or room type." });
      }

      if (sringeriData && (sringeriData.error || sringeriStatus === "failed" || sringeriStatus === "error")) {
        console.error("Sringeri onlineReservationPtm returned error in body:", JSON.stringify(sringeriData));
        return res.status(502).json({ error: "Reservation registration failed", details: sringeriData.message || sringeriData.error || "Server rejected the reservation." });
      }

      const paytmParams: Record<string, any> = {
        body: {
          requestType: "Payment",
          mid: PAYTM_MID_VAL,
          websiteName: "DEFAULT",
          orderId: orderId,
          txnAmount: {
            value: String(Number(totalAmount).toFixed(2)),
            currency: "INR",
          },
          userInfo: {
            custId: verifiedUid,
          },
          callbackUrl: `${req.protocol}://${req.get("host")}/api/paytm-callback`,
        },
      };

      const checksum = await PaytmChecksum.generateSignature(
        JSON.stringify(paytmParams.body),
        PAYTM_KEY_VAL
      );
      paytmParams.head = { signature: checksum };

      const paytmRes = await fetch(
        `https://securegw.paytm.in/theia/api/v1/initiateTransaction?mid=${PAYTM_MID_VAL}&orderId=${orderId}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(paytmParams),
        }
      );

      const paytmData = await paytmRes.json();

      if (!(paytmData.body?.resultInfo?.resultStatus === "S" && paytmData.body?.txnToken)) {
        console.error("Paytm initiate failed for reservation:", JSON.stringify(paytmData));
        return res.status(500).json({
          error: "Failed to initiate payment",
          details: paytmData.body?.resultInfo?.resultMsg || "Unknown error",
        });
      }

      const txnToken = paytmData.body.txnToken;

      res.json({
        txnToken: txnToken,
        orderId: orderId,
        mid: PAYTM_MID_VAL,
        amount: String(Number(totalAmount).toFixed(2)),
      });
    } catch (error) {
      console.error("Error submitting reservation:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Donation API routes
  app.get("/api/donationHeading", async (req, res) => {
    try {
      const response = await fetch(`${SRINGERI_API_URL}/api/donationHeading`, {
        headers: {
          "Content-Type": "application/json",
          ...(SRINGERI_API_KEY && { "X-API-Key": SRINGERI_API_KEY }),
        },
      });

      if (!response.ok) {
        return res.status(response.status).json({ error: "Failed to fetch donation headings" });
      }

      const text = await response.text();
      let data;
      try {
        const jsonStart = text.indexOf('[');
        const jsonStartObj = text.indexOf('{');
        const start = jsonStart !== -1 && (jsonStartObj === -1 || jsonStart < jsonStartObj) ? jsonStart : jsonStartObj;
        if (start !== -1) {
          data = JSON.parse(text.substring(start));
        } else {
          data = JSON.parse(text);
        }
      } catch (parseError) {
        return res.status(500).json({ error: "Invalid API response" });
      }

      res.json(data);
    } catch (error) {
      console.error("Error fetching donation headings:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/donationCategory", async (req, res) => {
    try {
      const response = await fetch(`${SRINGERI_API_URL}/api/donationCategory`, {
        headers: {
          "Content-Type": "application/json",
          ...(SRINGERI_API_KEY && { "X-API-Key": SRINGERI_API_KEY }),
        },
      });

      if (!response.ok) {
        return res.status(response.status).json({ error: "Failed to fetch donation categories" });
      }

      const text = await response.text();
      let data;
      try {
        const jsonStart = text.indexOf('[');
        const jsonStartObj = text.indexOf('{');
        const start = jsonStart !== -1 && (jsonStartObj === -1 || jsonStart < jsonStartObj) ? jsonStart : jsonStartObj;
        if (start !== -1) {
          data = JSON.parse(text.substring(start));
        } else {
          data = JSON.parse(text);
        }
      } catch (parseError) {
        return res.status(500).json({ error: "Invalid API response" });
      }

      res.json(data);
    } catch (error) {
      console.error("Error fetching donation categories:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/featuredDonations", async (req, res) => {
    try {
      const catResponse = await fetch(`${SRINGERI_API_URL}/api/donationCategory`, {
        headers: {
          "Content-Type": "application/json",
          ...(SRINGERI_API_KEY && { "X-API-Key": SRINGERI_API_KEY }),
        },
      });
      if (!catResponse.ok) {
        return res.status(catResponse.status).json({ error: "Failed to fetch categories" });
      }
      const catText = await catResponse.text();
      let categories;
      try {
        const catStart = catText.indexOf('[');
        categories = catStart !== -1 ? JSON.parse(catText.substring(catStart)) : JSON.parse(catText);
      } catch { return res.json([]); }
      if (!Array.isArray(categories)) return res.json([]);

      const headingResponse = await fetch(`${SRINGERI_API_URL}/api/donationHeading`, {
        headers: {
          "Content-Type": "application/json",
          ...(SRINGERI_API_KEY && { "X-API-Key": SRINGERI_API_KEY }),
        },
      });
      let headings: any[] = [];
      if (headingResponse.ok) {
        try {
          const hText = await headingResponse.text();
          const hStart = hText.indexOf('[');
          headings = hStart !== -1 ? JSON.parse(hText.substring(hStart)) : JSON.parse(hText);
          if (!Array.isArray(headings)) headings = [];
        } catch { headings = []; }
      }

      const subCatResponse = await fetch(`${SRINGERI_API_URL}/api/donationSubCategories`, {
        headers: {
          "Content-Type": "application/json",
          ...(SRINGERI_API_KEY && { "X-API-Key": SRINGERI_API_KEY }),
        },
      });
      if (!subCatResponse.ok) {
        return res.status(subCatResponse.status).json({ error: "Failed to fetch subcategories" });
      }
      const subCatText = await subCatResponse.text();
      let allSubcategories: any[];
      try {
        const subStart = subCatText.indexOf('[');
        const subStartObj = subCatText.indexOf('{');
        const start = subStart !== -1 && (subStartObj === -1 || subStart < subStartObj) ? subStart : subStartObj;
        allSubcategories = start !== -1 ? JSON.parse(subCatText.substring(start)) : JSON.parse(subCatText);
      } catch { return res.json([]); }
      if (!Array.isArray(allSubcategories)) return res.json([]);

      const featured: any[] = [];
      for (const sub of allSubcategories) {
        if (sub.isFeatured === 1 || sub.isFeatured === "1") {
          const cat = categories.find((c: any) => String(c.id) === String(sub.donationCategoryId));
          if (!cat) continue;
          const heading = headings.find((h: any) => String(h.id) === String(cat.donationHeadingId));
          featured.push({
            subcategory: sub,
            category: { id: cat.id, name: cat.name, donationHeadingId: cat.donationHeadingId },
            heading: heading || null,
          });
        }
      }

      res.json(featured);
    } catch (error) {
      console.error("Error fetching featured donations:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/donationSubCategory/:categoryId", async (req, res) => {
    try {
      const { categoryId } = req.params;
      const response = await fetch(`${SRINGERI_API_URL}/api/donationSubCategories`, {
        headers: {
          "Content-Type": "application/json",
          ...(SRINGERI_API_KEY && { "X-API-Key": SRINGERI_API_KEY }),
        },
      });

      if (!response.ok) {
        return res.status(response.status).json({ error: "Failed to fetch donation subcategories" });
      }

      const text = await response.text();
      let allSubs;
      try {
        const jsonStart = text.indexOf('[');
        const jsonStartObj = text.indexOf('{');
        const start = jsonStart !== -1 && (jsonStartObj === -1 || jsonStart < jsonStartObj) ? jsonStart : jsonStartObj;
        if (start !== -1) {
          allSubs = JSON.parse(text.substring(start));
        } else {
          allSubs = JSON.parse(text);
        }
      } catch (parseError) {
        return res.status(500).json({ error: "Invalid API response" });
      }

      const filtered = Array.isArray(allSubs)
        ? allSubs.filter((sub: any) => String(sub.donationCategoryId) === String(categoryId))
        : [];
      res.json(filtered);
    } catch (error) {
      console.error("Error fetching donation subcategories:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/donationPreset/:preset", async (req, res) => {
    try {
      const { preset } = req.params;
      if (!preset) return res.status(400).json({ error: "preset required" });

      const subRes = await fetch(`${SRINGERI_API_URL}/api/donationSubCategories`, {
        headers: { "Content-Type": "application/json", ...(SRINGERI_API_KEY && { "X-API-Key": SRINGERI_API_KEY }) },
      });
      if (!subRes.ok) return res.status(subRes.status).json({ error: "Failed to fetch subcategories" });
      let allSubs: any[] = [];
      try {
        const t = await subRes.text();
        const s = t.indexOf('[');
        allSubs = s !== -1 ? JSON.parse(t.substring(s)) : JSON.parse(t);
      } catch { return res.status(500).json({ error: "Invalid API response" }); }

      const sub = allSubs.find((s: any) => s.preset === preset);
      if (!sub) return res.status(404).json({ error: "Preset not found" });

      let categories: any[] = [];
      const catRes = await fetch(`${SRINGERI_API_URL}/api/donationCategory`, {
        headers: { "Content-Type": "application/json", ...(SRINGERI_API_KEY && { "X-API-Key": SRINGERI_API_KEY }) },
      });
      if (catRes.ok) {
        try {
          const t = await catRes.text();
          const s = t.indexOf('[');
          categories = s !== -1 ? JSON.parse(t.substring(s)) : JSON.parse(t);
        } catch {}
      }

      const cat = categories.find((c: any) => String(c.id) === String(sub.donationCategoryId));
      if (!cat) return res.status(404).json({ error: "Category not found for preset" });

      let headings: any[] = [];
      const hRes = await fetch(`${SRINGERI_API_URL}/api/donationHeading`, {
        headers: { "Content-Type": "application/json", ...(SRINGERI_API_KEY && { "X-API-Key": SRINGERI_API_KEY }) },
      });
      if (hRes.ok) {
        try {
          const t = await hRes.text();
          const s = t.indexOf('[');
          headings = s !== -1 ? JSON.parse(t.substring(s)) : JSON.parse(t);
        } catch {}
      }

      const heading = headings.find((h: any) => String(h.id) === String(cat.donationHeadingId)) || null;
      res.json({
        subcategory: sub,
        category: { id: cat.id, name: cat.name, donationHeadingId: cat.donationHeadingId },
        heading: heading || null,
      });
    } catch (error) {
      console.error("Error fetching donation preset:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/postageOptionsDonation", async (req, res) => {
    try {
      const response = await fetch(`${SRINGERI_API_URL}/api/postageOptionsDonation`, {
        headers: {
          "Content-Type": "application/json",
          ...(SRINGERI_API_KEY && { "X-API-Key": SRINGERI_API_KEY }),
        },
      });

      if (!response.ok) {
        return res.status(response.status).json({ error: "Failed to fetch postage options" });
      }

      const text = await response.text();
      let data;
      try {
        const jsonStart = text.indexOf('[');
        const jsonStartObj = text.indexOf('{');
        const start = jsonStart !== -1 && (jsonStartObj === -1 || jsonStart < jsonStartObj) ? jsonStart : jsonStartObj;
        if (start !== -1) {
          data = JSON.parse(text.substring(start));
        } else {
          data = JSON.parse(text);
        }
      } catch (parseError) {
        return res.status(500).json({ error: "Invalid API response" });
      }

      res.json(data);
    } catch (error) {
      console.error("Error fetching postage options:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/calendarTypes", async (req, res) => {
    try {
      const cached = _c.calendarTypes.get("v");
      if (cached !== null) return res.json(cached);
      const response = await fetch(`${SRINGERI_API_URL}/api/calendarTypes`, {
        headers: {
          "Content-Type": "application/json",
          ...(SRINGERI_API_KEY && { "X-API-Key": SRINGERI_API_KEY }),
        },
      });

      if (!response.ok) {
        return res.status(response.status).json({ error: "Failed to fetch calendar types" });
      }

      const text = await response.text();
      let data;
      try {
        const jsonStart = text.indexOf('[');
        const jsonStartObj = text.indexOf('{');
        const start = jsonStart !== -1 && (jsonStartObj === -1 || jsonStart < jsonStartObj) ? jsonStart : jsonStartObj;
        if (start !== -1) {
          data = JSON.parse(text.substring(start));
        } else {
          data = JSON.parse(text);
        }
      } catch (parseError) {
        return res.status(500).json({ error: "Invalid API response" });
      }

      _c.calendarTypes.set("v", data);
      res.json(data);
    } catch (error) {
      console.error("Error fetching calendar types:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/tithis", async (req, res) => {
    try {
      const cached = _c.tithis.get("v");
      if (cached !== null) return res.json(cached);
      const response = await fetch(`${SRINGERI_API_URL}/api/tithis`, {
        headers: {
          "Content-Type": "application/json",
          ...(SRINGERI_API_KEY && { "X-API-Key": SRINGERI_API_KEY }),
        },
      });

      if (!response.ok) {
        return res.status(response.status).json({ error: "Failed to fetch tithis" });
      }

      const text = await response.text();
      let data;
      try {
        const jsonStart = text.indexOf('[');
        const jsonStartObj = text.indexOf('{');
        const start = jsonStart !== -1 && (jsonStartObj === -1 || jsonStart < jsonStartObj) ? jsonStart : jsonStartObj;
        if (start !== -1) {
          data = JSON.parse(text.substring(start));
        } else {
          data = JSON.parse(text);
        }
      } catch (parseError) {
        return res.status(500).json({ error: "Invalid API response" });
      }

      _c.tithis.set("v", data);
      res.json(data);
    } catch (error) {
      console.error("Error fetching tithis:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/chandraMasas", async (req, res) => {
    try {
      const cached = _c.chandraMasas.get("v");
      if (cached !== null) return res.json(cached);
      const response = await fetch(`${SRINGERI_API_URL}/api/chandraMasas`, {
        headers: {
          "Content-Type": "application/json",
          ...(SRINGERI_API_KEY && { "X-API-Key": SRINGERI_API_KEY }),
        },
      });

      if (!response.ok) {
        return res.status(response.status).json({ error: "Failed to fetch chandra masas" });
      }

      const text = await response.text();
      let data;
      try {
        const jsonStart = text.indexOf('[');
        const jsonStartObj = text.indexOf('{');
        const start = jsonStart !== -1 && (jsonStartObj === -1 || jsonStart < jsonStartObj) ? jsonStart : jsonStartObj;
        if (start !== -1) {
          data = JSON.parse(text.substring(start));
        } else {
          data = JSON.parse(text);
        }
      } catch (parseError) {
        return res.status(500).json({ error: "Invalid API response" });
      }

      _c.chandraMasas.set("v", data);
      res.json(data);
    } catch (error) {
      console.error("Error fetching chandra masas:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/souraMasas", async (req, res) => {
    try {
      const cached = _c.souraMasas.get("v");
      if (cached !== null) return res.json(cached);
      const response = await fetch(`${SRINGERI_API_URL}/api/souraMasas`, {
        headers: {
          "Content-Type": "application/json",
          ...(SRINGERI_API_KEY && { "X-API-Key": SRINGERI_API_KEY }),
        },
      });

      if (!response.ok) {
        return res.status(response.status).json({ error: "Failed to fetch soura masas" });
      }

      const text = await response.text();
      let data;
      try {
        const jsonStart = text.indexOf('[');
        const jsonStartObj = text.indexOf('{');
        const start = jsonStart !== -1 && (jsonStartObj === -1 || jsonStart < jsonStartObj) ? jsonStart : jsonStartObj;
        if (start !== -1) {
          data = JSON.parse(text.substring(start));
        } else {
          data = JSON.parse(text);
        }
      } catch (parseError) {
        return res.status(500).json({ error: "Invalid API response" });
      }

      _c.souraMasas.set("v", data);
      res.json(data);
    } catch (error) {
      console.error("Error fetching soura masas:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/nakshatras", async (req, res) => {
    try {
      const cached = _c.nakshatras.get("v");
      if (cached !== null) return res.json(cached);
      const response = await fetch(`${SRINGERI_API_URL}/api/nakshatras`, {
        headers: {
          "Content-Type": "application/json",
          ...(SRINGERI_API_KEY && { "X-API-Key": SRINGERI_API_KEY }),
        },
      });

      if (!response.ok) {
        return res.status(response.status).json({ error: "Failed to fetch nakshatras" });
      }

      const text = await response.text();
      let data;
      try {
        const jsonStart = text.indexOf('[');
        const jsonStartObj = text.indexOf('{');
        const start = jsonStart !== -1 && (jsonStartObj === -1 || jsonStart < jsonStartObj) ? jsonStart : jsonStartObj;
        if (start !== -1) {
          data = JSON.parse(text.substring(start));
        } else {
          data = JSON.parse(text);
        }
      } catch (parseError) {
        return res.status(500).json({ error: "Invalid API response" });
      }

      _c.nakshatras.set("v", data);
      res.json(data);
    } catch (error) {
      console.error("Error fetching nakshatras:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/devoteeKarta/:uid", async (req, res) => {
    try {
      const { uid } = req.params;

      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const token = authHeader.slice(7);
      const verifiedUid = await verifyFirebaseTokenEarly(token);
      if (!verifiedUid) {
        return res.status(401).json({ error: "Invalid or expired token" });
      }
      if (verifiedUid !== uid) {
        return res.status(403).json({ error: "Forbidden" });
      }

      const response = await fetch(`${SRINGERI_API_URL}/api/devoteeKarta/${uid}`, {
        headers: {
          "Content-Type": "application/json",
          ...(SRINGERI_API_KEY && { "X-API-Key": SRINGERI_API_KEY }),
        },
      });

      if (!response.ok) {
        return res.status(response.status).json({ error: "Failed to fetch devotee karta" });
      }

      const text = await response.text();
      let data;
      try {
        const jsonStart = text.indexOf('[');
        const jsonStartObj = text.indexOf('{');
        const start = jsonStart !== -1 && (jsonStartObj === -1 || jsonStart < jsonStartObj) ? jsonStart : jsonStartObj;
        if (start !== -1) {
          data = JSON.parse(text.substring(start));
        } else {
          data = JSON.parse(text);
        }
      } catch (parseError) {
        return res.status(500).json({ error: "Invalid API response" });
      }

      res.json(data);
    } catch (error) {
      console.error("Error fetching devotee karta:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/devoteeAddress/:uid", async (req, res) => {
    try {
      const { uid } = req.params;

      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const token = authHeader.slice(7);
      const verifiedUid = await verifyFirebaseTokenEarly(token);
      if (!verifiedUid) {
        return res.status(401).json({ error: "Invalid or expired token" });
      }
      if (verifiedUid !== uid) {
        return res.status(403).json({ error: "Forbidden" });
      }

      const response = await fetch(`${SRINGERI_API_URL}/api/devoteeAddress/${uid}`, {
        headers: {
          "Content-Type": "application/json",
          ...(SRINGERI_API_KEY && { "X-API-Key": SRINGERI_API_KEY }),
        },
      });

      if (!response.ok) {
        return res.status(response.status).json({ error: "Failed to fetch devotee address" });
      }

      const text = await response.text();
      let data;
      try {
        const jsonStart = text.indexOf('[');
        const jsonStartObj = text.indexOf('{');
        const start = jsonStart !== -1 && (jsonStartObj === -1 || jsonStart < jsonStartObj) ? jsonStart : jsonStartObj;
        if (start !== -1) {
          data = JSON.parse(text.substring(start));
        } else {
          data = JSON.parse(text);
        }
      } catch (parseError) {
        return res.status(500).json({ error: "Invalid API response" });
      }

      res.json(data);
    } catch (error) {
      console.error("Error fetching devotee address:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/devoteeAddress", async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const token = authHeader.slice(7);
      const verifiedUid = await verifyFirebaseTokenEarly(token);
      if (!verifiedUid) {
        return res.status(401).json({ error: "Invalid or expired token" });
      }

      const allowedFields = ["addresseeName", "addressLine1", "addressLine2", "landmark", "city", "state", "country", "pincode", "status", "alternatePhone"];
      const filtered: Record<string, string | number> = {};
      for (const key of allowedFields) {
        if (req.body[key] !== undefined) {
          filtered[key] = req.body[key];
        }
      }

      // Always use the server-verified UID — never trust client-supplied devoteeId
      filtered.devoteeId = verifiedUid;

      const response = await fetch(`${SRINGERI_API_URL}/api/devoteeAddress`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(SRINGERI_API_KEY && { "X-API-Key": SRINGERI_API_KEY }),
        },
        body: JSON.stringify(filtered),
      });

      if (!response.ok) {
        return res.status(response.status).json({ error: "Failed to create address" });
      }

      const text = await response.text();
      let data;
      try {
        const jsonStart = text.indexOf('{');
        if (jsonStart !== -1) {
          data = JSON.parse(text.substring(jsonStart));
        } else {
          data = JSON.parse(text);
        }
      } catch {
        data = { success: true };
      }

      if (data.status_code === 0) {
        return res.status(422).json({ error: "Address could not be created. Please try again." });
      }

      return res.json(data);
    } catch (error) {
      console.error("Error creating address:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/devoteeAddress/:id", async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const token = authHeader.slice(7);
      const verifiedUid = await verifyFirebaseTokenEarly(token);
      if (!verifiedUid) {
        return res.status(401).json({ error: "Invalid or expired token" });
      }

      const { id } = req.params;
      if (!id || isNaN(Number(id))) {
        return res.status(400).json({ error: "Valid Address ID is required" });
      }

      const allowedFields = ["addresseeName", "addressLine1", "addressLine2", "landmark", "city", "state", "country", "pincode", "status", "alternatePhone"];
      const filtered: Record<string, string | number> = {};
      for (const key of allowedFields) {
        if (req.body[key] !== undefined) {
          filtered[key] = req.body[key];
        }
      }
      // Always stamp the server-verified UID so the upstream can enforce ownership
      filtered.devoteeId = verifiedUid;

      const response = await fetch(`${SRINGERI_API_URL}/api/devoteeAddress/${id}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(SRINGERI_API_KEY && { "X-API-Key": SRINGERI_API_KEY }),
        },
        body: JSON.stringify(filtered),
      });

      if (!response.ok) {
        return res.status(response.status).json({ error: "Failed to update address" });
      }

      const text = await response.text();
      let data;
      try {
        const jsonStart = text.indexOf('{');
        if (jsonStart !== -1) {
          data = JSON.parse(text.substring(jsonStart));
        } else {
          data = JSON.parse(text);
        }
      } catch {
        data = { success: true };
      }

      if (data.status_code === 0 || data.status === "Nothing Updated") {
        return res.status(422).json({ error: "Address update was not accepted by the server. Please ensure you are changing at least one field." });
      }

      return res.json(data);
    } catch (error) {
      console.error("Error updating address:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/onlineDonationRzp", async (req, res) => {
    try {
      const response = await fetch(`${SRINGERI_API_URL}/api/onlineDonationRzp`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(SRINGERI_API_KEY && { "X-API-Key": SRINGERI_API_KEY }),
        },
        body: JSON.stringify(req.body),
      });

      if (!response.ok) {
        return res.status(response.status).json({ error: "Failed to submit donation" });
      }

      const text = await response.text();
      let data;
      try {
        const jsonStart = text.indexOf('[');
        const jsonStartObj = text.indexOf('{');
        const start = jsonStart !== -1 && (jsonStartObj === -1 || jsonStart < jsonStartObj) ? jsonStart : jsonStartObj;
        if (start !== -1) {
          data = JSON.parse(text.substring(start));
        } else {
          data = JSON.parse(text);
        }
      } catch (parseError) {
        return res.status(500).json({ error: "Invalid API response" });
      }

      res.json(data);
    } catch (error) {
      console.error("Error submitting donation:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/makeDonation", async (req, res) => {
    try {
      const { claim80G, totalAmount, mobileNumber, donorName, email,
              postageCharges, postageId, pan, addressLine1, addressLine2,
              city, state, pincode, country, uid, selectedDonations } = req.body;

      const is80G = claim80G === 1 || claim80G === "1" || claim80G === "Yes";
      const PAYTM_MID_VAL = is80G ? process.env.PAYTM_MID_SPCT : process.env.PAYTM_MID;
      const PAYTM_KEY_VAL = is80G ? process.env.PAYTM_MERCHANT_KEY_SPCT : process.env.PAYTM_MERCHANT_KEY;

      if (!PAYTM_MID_VAL || !PAYTM_KEY_VAL) {
        return res.status(500).json({ error: "Paytm credentials not configured" });
      }

      if (!totalAmount || totalAmount <= 0) {
        return res.status(400).json({ error: "Valid amount is required" });
      }

      const now = new Date();
      const ts = now.getFullYear().toString() +
        String(now.getMonth() + 1).padStart(2, "0") +
        String(now.getDate()).padStart(2, "0") +
        String(now.getHours()).padStart(2, "0") +
        String(now.getMinutes()).padStart(2, "0") +
        String(now.getSeconds()).padStart(2, "0");
      const rand = String(Math.floor(Math.random() * 1000)).padStart(3, "0");
      const orderId = `DON_${ts}_${rand}`;

      const paytmParams: Record<string, any> = {
        body: {
          requestType: "Payment",
          mid: PAYTM_MID_VAL,
          websiteName: "DEFAULT",
          orderId: orderId,
          txnAmount: {
            value: String(Number(totalAmount).toFixed(2)),
            currency: "INR",
          },
          userInfo: {
            custId: uid || mobileNumber || "GUEST",
          },
          callbackUrl: `${req.protocol}://${req.get("host")}/api/paytm-callback`,
        },
      };

      const checksum = await PaytmChecksum.generateSignature(
        JSON.stringify(paytmParams.body),
        PAYTM_KEY_VAL
      );
      paytmParams.head = { signature: checksum };

      const paytmRes = await fetch(
        `https://securegw.paytm.in/theia/api/v1/initiateTransaction?mid=${PAYTM_MID_VAL}&orderId=${orderId}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(paytmParams),
        }
      );

      const paytmData = await paytmRes.json();

      if (!(paytmData.body?.resultInfo?.resultStatus === "S" && paytmData.body?.txnToken)) {
        console.error("Paytm initiate failed for donation:", JSON.stringify(paytmData));
        return res.status(500).json({
          error: "Failed to initiate payment",
          details: paytmData.body?.resultInfo?.resultMsg || "Unknown error",
        });
      }

      const txnToken = paytmData.body.txnToken;

      const donationPayload = {
        donorName: donorName || "",
        mobileNumber: mobileNumber || "",
        email: email || "",
        postageCharges: postageCharges || 0,
        totalAmount: totalAmount,
        claim80G: is80G ? 1 : 0,
        postageId: postageId || "",
        pan: pan || "",
        addressLine1: addressLine1 || "",
        addressLine2: addressLine2 || "",
        city: city || "",
        state: state || "",
        pincode: pincode || "",
        country: country || "",
        orderId: orderId,
        uid: uid || "",
        selectedDonations: (selectedDonations || []).map((d: any) => ({
          subCategoryId: d.subCategoryId,
          donationAmount: d.donationAmount,
          donationInTheNameOf: d.donationInTheNameOf || "",
          imagePath: d.imagePath || "",
          donationRemarks: d.donationRemarks || "",
          calendarType: d.calendarType || "",
          monthId: d.monthId || "",
          fromChandraMasaId: d.fromChandraMasaId || "",
          fromSouraMasaId: d.fromSouraMasaId || "",
          specificDate: d.specificDate || "",
          fromTithiId: d.fromTithiId || "",
          fromNakshatraId: d.fromNakshatraId || "",
        })),
      };

      console.log("Sending donation payload to Sringeri:", JSON.stringify(donationPayload));

      const sringeriRes = await fetch(`${SRINGERI_API_URL}/api/makeDonation`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(SRINGERI_API_KEY && { "X-API-Key": SRINGERI_API_KEY }),
        },
        body: JSON.stringify(donationPayload),
      });

      const sringeriResText = await sringeriRes.text().catch(() => "");
      console.log("Sringeri makeDonation response:", sringeriRes.status, sringeriResText);

      if (!sringeriRes.ok) {
        console.error("Sringeri makeDonation failed:", sringeriRes.status, sringeriResText);
        return res.status(502).json({ error: "Donation registration failed", details: "Could not register donation with the server. Please try again." });
      }

      if (!sringeriResText.trim()) {
        console.error("Sringeri makeDonation returned empty body");
        return res.status(502).json({ error: "Donation registration failed", details: "Server returned an empty response. Please try again." });
      }

      let sringeriData: any = null;
      try {
        const jsonStart = sringeriResText.indexOf("{");
        if (jsonStart !== -1) {
          sringeriData = JSON.parse(sringeriResText.substring(jsonStart));
        } else {
          sringeriData = JSON.parse(sringeriResText);
        }
      } catch (parseError) {
        console.error("Sringeri makeDonation response not valid JSON:", sringeriResText);
        return res.status(502).json({ error: "Donation registration failed", details: "Invalid response from server. Please try again." });
      }

      if (sringeriData && (sringeriData.error || sringeriData.status === "Failed" || sringeriData.status === "Error")) {
        console.error("Sringeri makeDonation returned error in body:", JSON.stringify(sringeriData));
        return res.status(502).json({ error: "Donation registration failed", details: sringeriData.message || sringeriData.error || "Server rejected the donation." });
      }

      res.json({
        txnToken: txnToken,
        orderId: orderId,
        mid: PAYTM_MID_VAL,
        amount: String(Number(totalAmount).toFixed(2)),
      });
    } catch (error) {
      console.error("Error submitting donation:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Seva Booking API routes
  app.get("/api/centres", async (req, res) => {
    try {
      const response = await fetch(`${SRINGERI_API_URL}/api/centres`, {
        headers: {
          "Content-Type": "application/json",
          ...(SRINGERI_API_KEY && { "X-API-Key": SRINGERI_API_KEY }),
        },
      });

      if (!response.ok) {
        return res.status(response.status).json({ error: "Failed to fetch centres" });
      }

      const text = await response.text();
      let data;
      try {
        const jsonStart = text.indexOf('[');
        const jsonStartObj = text.indexOf('{');
        const start = jsonStart !== -1 && (jsonStartObj === -1 || jsonStart < jsonStartObj) ? jsonStart : jsonStartObj;
        if (start !== -1) {
          data = JSON.parse(text.substring(start));
        } else {
          data = JSON.parse(text);
        }
      } catch (parseError) {
        return res.status(500).json({ error: "Invalid API response" });
      }

      res.json(data);
    } catch (error) {
      console.error("Error fetching centres:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/centreSevas", async (req, res) => {
    try {
      const endpoint = req.query.endpoint as string;
      if (!endpoint) {
        return res.status(400).json({ error: "Endpoint URL is required" });
      }
      let fullUrl = endpoint;
      if (endpoint.startsWith("/")) {
        fullUrl = `${SRINGERI_API_URL}${endpoint}`;
      }
      try {
        const parsedUrl = new URL(fullUrl);
        const allowedHost = new URL(SRINGERI_API_URL).hostname;
        if (parsedUrl.hostname !== allowedHost) {
          return res.status(403).json({ error: "Endpoint not allowed" });
        }
      } catch {
        return res.status(400).json({ error: "Invalid endpoint URL" });
      }
      const response = await fetch(fullUrl, {
        headers: {
          "Content-Type": "application/json",
          ...(SRINGERI_API_KEY && { "X-API-Key": SRINGERI_API_KEY }),
        },
      });

      if (!response.ok) {
        return res.status(response.status).json({ error: "Failed to fetch centre sevas" });
      }

      const text = await response.text();
      let data;
      try {
        const jsonStart = text.indexOf('[');
        const jsonStartObj = text.indexOf('{');
        const start = jsonStart !== -1 && (jsonStartObj === -1 || jsonStart < jsonStartObj) ? jsonStart : jsonStartObj;
        if (start !== -1) {
          data = JSON.parse(text.substring(start));
        } else {
          data = JSON.parse(text);
        }
      } catch (parseError) {
        return res.status(500).json({ error: "Invalid API response" });
      }

      res.json(data);
    } catch (error) {
      console.error("Error fetching centre sevas:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/online/deities/:sevaTypeId", async (req, res) => {
    try {
      const { sevaTypeId } = req.params;
      const response = await fetch(`${SRINGERI_API_URL}/api/online/deities/${sevaTypeId}`, {
        headers: {
          "Content-Type": "application/json",
          ...(SRINGERI_API_KEY && { "X-API-Key": SRINGERI_API_KEY }),
        },
      });

      if (!response.ok) {
        return res.status(response.status).json({ error: "Failed to fetch deities" });
      }

      const text = await response.text();
      let data;
      try {
        const jsonStart = text.indexOf('[');
        const jsonStartObj = text.indexOf('{');
        const start = jsonStart !== -1 && (jsonStartObj === -1 || jsonStart < jsonStartObj) ? jsonStart : jsonStartObj;
        if (start !== -1) {
          data = JSON.parse(text.substring(start));
        } else {
          data = JSON.parse(text);
        }
      } catch (parseError) {
        return res.status(500).json({ error: "Invalid API response" });
      }

      res.json(data);
    } catch (error) {
      console.error("Error fetching deities:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/online/deitySevas/:sannidhiId/:sevaTypeId", async (req, res) => {
    try {
      const { sannidhiId, sevaTypeId } = req.params;
      const response = await fetch(`${SRINGERI_API_URL}/api/online/deitySevas/${sannidhiId}/${sevaTypeId}`, {
        headers: {
          "Content-Type": "application/json",
          ...(SRINGERI_API_KEY && { "X-API-Key": SRINGERI_API_KEY }),
        },
      });

      if (!response.ok) {
        return res.status(response.status).json({ error: "Failed to fetch deity sevas" });
      }

      const text = await response.text();
      let data;
      try {
        const jsonStart = text.indexOf('[');
        const jsonStartObj = text.indexOf('{');
        const start = jsonStart !== -1 && (jsonStartObj === -1 || jsonStart < jsonStartObj) ? jsonStart : jsonStartObj;
        if (start !== -1) {
          data = JSON.parse(text.substring(start));
        } else {
          data = JSON.parse(text);
        }
      } catch (parseError) {
        return res.status(500).json({ error: "Invalid API response" });
      }

      res.json(data);
    } catch (error) {
      console.error("Error fetching deity sevas:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/online/sevaAvailability/:dsId", async (req, res) => {
    try {
      const { dsId } = req.params;
      const response = await fetch(`${SRINGERI_API_URL}/api/online/sevaAvailability/${dsId}`, {
        headers: {
          "Content-Type": "application/json",
          ...(SRINGERI_API_KEY && { "X-API-Key": SRINGERI_API_KEY }),
        },
      });

      if (!response.ok) {
        return res.status(response.status).json({ error: "Failed to fetch seva availability" });
      }

      const text = await response.text();
      let data;
      try {
        const jsonStart = text.indexOf('[');
        const jsonStartObj = text.indexOf('{');
        const start = jsonStart !== -1 && (jsonStartObj === -1 || jsonStart < jsonStartObj) ? jsonStart : jsonStartObj;
        if (start !== -1) {
          data = JSON.parse(text.substring(start));
        } else {
          data = JSON.parse(text);
        }
      } catch (parseError) {
        return res.status(500).json({ error: "Invalid API response" });
      }

      res.json(data);
    } catch (error) {
      console.error("Error fetching seva availability:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/onlineFrequentSevas", async (req, res) => {
    try {
      const response = await fetch(`${SRINGERI_API_URL}/api/onlineFrequentSevas`, {
        headers: {
          "Content-Type": "application/json",
          ...(SRINGERI_API_KEY && { "X-API-Key": SRINGERI_API_KEY }),
        },
      });

      if (!response.ok) {
        return res.status(response.status).json({ error: "Failed to fetch frequent sevas" });
      }

      const text = await response.text();
      let data;
      try {
        const jsonStart = text.indexOf('[');
        const jsonStartObj = text.indexOf('{');
        const start = jsonStart !== -1 && (jsonStartObj === -1 || jsonStart < jsonStartObj) ? jsonStart : jsonStartObj;
        if (start !== -1) {
          data = JSON.parse(text.substring(start));
        } else {
          data = JSON.parse(text);
        }
      } catch (parseError) {
        return res.status(500).json({ error: "Invalid API response" });
      }

      res.json(data);
    } catch (error) {
      console.error("Error fetching frequent sevas:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/rashis", async (req, res) => {
    try {
      const cached = _c.rashis.get("v");
      if (cached !== null) return res.json(cached);
      const response = await fetch(`${SRINGERI_API_URL}/api/rashis`, {
        headers: {
          "Content-Type": "application/json",
          ...(SRINGERI_API_KEY && { "X-API-Key": SRINGERI_API_KEY }),
        },
      });

      if (!response.ok) {
        return res.status(response.status).json({ error: "Failed to fetch rashis" });
      }

      const text = await response.text();
      let data;
      try {
        const jsonStart = text.indexOf('[');
        const jsonStartObj = text.indexOf('{');
        const start = jsonStart !== -1 && (jsonStartObj === -1 || jsonStart < jsonStartObj) ? jsonStart : jsonStartObj;
        if (start !== -1) {
          data = JSON.parse(text.substring(start));
        } else {
          data = JSON.parse(text);
        }
      } catch (parseError) {
        return res.status(500).json({ error: "Invalid API response" });
      }

      _c.rashis.set("v", data);
      res.json(data);
    } catch (error) {
      console.error("Error fetching rashis:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/transliterate", async (req, res) => {
    const text = (req.query.text as string || "").trim().slice(0, 200);
    if (!text) return res.json({ transliteration: "" });
    const lang = "kn";

    // Serve from cache if available (deterministic: same input → same output)
    const xlitHit = _xlitCache.get(text);
    if (xlitHit !== undefined) return res.json({ transliteration: xlitHit });

    // Primary: unofficial gtx endpoint (free, no key needed)
    try {
      const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=${encodeURIComponent(lang)}&dt=t&q=${encodeURIComponent(text)}`;
      const response = await fetch(url, { signal: AbortSignal.timeout(4000) });
      if (response.ok) {
        const data = await response.json();
        const translated = Array.isArray(data) && Array.isArray(data[0])
          ? data[0].map((s: any) => (Array.isArray(s) ? s[0] : "")).join("")
          : "";
        if (translated) {
          if (_xlitCache.size >= XLIT_MAX) {
            const firstKey = _xlitCache.keys().next().value;
            if (firstKey !== undefined) _xlitCache.delete(firstKey);
          }
          _xlitCache.set(text, translated);
          return res.json({ transliteration: translated });
        }
      }
    } catch {
      // gtx failed or timed out — fall through to official API
    }

    // Fallback: official Google Cloud Translation API
    const apiKey = process.env.GOOGLE_TRANSLATE_API_KEY;
    if (!apiKey) return res.json({ transliteration: "" });
    try {
      const response = await fetch(
        `https://translation.googleapis.com/language/translate/v2?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ q: text, source: "en", target: lang, format: "text" }),
          signal: AbortSignal.timeout(5000),
        }
      );
      if (!response.ok) return res.json({ transliteration: "" });
      const data = await response.json();
      const translated = data?.data?.translations?.[0]?.translatedText || "";
      if (translated) {
        if (_xlitCache.size >= XLIT_MAX) {
          const firstKey = _xlitCache.keys().next().value;
          if (firstKey !== undefined) _xlitCache.delete(firstKey);
        }
        _xlitCache.set(text, translated);
      }
      return res.json({ transliteration: translated });
    } catch (error) {
      console.error("Transliteration fallback error:", error);
      return res.json({ transliteration: "" });
    }
  });

  app.get("/api/postageOptions", async (req, res) => {
    try {
      const cached = _c.postageOptions.get("v");
      if (cached !== null) return res.json(cached);
      const response = await fetch(`${SRINGERI_API_URL}/api/postageOptions`, {
        headers: {
          "Content-Type": "application/json",
          ...(SRINGERI_API_KEY && { "X-API-Key": SRINGERI_API_KEY }),
        },
      });

      if (!response.ok) {
        return res.status(response.status).json({ error: "Failed to fetch postage options" });
      }

      const text = await response.text();
      let data;
      try {
        const jsonStart = text.indexOf('[');
        const jsonStartObj = text.indexOf('{');
        const start = jsonStart !== -1 && (jsonStartObj === -1 || jsonStart < jsonStartObj) ? jsonStart : jsonStartObj;
        if (start !== -1) {
          data = JSON.parse(text.substring(start));
        } else {
          data = JSON.parse(text);
        }
      } catch (parseError) {
        return res.status(500).json({ error: "Invalid API response" });
      }

      _c.postageOptions.set("v", data);
      res.json(data);
    } catch (error) {
      console.error("Error fetching postage options:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/recurrenceTypes", async (req, res) => {
    try {
      const cached = _c.recurrenceTypes.get("v");
      if (cached !== null) return res.json(cached);
      const response = await fetch(`${SRINGERI_API_URL}/api/recurrenceTypes`, {
        headers: {
          "Content-Type": "application/json",
          ...(SRINGERI_API_KEY && { "X-API-Key": SRINGERI_API_KEY }),
        },
      });

      if (!response.ok) {
        return res.status(response.status).json({ error: "Failed to fetch recurrence types" });
      }

      const text = await response.text();
      let data;
      try {
        const jsonStart = text.indexOf('[');
        const jsonStartObj = text.indexOf('{');
        const start = jsonStart !== -1 && (jsonStartObj === -1 || jsonStart < jsonStartObj) ? jsonStart : jsonStartObj;
        if (start !== -1) {
          data = JSON.parse(text.substring(start));
        } else {
          data = JSON.parse(text);
        }
      } catch (parseError) {
        return res.status(500).json({ error: "Invalid API response" });
      }

      _c.recurrenceTypes.set("v", data);
      res.json(data);
    } catch (error) {
      console.error("Error fetching recurrence types:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/recurranceCount/:calendarType/:fromDate/:toDate/:type/:weekdayId/:specificDate/:weekdayRepeatId/:monthId/:fromTithiId/:fromNakshatraId/:masaId", async (req, res) => {
    try {
      const { calendarType, fromDate, toDate, type, weekdayId, specificDate, weekdayRepeatId, monthId, fromTithiId, fromNakshatraId, masaId } = req.params;
      const response = await fetch(`${SRINGERI_API_URL}/api/recurranceCount/${calendarType}/${fromDate}/${toDate}/${type}/${weekdayId}/${specificDate}/${weekdayRepeatId}/${monthId}/${fromTithiId}/${fromNakshatraId}/${masaId}`, {
        headers: {
          "Content-Type": "application/json",
          ...(SRINGERI_API_KEY && { "X-API-Key": SRINGERI_API_KEY }),
        },
      });

      if (!response.ok) {
        return res.status(response.status).json({ error: "Failed to fetch recurrence count" });
      }

      const text = await response.text();
      let data;
      try {
        const jsonStart = text.indexOf('[');
        const jsonStartObj = text.indexOf('{');
        const start = jsonStart !== -1 && (jsonStartObj === -1 || jsonStart < jsonStartObj) ? jsonStart : jsonStartObj;
        if (start !== -1) {
          data = JSON.parse(text.substring(start));
        } else {
          data = JSON.parse(text);
        }
      } catch (parseError) {
        return res.status(500).json({ error: "Invalid API response" });
      }

      res.json(data);
    } catch (error) {
      console.error("Error fetching recurrence count:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/online/fl", async (req, res) => {
    try {
      const response = await fetch(`${SRINGERI_API_URL}/api/online/fl`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(SRINGERI_API_KEY && { "X-API-Key": SRINGERI_API_KEY }),
        },
        body: JSON.stringify(req.body),
      });

      if (!response.ok) {
        return res.status(response.status).json({ error: "Failed to submit seva booking" });
      }

      const text = await response.text();
      let data;
      try {
        const jsonStart = text.indexOf('{');
        if (jsonStart !== -1) {
          data = JSON.parse(text.substring(jsonStart));
        } else {
          data = JSON.parse(text);
        }
      } catch (parseError) {
        return res.status(500).json({ error: "Invalid API response" });
      }

      res.json(data);
    } catch (error) {
      console.error("Error submitting seva booking:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/initiatePaytmTransaction", async (req, res) => {
    try {
      const PAYTM_MID = process.env.PAYTM_MID;
      const PAYTM_MERCHANT_KEY = process.env.PAYTM_MERCHANT_KEY;
      if (!PAYTM_MID || !PAYTM_MERCHANT_KEY) {
        return res.status(500).json({ error: "Paytm credentials not configured" });
      }

      const { amount, mobile } = req.body;
      if (!amount || amount <= 0) {
        return res.status(400).json({ error: "Valid amount is required" });
      }

      const now = new Date();
      const ts = now.getFullYear().toString() +
        String(now.getMonth() + 1).padStart(2, "0") +
        String(now.getDate()).padStart(2, "0") +
        String(now.getHours()).padStart(2, "0") +
        String(now.getMinutes()).padStart(2, "0") +
        String(now.getSeconds()).padStart(2, "0");
      const rand = String(Math.floor(Math.random() * 1000)).padStart(3, "0");
      const orderPrefix = req.body.orderPrefix || "FL";
      const orderId = `${orderPrefix}_${ts}_${rand}`;

      const paytmParams: Record<string, any> = {
        body: {
          requestType: "Payment",
          mid: PAYTM_MID,
          websiteName: "DEFAULT",
          orderId: orderId,
          txnAmount: {
            value: String(amount.toFixed ? amount.toFixed(2) : Number(amount).toFixed(2)),
            currency: "INR",
          },
          userInfo: {
            custId: mobile || "GUEST",
          },
          callbackUrl: `${req.protocol}://${req.get("host")}/api/paytm-callback`,
        },
      };

      const checksum = await PaytmChecksum.generateSignature(
        JSON.stringify(paytmParams.body),
        PAYTM_MERCHANT_KEY
      );
      paytmParams.head = { signature: checksum };

      const paytmRes = await fetch(
        `https://securegw.paytm.in/theia/api/v1/initiateTransaction?mid=${PAYTM_MID}&orderId=${orderId}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(paytmParams),
        }
      );

      const paytmData = await paytmRes.json();

      if (paytmData.body?.resultInfo?.resultStatus === "S" && paytmData.body?.txnToken) {
        res.json({
          txnToken: paytmData.body.txnToken,
          orderId: orderId,
          mid: PAYTM_MID,
          amount: String(Number(amount).toFixed(2)),
        });
      } else {
        console.error("Paytm initiate failed:", JSON.stringify(paytmData));
        res.status(500).json({
          error: "Failed to initiate payment",
          details: paytmData.body?.resultInfo?.resultMsg || "Unknown error",
        });
      }
    } catch (error) {
      console.error("Error initiating Paytm transaction:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/verifyPaytmTransaction", async (req, res) => {
    try {
      const { orderId, is80G } = req.body;
      if (!orderId) {
        return res.status(400).json({ error: "orderId is required" });
      }

      const useSPCT = is80G === true || is80G === 1 || is80G === "1";
      const PAYTM_MID_VAL = (useSPCT && process.env.PAYTM_MID_SPCT) ? process.env.PAYTM_MID_SPCT : process.env.PAYTM_MID;
      const PAYTM_KEY_VAL = (useSPCT && process.env.PAYTM_MERCHANT_KEY_SPCT) ? process.env.PAYTM_MERCHANT_KEY_SPCT : process.env.PAYTM_MERCHANT_KEY;

      if (!PAYTM_MID_VAL || !PAYTM_KEY_VAL) {
        return res.status(500).json({ error: "Paytm credentials not configured" });
      }

      const paytmParams: Record<string, any> = {
        body: {
          mid: PAYTM_MID_VAL,
          orderId: orderId,
        },
      };

      const checksum = await PaytmChecksum.generateSignature(
        JSON.stringify(paytmParams.body),
        PAYTM_KEY_VAL
      );
      paytmParams.head = { signature: checksum };

      const statusRes = await fetch(
        `https://securegw.paytm.in/v3/order/status`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(paytmParams),
        }
      );

      const statusData = await statusRes.json();
      console.log("Paytm verification response for", orderId, ":", JSON.stringify(statusData));

      const resultStatus = statusData.body?.resultInfo?.resultStatus;
      const txnStatus =
        statusData.body?.txnInfo?.STATUS ||
        statusData.body?.status ||
        statusData.body?.txnStatus ||
        resultStatus ||
        "";

      const isVerifiedSuccess =
        txnStatus === "TXN_SUCCESS" || resultStatus === "TXN_SUCCESS";

      if (isVerifiedSuccess) {
        res.json({
          verified: true,
          status: "TXN_SUCCESS",
          txnId: statusData.body?.txnId || statusData.body?.txnInfo?.TXNID || "",
          txnAmount: statusData.body?.txnAmount || statusData.body?.txnInfo?.TXNAMOUNT || "",
          resultMsg: statusData.body?.resultInfo?.resultMsg || "Success",
        });
      } else {
        res.json({
          verified: false,
          status: txnStatus || "UNKNOWN",
          resultMsg: statusData.body?.resultInfo?.resultMsg || "Payment was not successful",
        });
      }
    } catch (error) {
      console.error("Error verifying Paytm transaction:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/newReceiptFl", async (req, res) => {
    try {
      const body = { ...req.body };
      if (typeof body.mobile === "string") {
        const m = body.mobile.trim().replace(/\D/g, "");
        if (m.length !== 10 || m.startsWith("0")) {
          return res.status(400).json({ error: "Please enter a valid 10-digit mobile number not starting with 0." });
        }
        body.mobile = m;
      }
      const response = await fetch(`${SRINGERI_API_URL}/api/newReceiptFl`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(SRINGERI_API_KEY && { "X-API-Key": SRINGERI_API_KEY }),
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        return res.status(response.status).json({ error: "Failed to create receipt" });
      }

      const text = await response.text();
      let data;
      try {
        const jsonStart = text.indexOf('{');
        const jsonStartArr = text.indexOf('[');
        const start = jsonStart !== -1 && (jsonStartArr === -1 || jsonStart < jsonStartArr) ? jsonStart : jsonStartArr;
        if (start !== -1) {
          data = JSON.parse(text.substring(start));
        } else {
          data = JSON.parse(text);
        }
      } catch (parseError) {
        return res.status(500).json({ error: "Invalid API response" });
      }

      res.json(data);
    } catch (error) {
      console.error("Error creating receipt:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/newReceiptFlr", async (req, res) => {
    try {
      const response = await fetch(`${SRINGERI_API_URL}/api/newReceiptFlr`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(SRINGERI_API_KEY && { "X-API-Key": SRINGERI_API_KEY }),
        },
        body: JSON.stringify(req.body),
      });
      if (!response.ok) {
        return res.status(response.status).json({ error: "Failed to create recurring receipt" });
      }
      const text = await response.text();
      let data;
      try {
        const jsonStart = text.indexOf('{');
        const jsonStartArr = text.indexOf('[');
        const start = jsonStart !== -1 && (jsonStartArr === -1 || jsonStart < jsonStartArr) ? jsonStart : jsonStartArr;
        if (start !== -1) {
          data = JSON.parse(text.substring(start));
        } else {
          data = JSON.parse(text);
        }
      } catch (parseError) {
        return res.status(500).json({ error: "Invalid API response" });
      }
      res.json(data);
    } catch (error) {
      console.error("Error creating recurring receipt:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Payment acknowledgements are sent directly from the server to the upstream
  // Sringeri API in the paytm-callback and reconciliation routes after
  // server-side Paytm verification. There is no legitimate reason for a client
  // to call this endpoint; exposing it as a public proxy would let any
  // authenticated caller force an upstream ack for any order ID they supply.
  app.post("/api/paymentAck", (_req, res) => {
    res.status(410).json({ error: "This endpoint is not available" });
  });

  // Helper: query Paytm order status, optionally trying SPCT MID as fallback.
  async function paytmOrderStatus(orderId: string): Promise<{
    mid: string;
    isSpct: boolean;
    body: any;
    raw: any;
  } | null> {
    const PAYTM_MID_VAL = process.env.PAYTM_MID;
    const PAYTM_KEY_VAL = process.env.PAYTM_MERCHANT_KEY;
    const PAYTM_MID_SPCT_VAL = process.env.PAYTM_MID_SPCT;
    const PAYTM_KEY_SPCT_VAL = process.env.PAYTM_MERCHANT_KEY_SPCT;

    const attempts: Array<{ mid: string; key: string; isSpct: boolean }> = [];
    if (PAYTM_MID_VAL && PAYTM_KEY_VAL) attempts.push({ mid: PAYTM_MID_VAL, key: PAYTM_KEY_VAL, isSpct: false });
    if (PAYTM_MID_SPCT_VAL && PAYTM_KEY_SPCT_VAL) attempts.push({ mid: PAYTM_MID_SPCT_VAL, key: PAYTM_KEY_SPCT_VAL, isSpct: true });

    let lastResult: any = null;
    let lastUsed: { mid: string; isSpct: boolean } | null = null;

    for (const a of attempts) {
      try {
        const body = { mid: a.mid, orderId };
        const checksum = await PaytmChecksum.generateSignature(JSON.stringify(body), a.key);
        const verifyParams = { body, head: { signature: checksum } };
        const r = await fetch(`https://securegw.paytm.in/v3/order/status`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(verifyParams),
        });
        const data = await r.json();
        lastResult = data;
        lastUsed = { mid: a.mid, isSpct: a.isSpct };

        const rs = data?.body?.resultInfo?.resultStatus;
        const rc = data?.body?.resultInfo?.resultCode;
        // Paytm "no record found" -> resultCode 334 (or message like "No record found").
        // Treat as "try next MID".
        const notFound = rc === "334" || rc === 334 || /no record/i.test(data?.body?.resultInfo?.resultMsg || "");
        if (!notFound && rs) {
          return { mid: a.mid, isSpct: a.isSpct, body: data.body, raw: data };
        }
      } catch (err) {
        console.error("paytmOrderStatus attempt failed:", err);
      }
    }
    if (lastResult && lastUsed) {
      return { mid: lastUsed.mid, isSpct: lastUsed.isSpct, body: lastResult.body, raw: lastResult };
    }
    return null;
  }

  const RECON_ADMIN_UIDS = [
    ...(process.env.ANALYTICS_ADMIN_UIDS || "").split(","),
    ...(process.env.QUIZ_ADMIN_UIDS || "").split(","),
  ].map(s => s.trim()).filter(Boolean);

  async function isReconciliationAdmin(req: any): Promise<boolean> {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) return false;
    const token = authHeader.slice(7);
    const uid = await verifyFirebaseTokenEarly(token);
    if (!uid) return false;
    return RECON_ADMIN_UIDS.includes(uid);
  }

  app.get("/api/admin/allTransactions/:fromDate/:toDate", async (req, res) => {
    try {
      if (!await requireRole(req, "accounts")) return res.status(403).json({ error: "Forbidden" });
      const { fromDate, toDate } = req.params;
      const r = await fetch(`${SRINGERI_API_URL}/api/fetchAllTransactions/${fromDate}/${toDate}`, {
        method: "GET",
        headers: {
          ...(SRINGERI_API_KEY && { "X-API-Key": SRINGERI_API_KEY }),
        },
      });
      const text = await r.text();
      if (!r.ok) {
        console.error("fetchAllTransactions upstream error:", r.status, text);
        return res.status(r.status).json({ error: "Failed to fetch transactions" });
      }
      let data;
      try {
        const jsonStart = text.indexOf("{");
        const jsonStartArr = text.indexOf("[");
        const start = jsonStart !== -1 && (jsonStartArr === -1 || jsonStart < jsonStartArr) ? jsonStart : jsonStartArr;
        data = start !== -1 ? JSON.parse(text.substring(start)) : JSON.parse(text);
      } catch (e) {
        console.error("fetchAllTransactions parse error:", e, text.slice(0, 200));
        return res.status(500).json({ error: "Invalid upstream response" });
      }
      res.json(data);
    } catch (error) {
      console.error("Error fetching all transactions:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/admin/corrections/fetch", async (req, res) => {
    try {
      if (!await requireRole(req, "accounts")) return res.status(403).json({ error: "Forbidden" });
      const { recordType, referenceNo, email, mobileNumber, bookingDate } = req.body || {};
      if (!recordType || typeof recordType !== "string") {
        return res.status(400).json({ error: "recordType is required" });
      }
      const hasAnyLookupFilter = [referenceNo, email, mobileNumber, bookingDate].some(
        (v) => typeof v === "string" && v.trim() !== ""
      );
      if (!hasAnyLookupFilter) {
        return res.status(400).json({ error: "Provide at least one of referenceNo, email, mobileNumber, or bookingDate" });
      }

      const payload: Record<string, string> = { recordType };
      if (typeof referenceNo === "string" && referenceNo.trim()) payload.referenceNo = referenceNo.trim();
      if (typeof email === "string" && email.trim()) payload.email = email.trim();
      if (typeof mobileNumber === "string" && mobileNumber.trim()) payload.mobileNumber = mobileNumber.trim();
      if (typeof bookingDate === "string" && bookingDate.trim()) payload.bookingDate = bookingDate.trim();

      const r = await fetch(`${SRINGERI_API_URL}/api/fetchRecordCorrection`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(SRINGERI_API_KEY && { "X-API-Key": SRINGERI_API_KEY }),
        },
        body: JSON.stringify(payload),
      });
      const text = await r.text();
      if (!r.ok) {
        console.error("fetchRecordCorrection upstream error:", r.status, text);
        return res.status(r.status).json({ error: "Failed to fetch records" });
      }
      let data;
      try {
        const jsonStart = text.indexOf("{");
        const jsonStartArr = text.indexOf("[");
        const start = jsonStart !== -1 && (jsonStartArr === -1 || jsonStart < jsonStartArr) ? jsonStart : jsonStartArr;
        data = start !== -1 ? JSON.parse(text.substring(start)) : JSON.parse(text);
      } catch (e) {
        console.error("fetchRecordCorrection parse error:", e, text.slice(0, 200));
        return res.status(500).json({ error: "Invalid upstream response" });
      }
      res.json(data);
    } catch (error) {
      console.error("Error fetching record corrections:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/admin/corrections/update", async (req, res) => {
    try {
      if (!await requireRole(req, "accounts")) return res.status(403).json({ error: "Forbidden" });
      const { uid, email } = (await getFirebaseUidAndEmail(req)) || {};
      const { recordType, id, bookingDate, remarks, originalBookingDate } = req.body || {};
      if (!recordType || typeof recordType !== "string") {
        return res.status(400).json({ error: "recordType is required" });
      }
      if (!id || (typeof id !== "string" && typeof id !== "number")) {
        return res.status(400).json({ error: "id is required" });
      }

      if (recordType !== "yatri") {
        return res.status(400).json({ error: `Corrections for record type "${recordType}" are not yet supported` });
      }

      const hasBookingDate = typeof bookingDate === "string" && bookingDate.trim() !== "";
      const hasRemarks = typeof remarks === "string" && remarks.trim() !== "";
      if (!hasBookingDate && !hasRemarks) {
        return res.status(400).json({ error: "Provide at least one of bookingDate or remarks to update" });
      }

      const adminIdentity = email || uid || "unknown admin";
      const summaryParts: string[] = [];
      if (hasBookingDate) {
        const fromDate =
          typeof originalBookingDate === "string" && originalBookingDate.trim() !== ""
            ? originalBookingDate.trim()
            : "unknown";
        summaryParts.push(`Booking date changed from ${fromDate} to ${bookingDate.trim()}`);
      }
      if (hasRemarks) {
        summaryParts.push(remarks.trim());
      }

      const payload: Record<string, string | number> = { recordType, id };
      if (hasBookingDate) payload.bookingDate = bookingDate.trim();
      payload.remarks = `${summaryParts.join(" | ")} - ${adminIdentity}`;

      const r = await fetch(`${SRINGERI_API_URL}/api/updateRecordCorrection`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(SRINGERI_API_KEY && { "X-API-Key": SRINGERI_API_KEY }),
        },
        body: JSON.stringify(payload),
      });
      const text = await r.text();
      if (!r.ok) {
        console.error("updateRecordCorrection upstream error:", r.status, text);
        return res.status(r.status).json({ error: "Failed to update record" });
      }
      let data;
      try {
        const jsonStart = text.indexOf("{");
        const jsonStartArr = text.indexOf("[");
        const start = jsonStart !== -1 && (jsonStartArr === -1 || jsonStart < jsonStartArr) ? jsonStart : jsonStartArr;
        data = start !== -1 ? JSON.parse(text.substring(start)) : JSON.parse(text);
      } catch (e) {
        console.error("updateRecordCorrection parse error:", e, text.slice(0, 200));
        return res.status(500).json({ error: "Invalid upstream response" });
      }
      res.json(data);
    } catch (error) {
      console.error("Error updating record correction:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/admin/reconciliation/pending", async (req, res) => {
    try {
      if (!await requireRole(req, "accounts")) return res.status(403).json({ error: "Forbidden" });
      const r = await fetch(`${SRINGERI_API_URL}/api/fetchPendingTransactions`, {
        method: "GET",
        headers: {
          ...(SRINGERI_API_KEY && { "X-API-Key": SRINGERI_API_KEY }),
        },
      });
      const text = await r.text();
      if (!r.ok) {
        console.error("fetchPendingTransactions upstream error:", r.status, text);
        return res.status(r.status).json({ error: "Failed to fetch pending transactions" });
      }
      let data;
      try {
        const jsonStart = text.indexOf("{");
        const jsonStartArr = text.indexOf("[");
        const start = jsonStart !== -1 && (jsonStartArr === -1 || jsonStart < jsonStartArr) ? jsonStart : jsonStartArr;
        data = start !== -1 ? JSON.parse(text.substring(start)) : JSON.parse(text);
      } catch (e) {
        console.error("fetchPendingTransactions parse error:", e, text.slice(0, 200));
        return res.status(500).json({ error: "Invalid upstream response" });
      }
      res.json(data);
    } catch (error) {
      console.error("Error fetching pending transactions:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/admin/reconciliation/check-status", async (req, res) => {
    try {
      if (!await requireRole(req, "accounts")) return res.status(403).json({ error: "Forbidden" });
      const { orderId } = req.body || {};
      if (!orderId || typeof orderId !== "string") {
        return res.status(400).json({ error: "orderId is required" });
      }
      const result = await paytmOrderStatus(orderId);
      if (!result) {
        return res.status(502).json({ error: "Paytm status check failed" });
      }
      const b = result.body || {};
      const ri = b.resultInfo || {};
      res.json({
        orderId,
        mid: result.mid,
        isSpct: result.isSpct,
        status: ri.resultStatus || "UNKNOWN",
        resultCode: ri.resultCode,
        resultMsg: ri.resultMsg,
        txnId: b.txnId,
        bankTxnId: b.bankTxnId,
        txnAmount: b.txnAmount,
        txnDate: b.txnDate,
        paymentMode: b.paymentMode,
        bankName: b.bankName,
        currency: b.currency,
      });
    } catch (error) {
      console.error("Error in check-status:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/admin/reconciliation/ack", async (req, res) => {
    try {
      if (!await requireRole(req, "accounts")) return res.status(403).json({ error: "Forbidden" });
      const { orderId } = req.body || {};
      if (!orderId || typeof orderId !== "string") {
        return res.status(400).json({ error: "orderId is required" });
      }
      const result = await paytmOrderStatus(orderId);
      if (!result) {
        return res.status(502).json({ error: "Paytm status check failed" });
      }
      const b = result.body || {};
      const ri = b.resultInfo || {};
      if (ri.resultStatus !== "TXN_SUCCESS") {
        return res.status(409).json({
          error: "Transaction not successful",
          status: ri.resultStatus || "UNKNOWN",
          resultMsg: ri.resultMsg,
        });
      }

      const ackBody: Record<string, string> = {
        ORDERID: orderId,
        STATUS: "TXN_SUCCESS",
        RESPCODE: String(ri.resultCode ?? "01"),
        RESPMSG: ri.resultMsg || "Txn Success",
      };
      if (b.txnId) ackBody.TXNID = String(b.txnId);
      if (b.bankTxnId) ackBody.BANKTXNID = String(b.bankTxnId);
      if (b.txnAmount) ackBody.TXNAMOUNT = String(b.txnAmount);
      if (b.txnDate) ackBody.TXNDATE = String(b.txnDate);
      if (b.paymentMode) ackBody.PAYMENTMODE = String(b.paymentMode);
      if (b.bankName) ackBody.BANKNAME = String(b.bankName);
      if (b.currency) ackBody.CURRENCY = String(b.currency);

      console.log("Reconciliation ack for order:", orderId);
      const ackRes = await fetch(`${SRINGERI_API_URL}/api/paymentAck`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(SRINGERI_API_KEY && { "X-API-Key": SRINGERI_API_KEY }),
        },
        body: JSON.stringify(ackBody),
      });
      const ackText = await ackRes.text();
      console.log("Reconciliation ack response status:", ackRes.status);
      if (!ackRes.ok) {
        return res.status(ackRes.status).json({ error: "Failed to acknowledge payment", upstream: ackText });
      }
      let ackData: any = null;
      try {
        const j = ackText.indexOf("{");
        ackData = j !== -1 ? JSON.parse(ackText.substring(j)) : JSON.parse(ackText);
      } catch {
        ackData = { raw: ackText };
      }
      res.json({ orderId, acked: true, ackResponse: ackData, paytm: { status: ri.resultStatus, txnId: b.txnId, txnAmount: b.txnAmount } });
    } catch (error) {
      console.error("Error in reconciliation ack:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/admin/reconciliation/mark-failed", async (req, res) => {
    try {
      if (!await requireRole(req, "accounts")) return res.status(403).json({ error: "Forbidden" });
      const { orderId } = req.body || {};
      if (!orderId || typeof orderId !== "string") {
        return res.status(400).json({ error: "orderId is required" });
      }
      const result = await paytmOrderStatus(orderId);
      if (!result) {
        return res.status(502).json({ error: "Paytm status check failed" });
      }
      const b = result.body || {};
      const ri = b.resultInfo || {};
      if (ri.resultStatus === "PENDING") {
        return res.status(409).json({ error: "Transaction is still pending on Paytm", status: "PENDING" });
      }
      const failBody: Record<string, string> = {
        ORDERID: orderId,
        STATUS: ri.resultStatus || "TXN_FAILURE",
        RESPCODE: String(ri.resultCode ?? ""),
        RESPMSG: ri.resultMsg || "Transaction Failed",
      };
      if (b.txnId) failBody.TXNID = String(b.txnId);
      if (b.bankTxnId) failBody.BANKTXNID = String(b.bankTxnId);
      if (b.txnAmount) failBody.TXNAMOUNT = String(b.txnAmount);
      if (b.txnDate) failBody.TXNDATE = String(b.txnDate);
      if (b.paymentMode) failBody.PAYMENTMODE = String(b.paymentMode);
      if (b.bankName) failBody.BANKNAME = String(b.bankName);
      if (b.currency) failBody.CURRENCY = String(b.currency);
      console.log("Mark failed for order:", orderId, "body:", JSON.stringify(failBody));
      const failRes = await fetch(`${SRINGERI_API_URL}/api/updateFailedTransaction`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(SRINGERI_API_KEY && { "X-API-Key": SRINGERI_API_KEY }),
        },
        body: JSON.stringify(failBody),
      });
      const failText = await failRes.text();
      console.log("Mark failed response HTTP status:", failRes.status);
      console.log("Mark failed response body:", failText);
      if (!failRes.ok) {
        return res.status(failRes.status).json({ error: "Failed to mark transaction as failed", upstream: failText });
      }
      let failData: any = null;
      try {
        const j = failText.indexOf("{");
        failData = j !== -1 ? JSON.parse(failText.substring(j)) : JSON.parse(failText);
      } catch {
        failData = { raw: failText };
      }
      // Detect error responses that come with HTTP 200 (common in this API)
      const bodyIndicatesError =
        failData?.status === 0 ||
        failData?.status === false ||
        failData?.success === false ||
        failData?.status_code === 0 ||
        (typeof failData?.status === "string" && /fail|error|nothing updated/i.test(failData.status)) ||
        (failData?.error != null && failData?.message == null && failData?.status == null);
      if (bodyIndicatesError) {
        const msg = failData?.message || failData?.error || failData?.msg || failData?.status || failData?.raw || "Sringeri API rejected the request";
        console.log("Mark failed: Sringeri returned body-level error:", msg);
        return res.status(422).json({ error: String(msg), upstream: failData });
      }
      res.json({ orderId, marked: true, failResponse: failData, paytm: { status: ri.resultStatus, txnId: b.txnId } });
    } catch (error) {
      console.error("Error in mark-failed:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/admin/reconciliation-logs", async (req, res) => {
    try {
      if (!await requireRole(req, "accounts")) return res.status(403).json({ error: "Forbidden" });
      const { from, to } = req.query as { from?: string; to?: string };
      const fromDate = from ? new Date(from + "T00:00:00.000Z") : new Date(new Date().setHours(0, 0, 0, 0));
      const toDate = to ? new Date(to + "T23:59:59.999Z") : new Date(new Date().setHours(23, 59, 59, 999));
      const logs = await storage.getReconciliationLogs(fromDate, toDate);
      res.json(logs);
    } catch (error) {
      console.error("Error fetching reconciliation logs:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/admin/cron-status", async (req, res) => {
    try {
      if (!await requireRole(req, "accounts")) return res.status(403).json({ error: "Forbidden" });
      const val = await storage.getAppSetting("recon_cron_enabled");
      res.json({ enabled: val !== "false" });
    } catch (error) {
      console.error("Error fetching cron status:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/admin/cron-toggle", async (req, res) => {
    try {
      if (!await requireRole(req, "accounts")) return res.status(403).json({ error: "Forbidden" });
      const current = await storage.getAppSetting("recon_cron_enabled");
      const nowEnabled = current === "false"; // toggle
      await storage.setAppSetting("recon_cron_enabled", nowEnabled ? "true" : "false");
      res.json({ enabled: nowEnabled });
    } catch (error) {
      console.error("Error toggling cron:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // User-facing reconcile: derives pending orderIds server-side from the user's own devotee
  // data (no client-supplied IDs accepted), then checks Paytm and auto-resolves each one.
  app.post("/api/user/reconcile-pending", async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const token = authHeader.slice(7);
      const uid = await verifyFirebaseTokenEarly(token);
      if (!uid) return res.status(401).json({ error: "Invalid token" });

      // Derive owned pending orderIds from the authenticated user's server-side data only.
      // No client-supplied orderIds are used, eliminating IDOR risk.
      const devoteeRes = await fetch(`${SRINGERI_API_URL}/api/onlineDevotee/${uid}`, {
        headers: {
          "Content-Type": "application/json",
          ...(SRINGERI_API_KEY && { "X-API-Key": SRINGERI_API_KEY }),
        },
      });
      if (!devoteeRes.ok) {
        return res.status(502).json({ error: "Could not fetch user transactions" });
      }
      const devoteeData = await devoteeRes.json();
      const allTxns: any[] = devoteeData?.allTransactions || [];

      const cutoff = new Date("2026-06-01").getTime();
      const pendingIds: string[] = allTxns
        .filter((t: any) => {
          const s = String(t.status ?? t.txnStatus ?? t.paymentStatus ?? t.state ?? "");
          if (!(s === "8" || s.toLowerCase() === "pending")) return false;
          // Only reconcile transactions on or after 2026-06-01
          const rawDate = t.txnDate || t.createdAt || t.date || t.bookingDate ||
            t.transactionDate || t.paymentDate || t.createdDate;
          if (!rawDate) return true;
          try {
            const ms = new Date(rawDate).getTime();
            return isNaN(ms) || ms >= cutoff;
          } catch { return true; }
        })
        .map((t: any) => {
          for (const k of ["paymentRef", "orderId", "orderID", "order_id", "txnId"]) {
            if (t[k]) return String(t[k]);
          }
          return null;
        })
        .filter(Boolean) as string[];

      if (pendingIds.length === 0) {
        return res.json({ reconciled: 0, markedFailed: 0, pending: 0, errors: 0 });
      }

      const results = { reconciled: 0, markedFailed: 0, pending: 0, errors: 0 };

      for (const orderId of pendingIds.slice(0, 50)) {
        try {
          const result = await paytmOrderStatus(orderId);
          if (!result) { results.errors++; continue; }
          const b = result.body || {};
          const ri = b.resultInfo || {};
          const paytmStatus = ri.resultStatus;

          if (paytmStatus === "TXN_SUCCESS") {
            const ackBody: Record<string, string> = {
              ORDERID: orderId, STATUS: "TXN_SUCCESS",
              RESPCODE: String(ri.resultCode ?? "01"),
              RESPMSG: ri.resultMsg || "Txn Success",
            };
            if (b.txnId)       ackBody.TXNID       = String(b.txnId);
            if (b.bankTxnId)   ackBody.BANKTXNID   = String(b.bankTxnId);
            if (b.txnAmount)   ackBody.TXNAMOUNT   = String(b.txnAmount);
            if (b.txnDate)     ackBody.TXNDATE     = String(b.txnDate);
            if (b.paymentMode) ackBody.PAYMENTMODE = String(b.paymentMode);
            if (b.bankName)    ackBody.BANKNAME    = String(b.bankName);
            if (b.currency)    ackBody.CURRENCY    = String(b.currency);
            const ackRes = await fetch(`${SRINGERI_API_URL}/api/paymentAck`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                ...(SRINGERI_API_KEY && { "X-API-Key": SRINGERI_API_KEY }),
              },
              body: JSON.stringify(ackBody),
            });
            if (ackRes.ok) {
              results.reconciled++;
            } else {
              console.error(`[user-reconcile] paymentAck failed for ${orderId}: HTTP ${ackRes.status}`);
              results.errors++;
            }
          } else if (paytmStatus === "PENDING") {
            results.pending++;
          } else {
            const failBody: Record<string, string> = {
              ORDERID: orderId, STATUS: paytmStatus || "TXN_FAILURE",
              RESPCODE: String(ri.resultCode ?? ""),
              RESPMSG: ri.resultMsg || "Transaction Failed",
            };
            if (b.txnId)       failBody.TXNID       = String(b.txnId);
            if (b.bankTxnId)   failBody.BANKTXNID   = String(b.bankTxnId);
            if (b.txnAmount)   failBody.TXNAMOUNT   = String(b.txnAmount);
            if (b.txnDate)     failBody.TXNDATE     = String(b.txnDate);
            if (b.paymentMode) failBody.PAYMENTMODE = String(b.paymentMode);
            if (b.bankName)    failBody.BANKNAME    = String(b.bankName);
            if (b.currency)    failBody.CURRENCY    = String(b.currency);
            const failRes = await fetch(`${SRINGERI_API_URL}/api/updateFailedTransaction`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                ...(SRINGERI_API_KEY && { "X-API-Key": SRINGERI_API_KEY }),
              },
              body: JSON.stringify(failBody),
            });
            if (failRes.ok) {
              results.markedFailed++;
            } else {
              console.error(`[user-reconcile] updateFailedTransaction failed for ${orderId}: HTTP ${failRes.status}`);
              results.errors++;
            }
          }
        } catch (err) {
          console.error(`[user-reconcile] error for ${orderId}:`, err);
          results.errors++;
        }
      }

      console.log(`[user-reconcile] uid=${uid}`, results);
      res.json(results);
    } catch (error) {
      console.error("Error in user reconcile-pending:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Check and resolve a single transaction for the authenticated user.
  // Verifies ownership server-side before touching Paytm — no IDOR risk.
  app.post("/api/user/check-transaction", async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const token = authHeader.slice(7);
      const uid = await verifyFirebaseTokenEarly(token);
      if (!uid) return res.status(401).json({ error: "Invalid token" });

      const { orderId } = req.body || {};
      if (!orderId || typeof orderId !== "string") {
        return res.status(400).json({ error: "orderId required" });
      }

      // Verify ownership — orderId must exist in user's own allTransactions
      const devoteeRes = await fetch(`${SRINGERI_API_URL}/api/onlineDevotee/${uid}`, {
        headers: {
          "Content-Type": "application/json",
          ...(SRINGERI_API_KEY && { "X-API-Key": SRINGERI_API_KEY }),
        },
      });
      if (!devoteeRes.ok) {
        return res.status(502).json({ error: "Could not fetch user transactions" });
      }
      const devoteeData = await devoteeRes.json();
      const allTxns: any[] = devoteeData?.allTransactions || [];
      const owned = allTxns.some((t: any) => {
        for (const k of ["paymentRef", "orderId", "orderID", "order_id", "txnId"]) {
          if (t[k] && String(t[k]) === orderId) return true;
        }
        return false;
      });
      if (!owned) {
        return res.status(403).json({ error: "Transaction not found for this user" });
      }

      const result = await paytmOrderStatus(orderId);
      if (!result) {
        return res.status(502).json({ error: "Could not reach Paytm" });
      }
      const b = result.body || {};
      const ri = b.resultInfo || {};
      const paytmStatus = ri.resultStatus;

      if (paytmStatus === "TXN_SUCCESS") {
        const ackBody: Record<string, string> = {
          ORDERID: orderId, STATUS: "TXN_SUCCESS",
          RESPCODE: String(ri.resultCode ?? "01"),
          RESPMSG: ri.resultMsg || "Txn Success",
        };
        if (b.txnId)       ackBody.TXNID       = String(b.txnId);
        if (b.bankTxnId)   ackBody.BANKTXNID   = String(b.bankTxnId);
        if (b.txnAmount)   ackBody.TXNAMOUNT   = String(b.txnAmount);
        if (b.txnDate)     ackBody.TXNDATE     = String(b.txnDate);
        if (b.paymentMode) ackBody.PAYMENTMODE = String(b.paymentMode);
        if (b.bankName)    ackBody.BANKNAME    = String(b.bankName);
        if (b.currency)    ackBody.CURRENCY    = String(b.currency);
        const ackRes = await fetch(`${SRINGERI_API_URL}/api/paymentAck`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(SRINGERI_API_KEY && { "X-API-Key": SRINGERI_API_KEY }),
          },
          body: JSON.stringify(ackBody),
        });
        if (ackRes.ok) {
          return res.json({ outcome: "reconciled", paytmStatus, msg: ri.resultMsg });
        }
        return res.status(502).json({ outcome: "ack_failed", error: "ACK step failed", paytmStatus });
      }

      if (paytmStatus === "PENDING") {
        return res.json({ outcome: "pending", paytmStatus, msg: ri.resultMsg });
      }

      // Paytm confirmed failure
      const failBody: Record<string, string> = {
        ORDERID: orderId, STATUS: paytmStatus || "TXN_FAILURE",
        RESPCODE: String(ri.resultCode ?? ""),
        RESPMSG: ri.resultMsg || "Transaction Failed",
      };
      if (b.txnId)       failBody.TXNID       = String(b.txnId);
      if (b.bankTxnId)   failBody.BANKTXNID   = String(b.bankTxnId);
      if (b.txnAmount)   failBody.TXNAMOUNT   = String(b.txnAmount);
      if (b.txnDate)     failBody.TXNDATE     = String(b.txnDate);
      if (b.paymentMode) failBody.PAYMENTMODE = String(b.paymentMode);
      if (b.bankName)    failBody.BANKNAME    = String(b.bankName);
      if (b.currency)    failBody.CURRENCY    = String(b.currency);
      const failRes = await fetch(`${SRINGERI_API_URL}/api/updateFailedTransaction`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(SRINGERI_API_KEY && { "X-API-Key": SRINGERI_API_KEY }),
        },
        body: JSON.stringify(failBody),
      });
      if (failRes.ok) {
        return res.json({ outcome: "confirmed_failed", paytmStatus, msg: ri.resultMsg });
      }
      return res.status(502).json({ outcome: "mark_failed_error", error: "Failed to update record", paytmStatus });
    } catch (error) {
      console.error("Error in user check-transaction:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/paytm-callback", async (req, res) => {
    try {
      const paytmResponse = req.body;
      console.log("Paytm callback received:", JSON.stringify(paytmResponse));

      const PAYTM_MID_VAL = process.env.PAYTM_MID;
      const PAYTM_KEY_VAL = process.env.PAYTM_MERCHANT_KEY;
      const PAYTM_MID_SPCT_VAL = process.env.PAYTM_MID_SPCT;
      const PAYTM_KEY_SPCT_VAL = process.env.PAYTM_MERCHANT_KEY_SPCT;

      let useKey = PAYTM_KEY_VAL;
      let useMid = PAYTM_MID_VAL;
      if (paytmResponse.MID && paytmResponse.MID === PAYTM_MID_SPCT_VAL && PAYTM_KEY_SPCT_VAL) {
        useMid = PAYTM_MID_SPCT_VAL;
        useKey = PAYTM_KEY_SPCT_VAL;
      }

      // Checksum verification is mandatory when Paytm keys are configured.
      // Reject callbacks that omit CHECKSUMHASH entirely — missing hash is not
      // the same as a failed verification; it means the request was not from Paytm.
      if (useKey) {
        if (!paytmResponse.CHECKSUMHASH) {
          console.error("Paytm callback missing CHECKSUMHASH for order:", paytmResponse.ORDERID);
          return res.redirect(`/payment-result?orderId=${encodeURIComponent(paytmResponse.ORDERID || "")}&status=FAILED&respMsg=${encodeURIComponent("Payment verification failed. Please contact support.")}`);
        }
        const { CHECKSUMHASH, ...dataWithoutChecksum } = paytmResponse;
        const isValid = PaytmChecksum.verifySignature(
          dataWithoutChecksum,
          useKey,
          CHECKSUMHASH
        );
        if (!isValid) {
          console.error("Paytm callback checksum verification FAILED for order:", paytmResponse.ORDERID);
          return res.redirect(`/payment-result?orderId=${encodeURIComponent(paytmResponse.ORDERID || "")}&status=FAILED&respMsg=${encodeURIComponent("Payment verification failed. Please contact support.")}`);
        }
        console.log("Paytm callback checksum verified for order:", paytmResponse.ORDERID);
      }

      const orderId = paytmResponse.ORDERID || "";
      let verifiedStatus = paytmResponse.STATUS || "FAILED";
      let verifiedTxnId = paytmResponse.TXNID || "";
      let verifiedAmount = paytmResponse.TXNAMOUNT || "";
      let verifiedRespMsg = paytmResponse.RESPMSG || "";

      // Server-side status verification with Paytm — this is the authoritative result.
      // The paymentAck to the upstream system only fires after this verification,
      // so the ack always reflects the server-confirmed status rather than the
      // unverified callback fields.
      if (useMid && useKey && orderId) {
        try {
          const verifyParams: Record<string, any> = {
            body: { mid: useMid, orderId },
          };
          const verifyChecksum = await PaytmChecksum.generateSignature(
            JSON.stringify(verifyParams.body),
            useKey
          );
          verifyParams.head = { signature: verifyChecksum };

          const verifyRes = await fetch(`https://securegw.paytm.in/v3/order/status`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(verifyParams),
          });
          const verifyData = await verifyRes.json();
          console.log("Paytm callback server-side verification:", JSON.stringify(verifyData));

          if (verifyData.body?.resultInfo?.resultStatus) {
            const vStatus = verifyData.body.resultInfo.resultStatus;
            if (vStatus === "TXN_SUCCESS") verifiedStatus = "TXN_SUCCESS";
            else if (vStatus === "TXN_FAILURE") verifiedStatus = "TXN_FAILURE";
            else if (vStatus === "PENDING") verifiedStatus = "PENDING";
            verifiedRespMsg = verifyData.body.resultInfo.resultMsg || verifiedRespMsg;
          }
          if (verifyData.body?.txnId) verifiedTxnId = verifyData.body.txnId;
          if (verifyData.body?.txnAmount) verifiedAmount = verifyData.body.txnAmount;
        } catch (verifyErr) {
          console.error("Server-side verification failed, using callback status:", verifyErr);
        }
      }

      // Acknowledge payment to the upstream system only after server-side verification.
      const ackBody: Record<string, string> = {};
      const fields = ["BANKNAME", "BANKTXNID", "CURRENCY", "PAYMENTMODE", "ORDERID", "RESPCODE", "RESPMSG", "STATUS", "TXNDATE", "TXNID", "TXNAMOUNT"];
      for (const f of fields) {
        if (paytmResponse[f]) ackBody[f] = paytmResponse[f];
      }
      // Override STATUS with the server-verified value so the upstream sees the
      // authoritative status rather than what the callback claimed.
      if (verifiedStatus) ackBody["STATUS"] = verifiedStatus;

      try {
        await fetch(`${SRINGERI_API_URL}/api/paymentAck`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(SRINGERI_API_KEY && { "X-API-Key": SRINGERI_API_KEY }),
          },
          body: JSON.stringify(ackBody),
        });
      } catch (ackErr) {
        console.error("paymentAck call failed in callback (non-blocking):", ackErr);
      }

      const params = new URLSearchParams();
      params.set("orderId", orderId);
      params.set("status", verifiedStatus);
      params.set("txnId", verifiedTxnId);
      params.set("amount", verifiedAmount);
      params.set("respMsg", verifiedRespMsg);
      params.set("respCode", paytmResponse.RESPCODE || "");
      params.set("paymentMode", paytmResponse.PAYMENTMODE || "");
      params.set("bankName", paytmResponse.BANKNAME || "");

      res.redirect(`/payment-result?${params.toString()}`);
    } catch (error) {
      console.error("Error in Paytm callback:", error);
      res.redirect("/payment-result?status=FAILED&respMsg=Something+went+wrong");
    }
  });

  const ADMIN_UIDS = (process.env.ANALYTICS_ADMIN_UIDS || "").split(",").map(s => s.trim()).filter(Boolean);

  const adminAuth = adminAuthEarly;

  async function verifyFirebaseToken(idToken: string): Promise<string | null> {
    return verifyFirebaseTokenEarly(idToken);
  }

  async function isAdmin(req: any): Promise<boolean> {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) return false;
    const token = authHeader.slice(7);
    const uid = await verifyFirebaseToken(token);
    if (!uid) return false;
    return ADMIN_UIDS.includes(uid);
  }

  const analyticsRateLimit = new Map<string, { count: number; resetAt: number }>();
  function checkAnalyticsRateLimit(ip: string): boolean {
    const now = Date.now();
    const windowMs = 60000;
    const maxRequests = 30;
    const entry = analyticsRateLimit.get(ip);
    if (!entry || now > entry.resetAt) {
      analyticsRateLimit.set(ip, { count: 1, resetAt: now + windowMs });
      return true;
    }
    if (entry.count >= maxRequests) return false;
    entry.count++;
    return true;
  }

  app.post("/api/analytics/events", async (req, res) => {
    const clientIp = req.ip || req.socket.remoteAddress || "unknown";
    if (!checkAnalyticsRateLimit(clientIp)) {
      return res.status(429).json({ error: "Too many requests" });
    }
    try {
      const { events } = req.body;
      if (!Array.isArray(events) || events.length === 0) {
        return res.status(400).json({ error: "events array is required" });
      }
      if (events.length > 100) {
        return res.status(400).json({ error: "Maximum 100 events per request" });
      }
      const { insertAnalyticsEventSchema } = await import("@shared/schema");
      const validated = [];
      for (const e of events) {
        const parsed = insertAnalyticsEventSchema.safeParse(e);
        if (parsed.success) validated.push(parsed.data);
      }
      if (validated.length > 0) {
        storage.insertAnalyticsEvents(validated).catch(err => console.error("Analytics insert error:", err));
      }
      res.json({ accepted: validated.length });
    } catch (error) {
      console.error("Analytics events error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/analytics/summary", async (req, res) => {
    try {
      if (!await requireRole(req, "analytics")) return res.status(403).json({ error: "Forbidden" });
      const from = (req.query.from as string) || new Date(Date.now() - 7 * 86400000).toISOString().split("T")[0];
      const to = (req.query.to as string) || new Date().toISOString().split("T")[0];
      const page = req.query.page as string | undefined;
      const result = await storage.getAnalyticsSummary(from, to, page);
      res.json(result);
    } catch (error) {
      console.error("Analytics summary error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/analytics/top-elements", async (req, res) => {
    try {
      if (!await requireRole(req, "analytics")) return res.status(403).json({ error: "Forbidden" });
      const from = (req.query.from as string) || new Date(Date.now() - 7 * 86400000).toISOString().split("T")[0];
      const to = (req.query.to as string) || new Date().toISOString().split("T")[0];
      const page = req.query.page as string | undefined;
      const limit = parseInt(req.query.limit as string) || 20;
      const result = await storage.getTopElements(from, to, page, limit);
      res.json(result);
    } catch (error) {
      console.error("Analytics top-elements error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/analytics/page-stats", async (req, res) => {
    try {
      if (!await requireRole(req, "analytics")) return res.status(403).json({ error: "Forbidden" });
      const from = (req.query.from as string) || new Date(Date.now() - 7 * 86400000).toISOString().split("T")[0];
      const to = (req.query.to as string) || new Date().toISOString().split("T")[0];
      const result = await storage.getPageStats(from, to);
      res.json(result);
    } catch (error) {
      console.error("Analytics page-stats error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/analytics/live", async (req, res) => {
    try {
      if (!await requireRole(req, "analytics")) return res.status(403).json({ error: "Forbidden" });
      const count = await storage.getLiveSessionCount();
      res.json({ activeSessions: count });
    } catch (error) {
      console.error("Analytics live error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/analytics/aggregate", async (req, res) => {
    try {
      if (!await requireRole(req, "analytics")) return res.status(403).json({ error: "Forbidden" });
      const { date } = req.body;
      if (!date) return res.status(400).json({ error: "date is required (YYYY-MM-DD)" });
      await storage.aggregateDailySummary(date);
      res.json({ success: true, date });
    } catch (error) {
      console.error("Analytics aggregate error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/support-messages", async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      let uid: string | null = null;
      if (authHeader && authHeader.startsWith("Bearer ")) {
        uid = await verifyFirebaseToken(authHeader.slice(7));
      }

      const { type, name, email, phone, subject, message } = req.body;
      if (!type || !["support", "feedback"].includes(type)) {
        return res.status(400).json({ error: "Type must be 'support' or 'feedback'" });
      }
      if (!name || !email || !subject || !message) {
        return res.status(400).json({ error: "Name, email, subject, and message are required" });
      }

      const msg = await storage.createSupportMessage({
        type,
        odUserId: uid,
        name,
        email,
        phone: phone || null,
        subject,
        message,
      });
      res.status(201).json(msg);
    } catch (error) {
      console.error("Error creating support message:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/support-messages/me/:type", async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ error: "Authentication required" });
      }
      const uid = await verifyFirebaseToken(authHeader.slice(7));
      if (!uid) {
        return res.status(401).json({ error: "Invalid token" });
      }

      const { type } = req.params;
      if (!["support", "feedback"].includes(type)) {
        return res.status(400).json({ error: "Type must be 'support' or 'feedback'" });
      }
      const messages = await storage.listUserSupportMessages(uid, type);
      res.json(messages);
    } catch (error) {
      console.error("Error listing support messages:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/admin/support-messages", async (req, res) => {
    try {
      if (!(await requireRole(req, "support"))) return res.status(403).json({ error: "Admin access required" });
      const type = req.query.type as string | undefined;
      const status = req.query.status as string | undefined;
      const messages = await storage.listAllSupportMessages(
        type && ["support", "feedback"].includes(type) ? type : undefined,
        status && ["open", "replied"].includes(status) ? status : undefined,
      );
      res.json(messages);
    } catch (error) {
      console.error("Error listing all support messages:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.patch("/api/support-messages/:id/reply", async (req, res) => {
    try {
      if (!(await requireRole(req, "support"))) {
        return res.status(403).json({ error: "Admin access required" });
      }
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) return res.status(400).json({ error: "Invalid message ID" });

      const { reply } = req.body;
      if (!reply || typeof reply !== "string") {
        return res.status(400).json({ error: "Reply text is required" });
      }

      const msg = await storage.getSupportMessage(id);
      if (!msg) return res.status(404).json({ error: "Message not found" });

      const updated = await storage.replySupportMessage(id, reply);
      res.json(updated);
    } catch (error) {
      console.error("Error replying to support message:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/chat", async (req, res) => {
    try {
      const { message } = req.body;
      if (!message || typeof message !== "string") {
        return res.status(400).json({ error: "Message is required" });
      }

      const result = await handleChatMessage(message.trim());
      res.json(result);
    } catch (error) {
      console.error("Error in chat:", error);
      res.status(500).json({ error: "Failed to process message" });
    }
  });

  const QUIZ_ADMIN_UIDS = (process.env.QUIZ_ADMIN_UIDS || process.env.ANALYTICS_ADMIN_UIDS || "").split(",").map(s => s.trim()).filter(Boolean);

  async function isQuizAdmin(req: any): Promise<boolean> {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) return false;
    const token = authHeader.slice(7);
    const uid = await verifyFirebaseToken(token);
    if (!uid) return false;
    return QUIZ_ADMIN_UIDS.includes(uid);
  }

  function getISTDate(): string {
    return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
  }

  function computeStreak(sortedDatesDesc: string[]): number {
    if (sortedDatesDesc.length === 0) return 0;
    const today = getISTDate();
    const uniqueSorted = [...new Set(sortedDatesDesc)].sort().reverse();
    if (uniqueSorted[0] !== today && uniqueSorted[0] !== getPreviousDate(today)) return 0;
    let streak = 1;
    for (let i = 1; i < uniqueSorted.length; i++) {
      if (uniqueSorted[i] === getPreviousDate(uniqueSorted[i - 1])) {
        streak++;
      } else {
        break;
      }
    }
    return streak;
  }

  function getPreviousDate(dateStr: string): string {
    const d = new Date(dateStr + "T00:00:00Z");
    d.setUTCDate(d.getUTCDate() - 1);
    return d.toISOString().split("T")[0];
  }

  async function getFirebaseUid(req: any): Promise<string | null> {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) return null;
    const token = authHeader.slice(7);
    return verifyFirebaseToken(token);
  }

  app.get("/api/admin/quizzes", async (req, res) => {
    try {
      if (!await requireRole(req, "quiz")) return res.status(403).json({ error: "Forbidden" });
      const allQuizzes = await storage.listQuizzes();
      res.json(allQuizzes);
    } catch (error) {
      console.error("Error listing quizzes:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/admin/quiz-groups", async (req, res) => {
    try {
      if (!await requireRole(req, "quiz")) return res.status(403).json({ error: "Forbidden" });
      const allQuizzes = await storage.listQuizzes();
      const groups = [...new Set(allQuizzes.map(q => q.groupName).filter(Boolean))] as string[];
      groups.sort();
      res.json(groups);
    } catch (error) {
      console.error("Error listing quiz groups:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/admin/quizzes", async (req, res) => {
    try {
      if (!await requireRole(req, "quiz")) return res.status(403).json({ error: "Forbidden" });
      const quiz = await storage.createQuiz(req.body);
      res.json(quiz);
    } catch (error) {
      console.error("Error creating quiz:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.put("/api/admin/quizzes/:id", async (req, res) => {
    try {
      if (!await requireRole(req, "quiz")) return res.status(403).json({ error: "Forbidden" });
      const quiz = await storage.updateQuiz(Number(req.params.id), req.body);
      if (!quiz) return res.status(404).json({ error: "Quiz not found" });
      res.json(quiz);
    } catch (error) {
      console.error("Error updating quiz:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.delete("/api/admin/quizzes/:id", async (req, res) => {
    try {
      if (!await requireRole(req, "quiz")) return res.status(403).json({ error: "Forbidden" });
      await storage.deleteQuiz(Number(req.params.id));
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting quiz:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/admin/quizzes/:id", async (req, res) => {
    try {
      if (!await requireRole(req, "quiz")) return res.status(403).json({ error: "Forbidden" });
      const quiz = await storage.getQuizById(Number(req.params.id));
      if (!quiz) return res.status(404).json({ error: "Quiz not found" });
      const questions = await storage.getQuestionsByQuizId(quiz.id);
      res.json({ ...quiz, questions });
    } catch (error) {
      console.error("Error getting quiz:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/admin/quizzes/:id/questions", async (req, res) => {
    try {
      if (!await requireRole(req, "quiz")) return res.status(403).json({ error: "Forbidden" });
      const question = await storage.createQuestion({ ...req.body, quizId: Number(req.params.id) });
      res.json(question);
    } catch (error) {
      console.error("Error creating question:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.put("/api/admin/questions/:id", async (req, res) => {
    try {
      if (!await requireRole(req, "quiz")) return res.status(403).json({ error: "Forbidden" });
      const question = await storage.updateQuestion(Number(req.params.id), req.body);
      if (!question) return res.status(404).json({ error: "Question not found" });
      res.json(question);
    } catch (error) {
      console.error("Error updating question:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.delete("/api/admin/questions/:id", async (req, res) => {
    try {
      if (!await requireRole(req, "quiz")) return res.status(403).json({ error: "Forbidden" });
      await storage.deleteQuestion(Number(req.params.id));
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting question:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.put("/api/admin/quizzes/:id/questions/bulk", async (req, res) => {
    try {
      if (!await requireRole(req, "quiz")) return res.status(403).json({ error: "Forbidden" });
      const quizId = Number(req.params.id);
      const { questions } = req.body;
      if (!Array.isArray(questions)) return res.status(400).json({ error: "questions array required" });
      await storage.deleteQuestionsByQuizId(quizId);
      const created = [];
      for (const q of questions) {
        const question = await storage.createQuestion({ ...q, quizId });
        created.push(question);
      }
      res.json(created);
    } catch (error) {
      console.error("Error bulk updating questions:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/admin/quiz-analytics/summary", async (req, res) => {
    try {
      if (!await requireRole(req, "quiz")) return res.status(403).json({ error: "Forbidden" });
      const summary = await storage.getQuizAnalyticsSummary();
      res.json(summary);
    } catch (error) {
      console.error("Error fetching quiz analytics summary:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/admin/quiz-analytics/per-quiz", async (req, res) => {
    try {
      if (!await requireRole(req, "quiz")) return res.status(403).json({ error: "Forbidden" });
      const perQuiz = await storage.getQuizAnalyticsPerQuiz();
      res.json(perQuiz);
    } catch (error) {
      console.error("Error fetching per-quiz analytics:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/admin/quiz-analytics/attempts", async (req, res) => {
    try {
      if (!await requireRole(req, "quiz")) return res.status(403).json({ error: "Forbidden" });
      const page = Math.max(1, Number(req.query.page) || 1);
      const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 25));
      const result = await storage.getQuizAnalyticsAttempts(page, limit);
      res.json(result);
    } catch (error) {
      console.error("Error fetching quiz attempts:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/quiz/upcoming", async (req, res) => {
    try {
      const today = getISTDate();
      const allQuizzes = await storage.listQuizzes();
      const upcoming = allQuizzes
        .filter(q => q.isActive && q.publishDate > today && q.showInUpcoming)
        .sort((a, b) => a.publishDate.localeCompare(b.publishDate));
      res.json(upcoming.map(q => ({
        id: q.id,
        title: q.title,
        subtitle: q.subtitle,
        publishDate: q.publishDate,
        groupName: q.groupName,
        episodeNumber: q.episodeNumber,
      })));
    } catch (error) {
      console.error("Error getting upcoming quizzes:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/quiz/group/:groupName", async (req, res) => {
    try {
      const auth = await getFirebaseUidAndEmail(req);
      if (!auth) return res.status(401).json({ error: "Authentication required" });
      const { uid, email } = auth;
      const groupName = decodeURIComponent(req.params.groupName);
      const isDemo = isDemoEmail(email);
      const allQuizzes = await storage.listQuizzes();
      const groupQuizzes = allQuizzes
        .filter(q => q.isActive && q.groupName === groupName)
        .sort((a, b) => (a.episodeNumber ?? 0) - (b.episodeNumber ?? 0));
      if (groupQuizzes.length === 0) return res.json([]);
      const today = getISTDate();
      const results = [];
      for (const q of groupQuizzes) {
        const questions = await storage.getQuestionsByQuizId(q.id);
        const attempt = await storage.getAttemptByUserAndQuiz(uid, q.id);
        const lockCheck = await checkGroupLock(q, uid, isDemo);
        const isFuture = !isDemo && q.publishDate > today;
        results.push({
          id: q.id,
          title: q.title,
          subtitle: q.subtitle,
          publishDate: q.publishDate,
          episodeNumber: q.episodeNumber,
          questionCount: questions.length,
          attempted: !!attempt,
          score: attempt?.score ?? null,
          totalQuestions: attempt?.totalQuestions ?? null,
          locked: lockCheck.locked || isFuture,
          lockReason: isFuture ? `Available on ${new Date(q.publishDate + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short" })}` : lockCheck.reason || null,
          prerequisiteEpisodeId: lockCheck.prerequisiteEpisodeId ?? null,
          prerequisiteEpisodeNumber: lockCheck.prerequisiteEpisodeNumber ?? null,
        });
      }
      res.json(results);
    } catch (error) {
      console.error("Error getting group episodes:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/quiz/courses", async (req, res) => {
    try {
      const uid = await getFirebaseUid(req);
      if (!uid) return res.status(401).json({ error: "Authentication required" });
      const allQuizzes = await storage.listQuizzes();
      const today = getISTDate();
      const grouped = new Map<string, typeof allQuizzes>();
      for (const q of allQuizzes) {
        if (!q.isActive || !q.groupName) continue;
        if (!grouped.has(q.groupName)) grouped.set(q.groupName, []);
        grouped.get(q.groupName)!.push(q);
      }
      const courses = [];
      for (const [groupName, quizzes] of grouped) {
        quizzes.sort((a, b) => (a.episodeNumber ?? 0) - (b.episodeNumber ?? 0));
        const published = quizzes.filter(q => q.publishDate <= today);
        let completedCount = 0;
        let nextEpisodeTitle: string | null = null;
        for (const q of published) {
          const attempt = await storage.getAttemptByUserAndQuiz(uid, q.id);
          if (attempt) {
            completedCount++;
          } else if (!nextEpisodeTitle) {
            nextEpisodeTitle = q.title;
          }
        }
        courses.push({
          groupName,
          totalEpisodes: quizzes.length,
          publishedEpisodes: published.length,
          completedEpisodes: completedCount,
          nextEpisodeTitle,
          latestEpisodeNumber: quizzes[quizzes.length - 1]?.episodeNumber ?? null,
        });
      }
      courses.sort((a, b) => a.groupName.localeCompare(b.groupName));
      res.json(courses);
    } catch (error) {
      console.error("Error getting courses:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  async function checkGroupLock(quiz: any, uid: string, isDemo: boolean = false): Promise<{ locked: boolean; reason?: string; prerequisiteEpisodeId?: number; prerequisiteEpisodeNumber?: number }> {
    if (isDemo) return { locked: false };
    if (!quiz.groupName || !quiz.episodeNumber || quiz.episodeNumber <= 1) {
      return { locked: false };
    }
    const allQuizzes = await storage.listQuizzes();
    const prevEpisode = allQuizzes.find(q =>
      q.isActive && q.groupName === quiz.groupName && q.episodeNumber === quiz.episodeNumber - 1
    );
    if (!prevEpisode) return { locked: false };
    const prevAttempt = await storage.getAttemptByUserAndQuiz(uid, prevEpisode.id);
    if (!prevAttempt) {
      return { locked: true, reason: `Complete Episode ${quiz.episodeNumber - 1} first`, prerequisiteEpisodeId: prevEpisode.id, prerequisiteEpisodeNumber: quiz.episodeNumber - 1 };
    }
    return { locked: false };
  }

  app.get("/api/quiz/by-id/:id", async (req, res) => {
    try {
      const auth = await getFirebaseUidAndEmail(req);
      if (!auth) return res.status(401).json({ error: "Authentication required" });
      const { uid, email } = auth;
      const quizId = Number(req.params.id);
      const quiz = await storage.getQuizById(quizId);
      if (!quiz || !quiz.isActive) return res.status(404).json({ error: "Quiz not found" });

      const isDemo = isDemoEmail(email);
      const lockCheck = await checkGroupLock(quiz, uid, isDemo);
      if (lockCheck.locked) {
        return res.json({
          id: quiz.id,
          title: quiz.title,
          subtitle: quiz.subtitle,
          description: quiz.description,
          publishDate: quiz.publishDate,
          groupName: quiz.groupName,
          episodeNumber: quiz.episodeNumber,
          locked: true,
          lockReason: lockCheck.reason,
          prerequisiteEpisodeId: lockCheck.prerequisiteEpisodeId ?? null,
          prerequisiteEpisodeNumber: lockCheck.prerequisiteEpisodeNumber ?? null,
          questions: [],
          attempt: null,
        });
      }

      const questions = await storage.getQuestionsByQuizId(quiz.id);
      const attempt = await storage.getAttemptByUserAndQuiz(uid, quiz.id);
      const mappedQuestions = questions.map(q => ({
        id: q.id,
        questionText: q.questionText,
        options: attempt
          ? q.options as { text: string; isCorrect: boolean }[]
          : (q.options as { text: string; isCorrect: boolean }[]).map((o) => ({ text: o.text })),
        correctCount: q.correctCount,
        sortOrder: q.sortOrder,
      }));
      res.json({
        id: quiz.id,
        title: quiz.title,
        subtitle: quiz.subtitle,
        description: quiz.description,
        videoUrl: quiz.videoUrl,
        audioUrl: quiz.audioUrl,
        imageUrls: quiz.imageUrls,
        publishDate: quiz.publishDate,
        groupName: quiz.groupName,
        episodeNumber: quiz.episodeNumber,
        questions: mappedQuestions,
        attempt: attempt ? { score: attempt.score, totalQuestions: attempt.totalQuestions, answers: attempt.answers, completedAt: attempt.completedAt } : null,
      });
    } catch (error) {
      console.error("Error getting quiz by id:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/quiz/past", async (req, res) => {
    try {
      const auth = await getFirebaseUidAndEmail(req);
      if (!auth) return res.status(401).json({ error: "Authentication required" });
      const { uid, email } = auth;
      const isDemo = isDemoEmail(email);
      const today = getISTDate();
      const allQuizzes = await storage.listQuizzes();
      const pastQuizzes = allQuizzes.filter(q => q.isActive && q.publishDate < today);
      const results = [];
      for (const q of pastQuizzes) {
        const questions = await storage.getQuestionsByQuizId(q.id);
        const attempt = await storage.getAttemptByUserAndQuiz(uid, q.id);
        const lockCheck = await checkGroupLock(q, uid, isDemo);
        results.push({
          id: q.id,
          title: q.title,
          subtitle: q.subtitle,
          publishDate: q.publishDate,
          questionCount: questions.length,
          attempted: !!attempt,
          score: attempt?.score ?? null,
          totalQuestions: attempt?.totalQuestions ?? null,
          groupName: q.groupName,
          episodeNumber: q.episodeNumber,
          locked: lockCheck.locked,
          lockReason: lockCheck.reason || null,
          prerequisiteEpisodeId: lockCheck.prerequisiteEpisodeId ?? null,
          prerequisiteEpisodeNumber: lockCheck.prerequisiteEpisodeNumber ?? null,
        });
      }
      res.json(results);
    } catch (error) {
      console.error("Error getting past quizzes:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/quiz/today", async (req, res) => {
    try {
      const auth = await getFirebaseUidAndEmail(req);
      if (!auth) return res.status(401).json({ error: "Authentication required" });
      const { uid, email } = auth;
      const today = getISTDate();
      let quiz = await storage.getQuizByDate(today);
      if (!quiz) {
        const allQuizzes = await storage.listQuizzes();
        const pastActive = allQuizzes
          .filter(q => q.isActive && q.publishDate <= today)
          .sort((a, b) => b.publishDate.localeCompare(a.publishDate));
        quiz = pastActive[0] || null;
      }
      if (!quiz) return res.json(null);

      const isDemo = isDemoEmail(email);
      const lockCheck = await checkGroupLock(quiz, uid, isDemo);
      if (lockCheck.locked) {
        return res.json({
          id: quiz.id,
          title: quiz.title,
          subtitle: quiz.subtitle,
          description: quiz.description,
          publishDate: quiz.publishDate,
          groupName: quiz.groupName,
          episodeNumber: quiz.episodeNumber,
          locked: true,
          lockReason: lockCheck.reason,
          prerequisiteEpisodeId: lockCheck.prerequisiteEpisodeId ?? null,
          prerequisiteEpisodeNumber: lockCheck.prerequisiteEpisodeNumber ?? null,
          questions: [],
          attempt: null,
        });
      }

      const questions = await storage.getQuestionsByQuizId(quiz.id);
      const attempt = await storage.getAttemptByUserAndQuiz(uid, quiz.id);
      const mappedQuestions = questions.map(q => ({
        id: q.id,
        questionText: q.questionText,
        options: attempt
          ? q.options as { text: string; isCorrect: boolean }[]
          : (q.options as { text: string; isCorrect: boolean }[]).map((o) => ({ text: o.text })),
        correctCount: q.correctCount,
        sortOrder: q.sortOrder,
      }));
      res.json({
        id: quiz.id,
        title: quiz.title,
        subtitle: quiz.subtitle,
        description: quiz.description,
        videoUrl: quiz.videoUrl,
        audioUrl: quiz.audioUrl,
        imageUrls: quiz.imageUrls,
        publishDate: quiz.publishDate,
        groupName: quiz.groupName,
        episodeNumber: quiz.episodeNumber,
        questions: mappedQuestions,
        attempt: attempt ? { score: attempt.score, totalQuestions: attempt.totalQuestions, answers: attempt.answers, completedAt: attempt.completedAt } : null,
      });
    } catch (error) {
      console.error("Error getting today's quiz:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/quiz/:id/submit", async (req, res) => {
    try {
      const auth = await getFirebaseUidAndEmail(req);
      if (!auth) return res.status(401).json({ error: "Authentication required" });
      const { uid, email } = auth;
      const quizId = Number(req.params.id);
      const { answers } = req.body;
      if (!answers || typeof answers !== "object") return res.status(400).json({ error: "answers required" });

      const quiz = await storage.getQuizById(quizId);
      if (!quiz || !quiz.isActive) return res.status(403).json({ error: "Quiz not available for submission" });

      const isDemo = isDemoEmail(email);
      const lockCheck = await checkGroupLock(quiz, uid, isDemo);
      if (lockCheck.locked) {
        return res.status(403).json({ error: "locked", reason: lockCheck.reason });
      }

      const existing = await storage.getAttemptByUserAndQuiz(uid, quizId);
      if (existing) return res.status(409).json({ error: "Already submitted", attempt: existing });
      const questions = await storage.getQuestionsByQuizId(quizId);
      if (questions.length === 0) return res.status(404).json({ error: "Quiz not found" });
      let score = 0;
      for (const q of questions) {
        const userAnswers: number[] = answers[String(q.id)] || [];
        const correctIndices = (q.options as { text: string; isCorrect: boolean }[]).map((o, i) => o.isCorrect ? i : -1).filter((i) => i !== -1);
        if (userAnswers.length === correctIndices.length && correctIndices.every((ci: number) => userAnswers.includes(ci))) {
          score++;
        }
      }
      const attempt = await storage.saveAttempt({
        odUserId: uid,
        quizId,
        score,
        totalQuestions: questions.length,
        answers,
      });

      const newBadges: string[] = [];
      try {
        const existingBadges = await storage.getUserBadges(uid);
        const earned = new Set(existingBadges.map(b => b.badgeId));

        if (!earned.has("first_steps")) {
          const b = await storage.awardBadge(uid, "first_steps");
          if (b) newBadges.push("first_steps");
        }

        if (!earned.has("perfect_score") && score === questions.length) {
          const b = await storage.awardBadge(uid, "perfect_score");
          if (b) newBadges.push("perfect_score");
        }

        const [attemptDates, totalAttempted] = await Promise.all([
          storage.getUserAttemptDates(uid),
          storage.getUserAttemptCount(uid),
        ]);

        if (!earned.has("quiz_explorer") && totalAttempted >= 10) {
          const b = await storage.awardBadge(uid, "quiz_explorer");
          if (b) newBadges.push("quiz_explorer");
        }
        if (!earned.has("knowledge_seeker") && totalAttempted >= 25) {
          const b = await storage.awardBadge(uid, "knowledge_seeker");
          if (b) newBadges.push("knowledge_seeker");
        }

        const uniqueDates = [...new Set(attemptDates)];
        const streak = computeStreak(uniqueDates);
        if (!earned.has("week_warrior") && streak >= 7) {
          const b = await storage.awardBadge(uid, "week_warrior");
          if (b) newBadges.push("week_warrior");
        }
        if (!earned.has("fortnight_scholar") && streak >= 14) {
          const b = await storage.awardBadge(uid, "fortnight_scholar");
          if (b) newBadges.push("fortnight_scholar");
        }
        if (!earned.has("month_master") && streak >= 30) {
          const b = await storage.awardBadge(uid, "month_master");
          if (b) newBadges.push("month_master");
        }
      } catch (badgeErr) {
        console.error("Error awarding badges:", badgeErr);
      }

      const questionsWithCorrect = questions.map(q => ({
        id: q.id,
        questionText: q.questionText,
        options: q.options,
        correctCount: q.correctCount,
        sortOrder: q.sortOrder,
      }));
      res.json({ attempt, questions: questionsWithCorrect, newBadges });
    } catch (error: any) {
      if (error?.code === "23505") {
        return res.status(409).json({ error: "Already submitted" });
      }
      console.error("Error submitting quiz:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/quiz/:id/review", async (req, res) => {
    try {
      const uid = await getFirebaseUid(req);
      if (!uid) return res.status(401).json({ error: "Authentication required" });
      const quizId = Number(req.params.id);
      const attempt = await storage.getAttemptByUserAndQuiz(uid, quizId);
      if (!attempt) return res.status(403).json({ error: "Quiz not attempted" });
      const quiz = await storage.getQuizById(quizId);
      if (!quiz) return res.status(404).json({ error: "Quiz not found" });
      const questions = await storage.getQuestionsByQuizId(quizId);
      res.json({
        id: quiz.id,
        title: quiz.title,
        subtitle: quiz.subtitle,
        description: quiz.description,
        videoUrl: quiz.videoUrl,
        audioUrl: quiz.audioUrl,
        imageUrls: quiz.imageUrls,
        publishDate: quiz.publishDate,
        questions: questions.map(q => ({
          id: q.id,
          questionText: q.questionText,
          options: q.options,
          correctCount: q.correctCount,
          sortOrder: q.sortOrder,
        })),
        attempt: { score: attempt.score, totalQuestions: attempt.totalQuestions, answers: attempt.answers, completedAt: attempt.completedAt },
      });
    } catch (error) {
      console.error("Error getting quiz review:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/quiz/history", async (req, res) => {
    try {
      const uid = await getFirebaseUid(req);
      if (!uid) return res.status(401).json({ error: "Authentication required" });
      const history = await storage.getUserAttemptHistory(uid);
      res.json(history);
    } catch (error) {
      console.error("Error getting quiz history:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/quiz/gamification", async (req, res) => {
    try {
      const uid = await getFirebaseUid(req);
      if (!uid) return res.status(401).json({ error: "Authentication required" });

      const [badges, attemptDates, hasPerfect, totalAttempted] = await Promise.all([
        storage.getUserBadges(uid),
        storage.getUserAttemptDates(uid),
        storage.hasUserPerfectScore(uid),
        storage.getUserAttemptCount(uid),
      ]);

      const uniqueDates = [...new Set(attemptDates)];
      const currentStreak = computeStreak(uniqueDates);
      const earnedSet = new Set(badges.map(b => b.badgeId));

      const badgeDefs = [
        { id: "first_steps", check: totalAttempted >= 1 },
        { id: "perfect_score", check: hasPerfect },
        { id: "week_warrior", check: currentStreak >= 7 },
        { id: "fortnight_scholar", check: currentStreak >= 14 },
        { id: "month_master", check: currentStreak >= 30 },
        { id: "quiz_explorer", check: totalAttempted >= 10 },
        { id: "knowledge_seeker", check: totalAttempted >= 25 },
      ];
      for (const def of badgeDefs) {
        if (def.check && !earnedSet.has(def.id)) {
          const b = await storage.awardBadge(uid, def.id);
          if (b) {
            earnedSet.add(def.id);
            badges.push(b);
          }
        }
      }

      const allBadges = [
        { id: "first_steps", name: "First Steps", description: "Complete your first quiz", emoji: "👣", progress: Math.min(totalAttempted, 1), target: 1 },
        { id: "perfect_score", name: "Perfect Score", description: "Score 100% on any quiz", emoji: "💯", progress: hasPerfect ? 1 : 0, target: 1 },
        { id: "week_warrior", name: "Week Warrior", description: "7-day streak", emoji: "🔥", progress: Math.min(currentStreak, 7), target: 7 },
        { id: "fortnight_scholar", name: "Fortnight Scholar", description: "14-day streak", emoji: "📚", progress: Math.min(currentStreak, 14), target: 14 },
        { id: "month_master", name: "Month Master", description: "30-day streak", emoji: "🏆", progress: Math.min(currentStreak, 30), target: 30 },
        { id: "quiz_explorer", name: "Quiz Explorer", description: "Attempt 10 quizzes", emoji: "🧭", progress: Math.min(totalAttempted, 10), target: 10 },
        { id: "knowledge_seeker", name: "Knowledge Seeker", description: "Attempt 25 quizzes", emoji: "🎓", progress: Math.min(totalAttempted, 25), target: 25 },
      ].map(b => ({
        ...b,
        earned: earnedSet.has(b.id),
        earnedAt: badges.find(eb => eb.badgeId === b.id)?.earnedAt || null,
      }));

      res.json({
        currentStreak,
        totalAttempted,
        badges: allBadges,
      });
    } catch (error) {
      console.error("Error getting gamification data:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.delete("/api/account", async (req, res) => {
    try {
      const uid = await getFirebaseUid(req);
      if (!uid) return res.status(401).json({ error: "Authentication required" });
      await storage.deleteUserData(uid);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting account data:", error);
      res.status(500).json({ error: "Failed to delete account data" });
    }
  });


  app.get("/api/admin/my-roles", async (req, res) => {
    try {
      const { uid, roles } = await getUidAndAdminRoles(req);
      if (!uid) return res.status(401).json({ error: "Unauthorized" });
      res.json({ roles });
    } catch (error) {
      console.error("Error fetching my roles:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/admin/roles", async (req, res) => {
    try {
      if (!await requireRole(req, "super_admin")) return res.status(403).json({ error: "Forbidden" });
      const allRoles = await storage.listAllAdminRoles();
      res.json(allRoles);
    } catch (error) {
      console.error("Error listing admin roles:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/admin/roles", async (req, res) => {
    try {
      if (!await requireRole(req, "super_admin")) return res.status(403).json({ error: "Forbidden" });
      const { uid: grantedByUid } = await getUidAndAdminRoles(req);
      const { firebaseUid, email, role } = req.body;
      if (!firebaseUid || typeof firebaseUid !== "string") return res.status(400).json({ error: "firebaseUid is required" });
      if (!email || typeof email !== "string") return res.status(400).json({ error: "email is required" });
      const validRoles = ["super_admin", "accounts", "support", "quiz", "analytics"];
      if (!validRoles.includes(role)) return res.status(400).json({ error: "Invalid role" });
      const row = await storage.grantAdminRole(firebaseUid, email, role, grantedByUid!);
      res.status(201).json(row);
    } catch (error) {
      console.error("Error granting admin role:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.delete("/api/admin/roles/:id", async (req, res) => {
    try {
      if (!await requireRole(req, "super_admin")) return res.status(403).json({ error: "Forbidden" });
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });
      await storage.revokeAdminRole(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error revoking admin role:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  return httpServer;
}
