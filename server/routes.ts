import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { initializeApp as initializeFirebaseApp, getApps } from "firebase/app";
import { getFirestore, collection, getDocs, query, orderBy, limit, where, Timestamp } from "firebase/firestore";
import { handleChatMessage, setEventsCache, setAnnouncementsCache } from "./chatbot";
import { createRequire } from "module";
const _require = createRequire(typeof __filename !== 'undefined' ? __filename : import.meta.url);
const PaytmChecksum = _require("paytmchecksum");

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  const SRINGERI_API_URL = process.env.VITE_SRINGERI_API_URL || "https://dsspv2.lcpl.in";
  const SRINGERI_API_KEY = process.env.SRINGERI_API_KEY;

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

  app.get("/api/onlineDevotee/:uid", async (req, res) => {
    try {
      const { uid } = req.params;
      
      if (!uid) {
        return res.status(400).json({ error: "User ID is required" });
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
    { videoId: "QbMGP6jKVZo", title: "Sri Sringeri Sharada Peetham", published: "2026-03-10" },
    { videoId: "UgwWvDwTWfc", title: "Saraswathi Puja at Shree Sharada Vidyaniketan School | Sri Sharada Krupa", published: "2026-03-10" },
  ].map(v => ({
    ...v,
    date: v.published ? new Date(v.published).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : null,
    thumbnail: `https://i.ytimg.com/vi/${v.videoId}/mqdefault.jpg`,
    url: `https://www.youtube.com/watch?v=${v.videoId}`,
  }));

  app.get("/api/youtube-videos", async (req, res) => {
    try {
      if (ytCache.videos.length > 0 && Date.now() - ytCache.timestamp < YT_CACHE_TTL) {
        return res.json({ videos: ytCache.videos });
      }

      const channelId = "UCC7AKcYvtFdlubqwW6Ave2Q";
      let videos: any[] = [];

      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000);
        let pageRes;
        try {
          pageRes = await fetch(`https://www.youtube.com/@SharadaPeetham/videos`, {
            headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" },
            signal: controller.signal,
          });
        } finally {
          clearTimeout(timeout);
        }
        if (pageRes.ok) {
          const html = await pageRes.text();
          const dataMatch = html.match(/var ytInitialData = ({[\s\S]*?});<\/script>/);
          if (dataMatch) {
            const data = JSON.parse(dataMatch[1]);
            const found: any[] = [];
            const seen = new Set<string>();
            const findVideos = (obj: any): void => {
              if (!obj || typeof obj !== 'object') return;
              if (obj.videoId && obj.title && !seen.has(obj.videoId)) {
                seen.add(obj.videoId);
                const title = obj.title?.runs?.[0]?.text || obj.title?.simpleText || "";
                const pub = obj.publishedTimeText?.simpleText || "";
                found.push({ videoId: obj.videoId, title, published: pub });
                return;
              }
              for (const v of Object.values(obj)) findVideos(v);
            };
            findVideos(data);
            for (const v of found.slice(0, 10)) {
              videos.push({
                videoId: v.videoId,
                title: v.title,
                published: v.published,
                date: v.published || null,
                thumbnail: `https://i.ytimg.com/vi/${v.videoId}/mqdefault.jpg`,
                url: `https://www.youtube.com/watch?v=${v.videoId}`,
              });
            }
            if (videos.length > 0) {
              console.log(`[YouTube] Channel page scrape succeeded: ${videos.length} videos found`);
            } else {
              console.log("[YouTube] Channel page scrape returned data but parsed 0 videos");
            }
          } else {
            console.log("[YouTube] Channel page scrape: no ytInitialData found in response");
          }
        } else {
          console.log(`[YouTube] Channel page scrape returned HTTP ${pageRes.status}`);
        }
      } catch (scrapeErr) {
        console.log(`[YouTube] Channel page scrape failed: ${String(scrapeErr)}`);
      }

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
      const PAYTM_MID_VAL = process.env.PAYTM_MID;
      const PAYTM_KEY_VAL = process.env.PAYTM_MERCHANT_KEY;

      if (!PAYTM_MID_VAL || !PAYTM_KEY_VAL) {
        return res.status(500).json({ error: "Paytm credentials not configured" });
      }

      const { reservedDate, mobileNumber, email, occupantName1, occupantAge1,
              occupantIdType1, occupantIdNumber1, occupantName2, occupantAge2,
              occupantIdType2, occupantIdNumber2, roomCount, rent, deposit,
              inventoryId, uid, filter } = req.body;

      const totalAmount = Number(rent || 0) + Number(deposit || 0);
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
          callbackUrl: `https://securegw.paytm.in/theia/paytmCallback?ORDER_ID=${orderId}`,
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
        rent: rent || 0,
        deposit: deposit || 0,
        inventoryId: inventoryId,
        uid: uid || "",
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

      let sringeriData: any = null;
      try {
        const jsonStart = sringeriResText.indexOf("{");
        if (jsonStart !== -1) {
          sringeriData = JSON.parse(sringeriResText.substring(jsonStart));
        } else {
          sringeriData = JSON.parse(sringeriResText);
        }
      } catch {}

      if (sringeriData && (sringeriData.error || sringeriData.status === "Failed" || sringeriData.status === "Error")) {
        console.error("Sringeri onlineReservationPtm returned error in body:", JSON.stringify(sringeriData));
        return res.status(502).json({ error: "Reservation registration failed", details: sringeriData.message || sringeriData.error || "Server rejected the reservation." });
      }

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

  const featuredCache: { data: any[]; timestamp: number } = { data: [], timestamp: 0 };
  const FEATURED_CACHE_TTL = 30 * 60 * 1000;

  app.get("/api/featuredDonations", async (req, res) => {
    try {
      if (featuredCache.data.length > 0 && Date.now() - featuredCache.timestamp < FEATURED_CACHE_TTL) {
        return res.json(featuredCache.data);
      }

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

      featuredCache.data = featured;
      featuredCache.timestamp = Date.now();
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

      res.json(data);
    } catch (error) {
      console.error("Error fetching calendar types:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/tithis", async (req, res) => {
    try {
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

      res.json(data);
    } catch (error) {
      console.error("Error fetching tithis:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/chandraMasas", async (req, res) => {
    try {
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

      res.json(data);
    } catch (error) {
      console.error("Error fetching chandra masas:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/souraMasas", async (req, res) => {
    try {
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

      res.json(data);
    } catch (error) {
      console.error("Error fetching soura masas:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/nakshatras", async (req, res) => {
    try {
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

      res.json(data);
    } catch (error) {
      console.error("Error fetching nakshatras:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/devoteeKarta/:uid", async (req, res) => {
    try {
      const { uid } = req.params;
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
          callbackUrl: `https://securegw.paytm.in/theia/paytmCallback?ORDER_ID=${orderId}`,
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

      let sringeriData: any = null;
      try {
        const jsonStart = sringeriResText.indexOf("{");
        if (jsonStart !== -1) {
          sringeriData = JSON.parse(sringeriResText.substring(jsonStart));
        } else {
          sringeriData = JSON.parse(sringeriResText);
        }
      } catch {}

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

      res.json(data);
    } catch (error) {
      console.error("Error fetching rashis:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/transliterate", async (req, res) => {
    try {
      const text = (req.query.text as string || "").trim().slice(0, 200);
      const lang = "kn";
      if (!text) return res.json({ transliteration: "" });

      const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=${encodeURIComponent(lang)}&dt=t&q=${encodeURIComponent(text)}`;
      const response = await fetch(url);
      if (!response.ok) return res.json({ transliteration: "" });

      const data = await response.json();
      const translated = Array.isArray(data) && Array.isArray(data[0])
        ? data[0].map((s: any) => (Array.isArray(s) ? s[0] : "")).join("")
        : "";
      res.json({ transliteration: translated });
    } catch (error) {
      console.error("Transliteration error:", error);
      res.json({ transliteration: "" });
    }
  });

  app.get("/api/postageOptions", async (req, res) => {
    try {
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

      res.json(data);
    } catch (error) {
      console.error("Error fetching postage options:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/recurrenceTypes", async (req, res) => {
    try {
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
          callbackUrl: `https://securegw.paytm.in/theia/paytmCallback?ORDER_ID=${orderId}`,
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
      const response = await fetch(`${SRINGERI_API_URL}/api/newReceiptFl`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(SRINGERI_API_KEY && { "X-API-Key": SRINGERI_API_KEY }),
        },
        body: JSON.stringify(req.body),
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

  app.post("/api/paymentAck", async (req, res) => {
    try {
      console.log("paymentAck request body:", JSON.stringify(req.body));

      const response = await fetch(`${SRINGERI_API_URL}/api/paymentAck`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(SRINGERI_API_KEY && { "X-API-Key": SRINGERI_API_KEY }),
        },
        body: JSON.stringify(req.body),
      });

      const text = await response.text();
      console.log("paymentAck Sringeri response:", response.status, text);

      if (!response.ok) {
        return res.status(response.status).json({ error: "Failed to acknowledge payment" });
      }

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
      console.error("Error acknowledging payment:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  const ADMIN_UIDS = (process.env.ANALYTICS_ADMIN_UIDS || "").split(",").map(s => s.trim()).filter(Boolean);

  const firebaseAdmin = await import("firebase-admin");
  if (!firebaseAdmin.default.apps.length) {
    firebaseAdmin.default.initializeApp({
      projectId: process.env.VITE_FIREBASE_PROJECT_ID || process.env.SRINGERI_NET_FIREBASE_PROJECT_ID || undefined,
    });
  }
  const adminAuth = firebaseAdmin.default.auth();

  async function verifyFirebaseToken(idToken: string): Promise<string | null> {
    try {
      const decoded = await adminAuth.verifyIdToken(idToken);
      return decoded.uid;
    } catch {
      return null;
    }
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
      if (!await isAdmin(req)) return res.status(403).json({ error: "Forbidden" });
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
      if (!await isAdmin(req)) return res.status(403).json({ error: "Forbidden" });
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
      if (!await isAdmin(req)) return res.status(403).json({ error: "Forbidden" });
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
      if (!await isAdmin(req)) return res.status(403).json({ error: "Forbidden" });
      const count = await storage.getLiveSessionCount();
      res.json({ activeSessions: count });
    } catch (error) {
      console.error("Analytics live error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/analytics/aggregate", async (req, res) => {
    try {
      if (!await isAdmin(req)) return res.status(403).json({ error: "Forbidden" });
      const { date } = req.body;
      if (!date) return res.status(400).json({ error: "date is required (YYYY-MM-DD)" });
      await storage.aggregateDailySummary(date);
      res.json({ success: true, date });
    } catch (error) {
      console.error("Analytics aggregate error:", error);
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

  async function getFirebaseUid(req: any): Promise<string | null> {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) return null;
    const token = authHeader.slice(7);
    return verifyFirebaseToken(token);
  }

  app.get("/api/admin/quizzes", async (req, res) => {
    try {
      if (!await isQuizAdmin(req)) return res.status(403).json({ error: "Forbidden" });
      const allQuizzes = await storage.listQuizzes();
      res.json(allQuizzes);
    } catch (error) {
      console.error("Error listing quizzes:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/admin/quizzes", async (req, res) => {
    try {
      if (!await isQuizAdmin(req)) return res.status(403).json({ error: "Forbidden" });
      const quiz = await storage.createQuiz(req.body);
      res.json(quiz);
    } catch (error) {
      console.error("Error creating quiz:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.put("/api/admin/quizzes/:id", async (req, res) => {
    try {
      if (!await isQuizAdmin(req)) return res.status(403).json({ error: "Forbidden" });
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
      if (!await isQuizAdmin(req)) return res.status(403).json({ error: "Forbidden" });
      await storage.deleteQuiz(Number(req.params.id));
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting quiz:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/admin/quizzes/:id", async (req, res) => {
    try {
      if (!await isQuizAdmin(req)) return res.status(403).json({ error: "Forbidden" });
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
      if (!await isQuizAdmin(req)) return res.status(403).json({ error: "Forbidden" });
      const question = await storage.createQuestion({ ...req.body, quizId: Number(req.params.id) });
      res.json(question);
    } catch (error) {
      console.error("Error creating question:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.put("/api/admin/questions/:id", async (req, res) => {
    try {
      if (!await isQuizAdmin(req)) return res.status(403).json({ error: "Forbidden" });
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
      if (!await isQuizAdmin(req)) return res.status(403).json({ error: "Forbidden" });
      await storage.deleteQuestion(Number(req.params.id));
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting question:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.put("/api/admin/quizzes/:id/questions/bulk", async (req, res) => {
    try {
      if (!await isQuizAdmin(req)) return res.status(403).json({ error: "Forbidden" });
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

  app.get("/api/quiz/today", async (req, res) => {
    try {
      const today = new Date().toISOString().split("T")[0];
      const quiz = await storage.getQuizByDate(today);
      if (!quiz) return res.json(null);
      const questions = await storage.getQuestionsByQuizId(quiz.id);
      const safeQuestions = questions.map(q => ({
        id: q.id,
        questionText: q.questionText,
        options: (q.options as any[]).map((o: any) => ({ text: o.text })),
        correctCount: q.correctCount,
        sortOrder: q.sortOrder,
      }));
      const uid = await getFirebaseUid(req);
      let attempt = null;
      if (uid) {
        attempt = await storage.getAttemptByUserAndQuiz(uid, quiz.id);
      }
      res.json({
        id: quiz.id,
        title: quiz.title,
        subtitle: quiz.subtitle,
        description: quiz.description,
        videoUrl: quiz.videoUrl,
        audioUrl: quiz.audioUrl,
        imageUrls: quiz.imageUrls,
        publishDate: quiz.publishDate,
        questions: safeQuestions,
        attempt: attempt ? { score: attempt.score, totalQuestions: attempt.totalQuestions, answers: attempt.answers, completedAt: attempt.completedAt } : null,
      });
    } catch (error) {
      console.error("Error getting today's quiz:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/quiz/:id/submit", async (req, res) => {
    try {
      const uid = await getFirebaseUid(req);
      if (!uid) return res.status(401).json({ error: "Authentication required" });
      const quizId = Number(req.params.id);
      const { answers } = req.body;
      if (!answers || typeof answers !== "object") return res.status(400).json({ error: "answers required" });

      const today = new Date().toISOString().split("T")[0];
      const quiz = await storage.getQuizByDate(today);
      if (!quiz || quiz.id !== quizId) return res.status(403).json({ error: "Quiz not available for submission" });

      const existing = await storage.getAttemptByUserAndQuiz(uid, quizId);
      if (existing) return res.status(409).json({ error: "Already submitted", attempt: existing });
      const questions = await storage.getQuestionsByQuizId(quizId);
      if (questions.length === 0) return res.status(404).json({ error: "Quiz not found" });
      let score = 0;
      for (const q of questions) {
        const userAnswers: number[] = answers[String(q.id)] || [];
        const correctIndices = (q.options as any[]).map((o: any, i: number) => o.isCorrect ? i : -1).filter((i: number) => i !== -1);
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
      const questionsWithCorrect = questions.map(q => ({
        id: q.id,
        questionText: q.questionText,
        options: q.options,
        correctCount: q.correctCount,
        sortOrder: q.sortOrder,
      }));
      res.json({ attempt, questions: questionsWithCorrect });
    } catch (error: any) {
      if (error?.code === "23505") {
        return res.status(409).json({ error: "Already submitted" });
      }
      console.error("Error submitting quiz:", error);
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

  return httpServer;
}
