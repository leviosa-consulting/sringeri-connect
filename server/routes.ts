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

  app.get("/api/sringeri-events", async (req, res) => {
    try {
      if (!sringeriDb) {
        return res.status(503).json({ error: "Sringeri.net Firestore not configured" });
      }

      const colRef = collection(sringeriDb, "events");
      const q = query(colRef, orderBy("date", "desc"), limit(50));
      const snapshot = await getDocs(q);

      const events: any[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        if (data.status && data.status !== "published") return;
        const dateSeconds = data.date?.seconds;
        const dateStr = dateSeconds 
          ? new Date(dateSeconds * 1000).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })
          : null;
        
        const sringeriBaseUrl = "https://www.sringeri.net";
        const eventUrl = data.link 
          ? (data.link.startsWith('http') ? data.link : `${sringeriBaseUrl}/${data.link}`)
          : (data.slug ? `${sringeriBaseUrl}/events/${data.slug}` : null);

        events.push({
          id: doc.id,
          title: data.title || "",
          description: data.description ? data.description.replace(/<[^>]*>/g, '').substring(0, 200) : "",
          date: dateStr,
          dateTimestamp: dateSeconds || 0,
          featuredImage: data.featuredImage 
            ? (data.featuredImage.startsWith('http') ? data.featuredImage : `${sringeriBaseUrl}/${data.featuredImage}`)
            : null,
          location: data.location || "",
          status: data.status || "",
          url: eventUrl,
          isOnline: data.isOnline || false,
          showLiveStream: data.showLiveStream || false,
        });
      });

      res.json({ events });
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
