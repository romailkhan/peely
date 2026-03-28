import OpenAI from "openai";
import { SYSTEM_PROMPT, buildUserPrompt } from "./prompts.js";

export interface ReviewFinding {
  file: string;
  line: number | null;
  severity: "critical" | "warning" | "suggestion" | "nitpick";
  title: string;
  description: string;
  suggestion: string | null;
}

export interface ReviewResult {
  summary: string;
  overallScore: number;
  findings: ReviewFinding[];
}

function getClient(): OpenAI {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error(
      "OPENROUTER_API_KEY environment variable is required.\n" +
      "Get one at https://openrouter.ai/keys"
    );
  }

  return new OpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey,
  });
}

export async function reviewCode(
  files: Array<{ path: string; diff?: string; content?: string; status?: string }>,
  options: {
    model: string;
    prTitle?: string;
    prBody?: string | null;
  }
): Promise<ReviewResult> {
  const client = getClient();
  const userPrompt = buildUserPrompt(files, {
    prTitle: options.prTitle,
    prBody: options.prBody,
  });

  const response = await client.chat.completions.create({
    model: options.model,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.2,
    response_format: { type: "json_object" },
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error("No response from AI model");
  }

  const parsed = JSON.parse(content) as ReviewResult;

  if (!parsed.summary || typeof parsed.overallScore !== "number" || !Array.isArray(parsed.findings)) {
    throw new Error("AI response did not match expected schema");
  }

  parsed.overallScore = Math.max(1, Math.min(10, Math.round(parsed.overallScore)));

  return parsed;
}
