import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

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

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

initializeServer();
