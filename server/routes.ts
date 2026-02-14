import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { initializeApp as initializeFirebaseApp, getApps } from "firebase/app";
import { getFirestore, collection, getDocs, query, orderBy, limit, where, Timestamp } from "firebase/firestore";
import { handleChatMessage, setEventsCache, setAnnouncementsCache } from "./chatbot";

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

  app.get("/api/youtube-videos", async (req, res) => {
    try {
      const channelId = "UCC7AKcYvtFdlubqwW6Ave2Q";
      let videos: any[] = [];

      const feedUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
      try {
        const response = await fetch(feedUrl);
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
        }
      } catch (rssErr) {
        console.log("RSS feed failed, trying channel page scrape...");
      }

      if (videos.length === 0) {
        try {
          const pageRes = await fetch(`https://www.youtube.com/channel/${channelId}`, {
            headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" },
          });
          if (pageRes.ok) {
            const html = await pageRes.text();
            const dataMatch = html.match(/var ytInitialData = ({.*?});<\/script>/);
            if (dataMatch) {
              const data = JSON.parse(dataMatch[1]);
              const homeTab = data?.contents?.twoColumnBrowseResultsRenderer?.tabs?.[0]?.tabRenderer?.content?.sectionListRenderer?.contents || [];
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
              findVideos(homeTab);
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
            }
          }
        } catch (scrapeErr) {
          console.error("Channel page scrape also failed:", scrapeErr);
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

  app.post("/api/onlineReservationRzp", async (req, res) => {
    try {
      const response = await fetch(`${SRINGERI_API_URL}/api/onlineReservationRzp`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(SRINGERI_API_KEY && { "X-API-Key": SRINGERI_API_KEY }),
        },
        body: JSON.stringify(req.body),
      });

      if (!response.ok) {
        return res.status(response.status).json({ error: "Failed to submit reservation" });
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

  app.get("/api/donationSubCategory/:categoryId", async (req, res) => {
    try {
      const { categoryId } = req.params;
      const response = await fetch(`${SRINGERI_API_URL}/api/donationSubCategory/${categoryId}`, {
        headers: {
          "Content-Type": "application/json",
          ...(SRINGERI_API_KEY && { "X-API-Key": SRINGERI_API_KEY }),
        },
      });

      if (!response.ok) {
        return res.status(response.status).json({ error: "Failed to fetch donation subcategories" });
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
      const response = await fetch(`${SRINGERI_API_URL}/api/makeDonation`, {
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

  return httpServer;
}
