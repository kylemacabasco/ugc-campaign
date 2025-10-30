import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

// GET /api/cron/update-views - Hourly cron job to update view counts
export async function GET(request: NextRequest) {
  try {
    // Verify this is a legitimate cron request (Vercel cron sends this header)
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get all active campaigns
    const { data: campaigns, error: campaignsError } = await supabase
      .from("campaigns")
      .select("id")
      .eq("status", "active");

    if (campaignsError) {
      console.error("Error fetching campaigns:", campaignsError);
      return NextResponse.json(
        { error: "Failed to fetch campaigns" },
        { status: 500 }
      );
    }

    if (!campaigns || campaigns.length === 0) {
      return NextResponse.json({ 
        message: "No active campaigns to update",
        updated: 0 
      });
    }

    // Helper to call YouTube views API
    async function fetchViews(url: string): Promise<number> {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/api/youtube-views`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ urls: [url] }),
        }
      );
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || "Failed fetching views");
      return Number(json?.results?.[0]?.viewCount ?? 0);
    }

    // Update views for all submissions in active campaigns
    let totalUpdated = 0;
    for (const campaign of campaigns) {
      try {
        // Get all submissions for this campaign
        const { data: submissions } = await supabase
          .from("submissions")
          .select("id, platform, video_url")
          .eq("campaign_id", campaign.id);

        if (!submissions || submissions.length === 0) continue;

        // Update each submission's view count
        for (const submission of submissions) {
          try {
            const views = await fetchViews(submission.video_url);
            const { error: ue } = await supabase
              .from("submissions")
              .update({
                view_count: views,
                updated_at: new Date().toISOString(),
              })
              .eq("id", submission.id);
            if (!ue) totalUpdated++;
          } catch (err) {
            console.error(`Error updating submission ${submission.id}:`, err);
            // Continue with next submission
          }
        }
      } catch (err) {
        console.error(`Error processing campaign ${campaign.id}:`, err);
        // Continue with next campaign
      }
    }

    return NextResponse.json({
      message: "View counts updated successfully",
      campaigns: campaigns.length,
      updated: totalUpdated,
    });
  } catch (error) {
    console.error("Error in cron job:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

