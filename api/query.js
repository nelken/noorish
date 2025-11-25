// api/query.js
import OpenAI from "openai";
import { z } from "zod";
import { zodTextFormat } from "openai/helpers/zod";


const BurnoutResult = z.object({
  score_percent: z.number().int().min(0).max(100),
  evaluation_markdown: z.string(),
});

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
      input: [
        { role: "system", content: `You are a Professor of psychology with lifelong experience in assessing burnout. 
          This is a brief questionaire intended to assess my burnout, as well as assign a 1-5 score for Exhaustion, Cynicism, and personal efficacy. 
          Here are the questions and the answers. 
          
          1. Compute a burnout severity percentage from 0 to 100.
          2. Write a brief markdown evaluation explaining the result.

          Respond as **pure JSON**, no extra text, with this exact shape:
          {
            "score_percent": <integer 0-100>,
            "evaluation_markdown": "<markdown text>"
          }      `.trim()},
          
        { role: "user", content: q }

      ],
    });

    // Responses API returns output in response.output
    const text = response.output_text;


    return res.status(200).json({
      ok: true,
      query: q,
      text: text,
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
