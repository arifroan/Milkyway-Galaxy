import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import { WebSocketServer, WebSocket } from "ws";
import { createServer } from "http";

dotenv.config();

const app = express();
const PORT = 3000;
const server = createServer(app);
const wss = new WebSocketServer({ server });


app.use(express.json());

// Initialize Gemini client safely with proper User-Agent header
let ai: GoogleGenAI | null = null;
try {
  if (process.env.GEMINI_API_KEY) {
    ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
} catch (e) {
  console.error("Failed to initialize Gemini AI client:", e);
}

// API Routes
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", geminiEnabled: !!ai });
});

// Explain a cosmic catalog object using Gemini API
app.post("/api/gemini/explain", async (req, res) => {
  const { objectName, objectType, spectralType, distance, luminosity } = req.body;
  if (!objectName) {
    return res.status(400).json({ error: "Object name is required" });
  }

  if (!ai) {
    // Return high-quality, scientifically styled offline facts if API key is not configured yet
    return res.json({
      text: `### ${objectName} (${objectType || 'Cosmic Body'})
*This object is rendered locally using physical orbital solvers. Configure your AI Studio API Key in Secrets to activate full real-time neural telemetry.*

**Telemetry Overview:**
- **Theoretical Classification:** ${objectType || 'Deep Sky Body'}
- **Luminosity Profile:** ${luminosity || 'Highly dense'}
- **Current Range Bounds:** Approx. ${distance || 'Variable'} light-years
- **Dynamics:** Follows Keplerian spiral motion models. Tap 'Visit' to trigger warp-speed cruise vectors.`,
    });
  }

  try {
    const prompt = `You are a real-time on-board computer ("Cosmic Advisor") for an advanced interstellar spaceship cruising through the Milky Way Galaxy.
Provide a concise, scientifically accurate, and highly engaging space explorer description of:
Name: "${objectName}"
Type: "${objectType || 'Unspecified cosmic object'}"
Spectral details / Additional variables: ${spectralType || 'N/A'}, distance estimated: ${distance || 'N/A'} ly, luminosity: ${luminosity || 'N/A'}.

Structure the response with:
1. An immersive opening line as the spacecraft's artificial intelligence.
2. A scientific overview of its nature, position in the Milky Way, and physical composition.
3. 2-3 quick bullet points of key cosmic facts.
4. An exciting exoplanetary, historical, or cultural note.
Use Markdown. Keep it strictly descriptive, elegant, and under 250 words. Do not praise yourself or mention that you are an AI model.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction: "You are the central telemetry voice of an interstellar exploration vehicle. Speak scientific, sleek, and elegant prose.",
      }
    });

    res.json({ text: response.text });
  } catch (error: any) {
    console.error("Gemini explanation error:", error);
    res.status(500).json({ error: error.message || "Failed to generate cosmic telemetry." });
  }
});

// Chat / general space exploration questions
app.post("/api/gemini/chat", async (req, res) => {
  const { message, contextObject } = req.body;
  if (!message) {
    return res.status(400).json({ error: "Message is required" });
  }

  if (!ai) {
    return res.json({
      text: "The Cosmic Advisor is offline (GEMINI_API_KEY is not defined in Secrets panel). Add the API Key in Settings to enable deep space exploration guidance!",
    });
  }

  try {
    let prompt = message;
    if (contextObject) {
      prompt = `(Context: The user is currently inspecting or orbiting "${contextObject.name}", categorized as a ${contextObject.type} located ${contextObject.distance} light-years from Earth.)\n\nUser Question: ${message}`;
    }

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction: "You are the advanced Deep Space Telemetry AI on a starship exploring the Milky Way. Answer the crew's questions with high astronomical accuracy, modern scientific clarity, and custom formatting. Be helpful and educational.",
      }
    });

    res.json({ text: response.text });
  } catch (error: any) {
    console.error("Gemini chat error:", error);
    res.status(500).json({ error: error.message || "Failed to contact deep-space telemetry." });
  }
});

// WebSocket implementation for collaborative deep space exploration
const COMMANDER_TITLES = ["Commander", "Captain", "Cadet", "Explorer", "Officer", "Lieutenant", "Navigator", "Astrophysicist", "Pilot"];
const SPACE_NAMES = ["Vega", "Hale", "Galileo", "Sagan", "Cassini", "Kepler", "Hubble", "Orion", "Andromeda", "Comet", "Nova", "Cosmo", "Astro"];
const AVATAR_COLORS = ["#22d3ee", "#38bdf8", "#818cf8", "#c084fc", "#f472b6", "#fb7185", "#34d399", "#a7f3d0", "#fbbf24"];
const AVATAR_EMOJIS = ["🚀", "🛸", "🛰️", "👨‍🚀", "👩‍🚀", "👽", "☄️", "🪐", "⭐", "👾"];

const activeUsers = new Map<string, any>();
const globalBookmarks = new Set<string>();

wss.on("connection", (ws) => {
  const clientId = Math.random().toString(36).substring(2, 9);
  const title = COMMANDER_TITLES[Math.floor(Math.random() * COMMANDER_TITLES.length)];
  const name = SPACE_NAMES[Math.floor(Math.random() * SPACE_NAMES.length)];
  const username = `${title} ${name}`;
  const avatarColor = AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];
  const avatarEmoji = AVATAR_EMOJIS[Math.floor(Math.random() * AVATAR_EMOJIS.length)];

  const user = {
    id: clientId,
    username,
    avatarColor,
    avatarEmoji,
    cameraPos: [0, 1500, 3000],
    cameraTarget: [0, 0, 0],
    selectedObjectId: null,
    activeBookmarks: []
  };

  activeUsers.set(clientId, user);

  // Send welcome package
  ws.send(JSON.stringify({
    type: 'welcome',
    id: clientId,
    users: Array.from(activeUsers.values()),
    bookmarks: Array.from(globalBookmarks)
  }));

  // Broadcast join event
  wss.clients.forEach((client) => {
    if (client !== ws && client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({
        type: 'user_joined',
        user
      }));
    }
  });

  // Handle messages
  ws.on("message", (rawMsg) => {
    try {
      const data = JSON.parse(rawMsg.toString());
      if (data.type === 'state_update') {
        const currentUser = activeUsers.get(clientId);
        if (currentUser) {
          currentUser.cameraPos = data.cameraPos || currentUser.cameraPos;
          currentUser.cameraTarget = data.cameraTarget || currentUser.cameraTarget;
          currentUser.selectedObjectId = data.selectedObjectId !== undefined ? data.selectedObjectId : currentUser.selectedObjectId;
          currentUser.activeBookmarks = data.activeBookmarks !== undefined ? data.activeBookmarks : currentUser.activeBookmarks;
          
          // Broadcast update to other users
          wss.clients.forEach((client) => {
            if (client !== ws && client.readyState === WebSocket.OPEN) {
              client.send(JSON.stringify({
                type: 'state_update',
                user: currentUser
              }));
            }
          });
        }
      } else if (data.type === 'chat' || data.type === 'chat_message') {
        wss.clients.forEach((client) => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({
              type: 'chat_broadcast',
              senderId: clientId,
              username: user.username,
              avatarColor: user.avatarColor,
              avatarEmoji: user.avatarEmoji,
              text: data.text,
              time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            }));
          }
        });
      } else if (data.type === 'bookmark_toggle' || data.type === 'add_bookmark' || data.type === 'remove_bookmark') {
        const objectId = data.objectId;
        const isBookmarked = data.type === 'add_bookmark' || (data.type === 'bookmark_toggle' && data.isBookmarked);
        const currentUser = activeUsers.get(clientId);
        if (isBookmarked) {
          globalBookmarks.add(objectId);
          if (currentUser) {
            currentUser.activeBookmarks = Array.from(new Set([...currentUser.activeBookmarks, objectId]));
          }
          wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
              client.send(JSON.stringify({
                type: 'bookmark_added',
                objectId,
                username: user.username
              }));
            }
          });
        } else {
          globalBookmarks.delete(objectId);
          if (currentUser) {
            currentUser.activeBookmarks = currentUser.activeBookmarks.filter((id: string) => id !== objectId);
          }
          wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
              client.send(JSON.stringify({
                type: 'bookmark_removed',
                objectId,
                username: user.username
              }));
            }
          });
        }
      }
    } catch (err) {
      console.error("Error processing websocket message:", err);
    }
  });

  // Handle close
  ws.on("close", () => {
    activeUsers.delete(clientId);
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({
          type: 'user_left',
          id: clientId
        }));
      }
    });
  });
});

// Vite middleware flow
async function initializeServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

initializeServer();
