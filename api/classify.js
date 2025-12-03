// api/classify.js
import OpenAI from "openai";
import { z } from "zod";
import { zodTextFormat } from "openai/helpers/zod";

const ClassificationResult = z.object({
  choice: z.string(),
  reasoning: z.string().optional().default(""),
});

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const systemPrompt = [
  "You classify a piece of text into exactly one of the provided options.",
  "- Only choose from the options the user sends.",
  "- Be concise in reasoning.",
].join("\n");

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { text, options } = req.body || {};

    if (typeof text !== "string" || !text.trim()) {
      return res.status(400).json({ error: "Missing or invalid 'text' field" });
    }
    if (
      !Array.isArray(options) ||
      options.length === 0 ||
      options.some(opt => typeof opt !== "string" || !opt.trim())
    ) {
      return res.status(400).json({ error: "Missing or invalid 'options' array" });
    }

    const formattedOptions = options.map(opt => opt.trim());

    const response = await client.responses.create({
      model: "gpt-4o-mini",
      temperature: 0,
      text: { format: zodTextFormat(ClassificationResult, "ClassificationResult") },
      input: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: [
            "Pick the best matching option for the provided text.",
            `Options: ${formattedOptions.map(o => `"${o}"`).join(", ")}`,
            `Text: ${text}`,
          ].join("\n"),
        },
      ],
    });

    const firstOutput = response.output?.[0]?.content?.[0];
    const finishReason =
      firstOutput?.finish_reason ?? response.output?.[0]?.finish_reason;

    const outputText = firstOutput?.text ?? response.output_text ?? "";

    let parsed = firstOutput?.parsed ?? null;
    if (!parsed && outputText) {
      try {
        const asJson = JSON.parse(outputText);
        const result = ClassificationResult.safeParse(asJson);
        if (result.success) {
          parsed = result.data;
        }
      } catch {
        // ignore JSON parse errors; fall back to raw text
      }
    }

    return res.status(200).json({
      ok: true,
      choice: parsed?.choice ?? null,
      reasoning: parsed?.reasoning ?? "",
      finish_reason: finishReason,
      raw_text: outputText,
      raw: response,
    });
  } catch (err) {
    console.error("OpenAI classify error", err);
    return res.status(500).json({
      ok: false,
      error: "Internal server error",
    });
  }
}
