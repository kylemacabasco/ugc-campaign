import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

// POST /api/campaigns/[id]/refresh-views - Refresh view counts for all submissions in a campaign
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Get campaign to fetch the rate_per_1k_views
    const { data: campaign, error: campaignError } = await supabase
      .from("campaigns")
      .select("rate_per_1k_views")
      .eq("id", id)
      .single();

    if (campaignError || !campaign) {
      return NextResponse.json(
        { error: "Campaign not found" },
        { status: 404 }
      );
    }

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

    // Helper to call YouTube views API
    async function fetchViews(url: string): Promise<number> {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/api/youtube-views`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
          body: JSON.stringify({ urls: [url] }),
        }
      );
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || "Failed fetching views");
      return Number(json?.results?.[0]?.viewCount ?? 0);
    }

    let updated = 0;
    for (const s of subs || []) {
      try {
        const views = await fetchViews(s.video_url);
        
        // Calculate earned amount: (views / 1000) * rate_per_1k_views
        const earnedAmount = (views / 1000) * campaign.rate_per_1k_views;
        
        const { error: ue } = await supabase
          .from("submissions")
          .update({ 
            view_count: views,
            earned_amount: earnedAmount,
            updated_at: new Date().toISOString()
          })
          .eq("id", s.id);
        if (!ue) updated++;
      } catch {
        // ignore per-row errors
      }
    }

    return NextResponse.json({ ok: true, updated });
  } catch (error) {
    console.error("Error in POST /api/campaigns/[id]/refresh-views:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
