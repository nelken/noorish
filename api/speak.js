// api/speak.js
import fs from "fs";
import path from "path";
import crypto from "crypto";
import OpenAI from "openai";
import { Buffer } from "node:buffer";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const CACHE_DIR = path.join(process.cwd(), "api", "tts-cache");

function ensureCacheDir() {
  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
  }
}

function buildCachePath(input, voice, instructions) {
  const hash = crypto
    .createHash("sha1")
    .update(`${voice}|${instructions}|${input}`)
    .digest("hex");
  return path.join(CACHE_DIR, `${hash}.mp3`);
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const {
      input = "Today is a wonderful day to build something people love!",
      voice = "coral",
      instructions = "Speak in an empathetic caring voice.",
    } = req.body || {};

    ensureCacheDir();
    const cachePath = buildCachePath(input, voice, instructions);

    if (fs.existsSync(cachePath)) {
      console.log("Serving audio from cache");
      const cachedAudio = fs.readFileSync(cachePath);
      res.setHeader("Content-Type", "audio/mpeg");
      res.setHeader("Content-Length", cachedAudio.length);
      res.setHeader("X-TTS-Cache", "HIT");
      return res.status(200).send(cachedAudio);
    }

    const response = await client.audio.speech.create({
      model: "gpt-4o-mini-tts",
      voice,
      input,
      instructions,
      response_format: "mp3",
    });

    const audioBuffer = Buffer.from(await response.arrayBuffer());

    fs.writeFileSync(cachePath, audioBuffer);

    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Content-Length", audioBuffer.length);
    res.setHeader("X-TTS-Cache", "MISS");
    return res.status(200).send(audioBuffer);
  } catch (err) {
    console.error("OpenAI TTS error", err);
    return res.status(500).json({
      ok: false,
      error: "Internal server error",
    });
  }
}
