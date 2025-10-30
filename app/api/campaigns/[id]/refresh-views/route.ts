import { NextRequest, NextResponse } from "next/server";
import { supabase } from "../../../../../lib/supabase";

// POST /api/[id]/refresh-views - Refresh view counts for all submissions in a campaign
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Fetch all submissions for this campaign
    const { data: subs, error: se } = await supabase
      .from("submissions")
      .select("id,platform,video_url")
      .eq("campaign_id", id);

    if (se) {
      return NextResponse.json(
        { error: "Failed to load submissions" },
        { status: 500 }
      );
    }

    // Helper to call your existing YouTube (or platform) views proxy
    async function fetchViews(platform: string | null, url: string): Promise<number> {
      const res = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || ""}/api/youtube-views`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ platform, url }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || "Failed fetching views");
      return Number(json?.views ?? 0);
    }

    let updated = 0;
    for (const s of subs || []) {
      try {
        const views = await fetchViews(s.platform, s.video_url);
        const { error: ue } = await supabase
          .from("submissions")
          .update({ view_count: views, updated_at: new Date().toISOString() })
          .eq("id", s.id);
        if (!ue) updated++;
      } catch {
        // ignore per-row errors
      }
    }

    return NextResponse.json({ ok: true, updated });
  } catch (error) {
    console.error("Error in POST /api/[id]/refresh-views:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

