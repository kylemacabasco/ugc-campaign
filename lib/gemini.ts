import { GoogleGenerativeAI, SchemaType, type Schema } from "@google/generative-ai";

export interface ValidationRequest {
  url: string;
  requirements: string;
}
export interface ValidationResponse {
  valid: boolean;
  explanation: string;
}

const GEMINI_API_KEY = process.env.GEMINI_API_KEY ?? "";
const GEMINI_MODEL = process.env.GEMINI_MODEL ?? "gemini-2.0-flash";

const validationSchema: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    valid: { type: SchemaType.BOOLEAN, description: "Meets all campaign requirements" },
    explanation: { type: SchemaType.STRING, description: "Actionable rationale" },
  },
  required: ["valid", "explanation"],
};

export function isValidYouTubeUrl(url: string): boolean {
  return /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+/i.test(url);
}

export async function validateVideoSubmission(
  input: ValidationRequest
): Promise<ValidationResponse> {
  if (!GEMINI_API_KEY) {
    throw new Error("Gemini API key not configured");
  }

  const url = input.url.trim();
  const requirements = input.requirements.trim();

  const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({
    model: GEMINI_MODEL,
    generationConfig: {
      temperature: 0.2,
      responseMimeType: "application/json",
      responseSchema: validationSchema,
    },
  });

  const prompt = `
You are moderating a YouTube submission for a UGC campaign.

Video URL: ${url}

Campaign Requirements (must satisfy ALL):
${requirements}

Evaluate and return STRICT JSON:
- valid: boolean (true only if ALL requirements are clearly satisfied)
- explanation: short, actionable reason

Checklist:
1) Primary focus on requirement
2) Active demonstration or prominent feature
3) Real value (educational/entertaining)
4) Positive brand alignment
5) If a duration threshold exists (e.g., >10%), consider that.

Return only JSON with keys { "valid": boolean, "explanation": string }.
`.trim();

  const result = await model.generateContent([{ text: prompt }]);
  const raw = result?.response?.text() ?? "";

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("Failed to parse Gemini response as JSON");
  }

  const out = parsed as Partial<ValidationResponse>;
  if (typeof out.valid !== "boolean" || typeof out.explanation !== "string") {
    throw new Error("Gemini response missing required fields");
  }
  return out as ValidationResponse;
}
