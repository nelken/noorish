// api/speak.js
import OpenAI from "openai";
import { Buffer } from "node:buffer";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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

    const response = await client.audio.speech.create({
      model: "gpt-4o-mini-tts",
      voice,
      input,
      instructions,
      response_format: "wav",
    });

    const audioBuffer = Buffer.from(await response.arrayBuffer());

    res.setHeader("Content-Type", "audio/wav");
    res.setHeader("Content-Length", audioBuffer.length);
    return res.status(200).send(audioBuffer);
  } catch (err) {
    console.error("OpenAI TTS error", err);
    return res.status(500).json({
      ok: false,
      error: "Internal server error",
    });
  }
}
