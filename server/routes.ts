import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { initializeApp as initializeFirebaseApp, getApps } from "firebase/app";
import { getFirestore, collection, getDocs, query, orderBy, limit, where, Timestamp } from "firebase/firestore";

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
      let debugged = false;
      snapshot.forEach((doc) => {
        const data = doc.data();
        if (!debugged) { console.log("ANNOUNCE_FIELDS:", JSON.stringify(Object.keys(data))); debugged = true; }
        const desc = data.description ? data.description.replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').trim().substring(0, 300) : "";
        if (data.title && desc) {
          announcements.push({
            id: doc.id,
            title: (data.title || "").replace(/&amp;/g, '&'),
            description: desc,
            slug: data.slug || "",
            url: data.slug ? `https://www.sringeri.net/announcements/${data.slug}` : null,
          });
        }
      });

      res.json({ announcements: announcements.slice(0, limitNum) });
    } catch (error) {
      console.error("Error fetching announcements:", error);
      res.status(500).json({ error: "Failed to fetch announcements" });
    }
  });

  app.get("/api/youtube-videos", async (req, res) => {
    try {
      const channelId = "UCC7AKcYvtFdlubqwW6Ave2Q";
      const feedUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
      const response = await fetch(feedUrl);
      if (!response.ok) {
        return res.status(502).json({ error: "Failed to fetch YouTube feed" });
      }
      const xml = await response.text();

      const videos: any[] = [];
      const entryRegex = /<entry>([\s\S]*?)<\/entry>/g;
      let match;
      while ((match = entryRegex.exec(xml)) !== null && videos.length < 10) {
        const entry = match[1];
        const videoId = entry.match(/<yt:videoId>(.*?)<\/yt:videoId>/)?.[1] || "";
        const title = entry.match(/<title>(.*?)<\/title>/)?.[1] || "";
        const published = entry.match(/<published>(.*?)<\/published>/)?.[1] || "";
        const thumbnail = `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`;
        const desc = entry.match(/<media:description>([\s\S]*?)<\/media:description>/)?.[1]?.substring(0, 200) || "";

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

      res.json({ videos });
    } catch (error) {
      console.error("Error fetching YouTube videos:", error);
      res.status(500).json({ error: "Failed to fetch YouTube videos" });
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

  return httpServer;
}
