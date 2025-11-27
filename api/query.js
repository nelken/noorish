// api/query.js
import fs from "fs";
import path from "path";
import OpenAI from "openai";
import { z } from "zod";
import { zodTextFormat } from "openai/helpers/zod";
import { fileURLToPath } from "url";

const BurnoutResult = z.object({
  score_percent: z.number().int().min(0).max(100),
  evaluation_markdown: z.string(),
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const systemPromptPath = path.join(__dirname, "burnout-prompt.txt");
const systemPrompt = fs.readFileSync(systemPromptPath, "utf8").trim();

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // Vercel parses JSON body if Content-Type is application/json
    const { q } = req.body || {};

    if (!q || typeof q !== "string") {
      return res.status(400).json({ error: "Missing or invalid 'q' field" });
    }

    // Call OpenAI Responses API
    const response = await client.responses.create({
      model: "gpt-4o-mini",
      text: { format: zodTextFormat(BurnoutResult, "BurnoutResult") },
      max_output_tokens: 5000, // avoid truncation of the evaluation
      input: [
        { role: "system", content: systemPrompt },
        { role: "user", content: q },
      ],
    });

    // Responses API returns output in response.output; surface finish_reason for debugging
    const firstOutput = response.output?.[0]?.content?.[0];
    const finishReason =
      firstOutput?.finish_reason ?? response.output?.[0]?.finish_reason;
    const text = firstOutput?.text ?? response.output_text ?? "";


    return res.status(200).json({
      ok: true,
      query: q,
      text: text,
      finish_reason: finishReason,
      raw: response,
    });
  } catch (err) {
    console.error("OpenAI error", err);
    return res.status(500).json({
      ok: false,
      error: "Internal server error",
    });
  }
}
