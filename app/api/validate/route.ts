import { NextRequest, NextResponse } from "next/server";
import {
  validateVideoSubmission,
  isValidYouTubeUrl,
  type ValidationRequest,
  type ValidationResponse,
} from "@/lib/gemini";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as ValidationRequest;
    const url = (body.url ?? "").trim();
    const requirements = (body.requirements ?? "").trim();

    if (!url || !requirements) {
      return NextResponse.json({ error: "URL and requirements are required" }, { status: 400 });
    }
    if (!isValidYouTubeUrl(url)) {
      const resp: ValidationResponse = {
        valid: false,
        explanation: "URL must be a valid YouTube video URL",
      };
      return NextResponse.json(resp);
    }

    const result = await validateVideoSubmission({ url, requirements });
    return NextResponse.json(result);
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Internal server error";
    const status = msg.includes("Gemini API key") ? 500 : 502;
    return NextResponse.json({ error: msg }, { status });
  }
}
