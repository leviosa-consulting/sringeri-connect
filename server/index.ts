import express, { type Request, Response, NextFunction } from "express";
import cookieParser from "cookie-parser";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";

const app = express();
app.set("trust proxy", 1);
const httpServer = createServer(app);

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

app.get("/api/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

// Maintenance gate: seva / donate / yatra / yatri / fastline subdomains show an upgrade page until 2:00 AM IST Jun 1 2026
const MAINTENANCE_SUBDOMAINS = ["seva.", "donate.", "yatra.", "yatri.", "fastline."];
const MAINTENANCE_ENDS_UTC = new Date("2026-05-31T20:30:00.000Z"); // 2:00 AM IST = 20:30 UTC prev day
const MAINTENANCE_SKIP_PATHS = ["/api", "/assets", "/src", "/@", "/favicon", "/manifest", "/node_modules"];
const MAINTENANCE_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Site Upgrade in Progress — Sri Sringeri Sharada Peetham</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      min-height: 100vh;
      background: linear-gradient(to bottom, #FFF8F0, #F7F2EC, #EDE4D8);
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      padding: 2rem 1.5rem; text-align: center; font-family: Georgia, 'Times New Roman', serif;
      color: #3d2000;
    }
    .logo { height: 7rem; width: auto; object-fit: contain; margin-bottom: 1.5rem; drop-shadow: 0 4px 12px rgba(0,0,0,0.12); }
    .sanskrit { font-size: 0.95rem; color: #7a5230; font-style: italic; margin-bottom: 1.25rem; letter-spacing: 0.02em; }
    .divider { display: flex; align-items: center; justify-content: center; gap: 0.75rem; margin: 1rem 0; }
    .divider-line { width: 3rem; height: 1px; background: linear-gradient(to right, transparent, #a0703a); }
    .divider-line.rev { background: linear-gradient(to left, transparent, #a0703a); }
    .dot { width: 6px; height: 6px; border-radius: 50%; background: #a0703a; opacity: 0.6; }
    h1 { font-size: 1.5rem; font-weight: 700; color: #3d2000; margin-bottom: 0.5rem; letter-spacing: -0.01em; }
    .subtitle { font-size: 0.9rem; color: #7a5230; font-family: system-ui, sans-serif; margin-bottom: 1.5rem; }
    .card {
      background: rgba(255,255,255,0.6); border: 1px solid rgba(160,112,58,0.2); border-radius: 1rem;
      padding: 1.5rem 2rem; max-width: 22rem; width: 100%; margin: 0.5rem 0 1.5rem;
      backdrop-filter: blur(4px);
    }
    .card p { font-size: 0.925rem; color: #5c3317; font-family: system-ui, sans-serif; line-height: 1.6; }
    .card p + p { margin-top: 0.75rem; }
    .deadline { font-weight: 600; color: #3d2000; }
    .footer { font-size: 0.78rem; color: #a0703a; font-family: system-ui, sans-serif; margin-top: 0.5rem; }
  </style>
</head>
<body>
  <img src="/assets/logo.webp" alt="Sri Sringeri Sharada Peetham" class="logo" />
  <p class="sanskrit">श्री शारदाम्बायै नमः</p>
  <div class="divider">
    <div class="divider-line"></div><div class="dot"></div><div class="divider-line rev"></div>
  </div>
  <h1>Site Upgrade in Progress</h1>
  <p class="subtitle">Dakshinamnaya Sri Sharada Peetham</p>
  <div class="card">
    <p>Our devotee services portal is currently being upgraded.</p>
    <p>We will be back online by<br/><span class="deadline">2:00 AM on 1st June 2026.</span></p>
  </div>
  <p class="footer">Thank you for your patience. &nbsp;ॐ</p>
</body>
</html>`;

app.use((req, res, next) => {
  const host = req.hostname || req.headers.host || "";
  const isMaintenanceSubdomain = MAINTENANCE_SUBDOMAINS.some(sub => host.startsWith(sub));
  if (!isMaintenanceSubdomain) return next();

  if (new Date() >= MAINTENANCE_ENDS_UTC) return next();

  const bypassToken = process.env.MAINTENANCE_BYPASS_TOKEN || "sringeri_admin";

  if (req.query.bypass === bypassToken) {
    const url = new URL(req.url, `http://${req.headers.host}`);
    url.searchParams.delete("bypass");
    res.setHeader("Set-Cookie", `maintenance_bypass=${bypassToken}; Path=/; HttpOnly; Max-Age=86400`);
    return res.redirect(302, url.pathname + (url.search || ""));
  }

  const cookies = (req as any).cookies as Record<string, string>;
  if (cookies?.maintenance_bypass === bypassToken) return next();

  if (MAINTENANCE_SKIP_PATHS.some(p => req.path.startsWith(p))) return next();

  res.status(503).setHeader("Content-Type", "text/html; charset=utf-8");
  return res.end(MAINTENANCE_HTML);
});

// Subdomain redirects — runs after maintenance gate so bypass works
// fastline.* → /fastline (all paths)
// seva.* / donate.* / yatri.* / yatra.* → respective page when /home is hit by mistake
app.use((req, res, next) => {
  const host = req.hostname || req.headers.host || "";
  const skipPaths = ["/api", "/fastline", "/payment-result", "/assets", "/src", "/@", "/favicon", "/manifest", "/node_modules"];

  if (host.startsWith("fastline.") && !skipPaths.some(p => req.path.startsWith(p))) {
    return res.redirect(301, "/fastline");
  }

  if (req.path === "/home" || req.path === "/home/") {
    if (host.startsWith("seva.")) return res.redirect(302, "/seva");
    if (host.startsWith("donate.")) return res.redirect(302, "/donation");
    if (host.startsWith("yatri.") || host.startsWith("yatra.")) return res.redirect(302, "/accommodation");
  }

  next();
});

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      log(logLine);
    }
  });

  next();
});

const port = parseInt(process.env.PORT || "5000", 10);
httpServer.listen(
  {
    port,
    host: "0.0.0.0",
    reusePort: true,
  },
  () => {
    log(`serving on port ${port}`);
  },
);

httpServer.on("error", (err: any) => {
  console.error("Server failed to start:", err);
  process.exit(1);
});

(async () => {
  try {
    await registerRoutes(httpServer, app);

    app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";

      console.error("Internal Server Error:", err);

      if (res.headersSent) {
        return next(err);
      }

      return res.status(status).json({ message });
    });

    if (process.env.NODE_ENV === "production") {
      serveStatic(app);
    } else {
      const { setupVite } = await import("./vite");
      await setupVite(httpServer, app);
    }

    log("all routes and middleware initialized");
  } catch (err) {
    console.error("Failed to initialize application:", err);
    process.exit(1);
  }
})();
