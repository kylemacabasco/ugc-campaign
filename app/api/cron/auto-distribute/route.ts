import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

// GET /api/cron/auto-distribute - Daily cron job to auto-distribute payouts
export async function GET(request: NextRequest) {
  try {
    // Verify this is a legitimate cron request
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Find campaigns that ended more than 24 hours ago and haven't been distributed
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const { data: campaigns, error: campaignsError } = await supabase
      .from("campaigns")
      .select("id, title")
      .eq("status", "ended")
      .eq("distributed", false)
      .not("ended_at", "is", null)
      .lte("ended_at", twentyFourHoursAgo);

    if (campaignsError) {
      console.error("Error fetching campaigns for auto-distribution:", campaignsError);
      return NextResponse.json(
        { error: "Failed to fetch campaigns" },
        { status: 500 }
      );
    }

    if (!campaigns || campaigns.length === 0) {
      return NextResponse.json({
        message: "No campaigns ready for auto-distribution",
        distributed: 0,
      });
    }

    let distributed = 0;
    for (const campaign of campaigns) {
      try {
        // Check if there are approved submissions with earnings
        const { data: submissions, error: submissionsError } = await supabase
          .from("submissions")
          .select("earned_amount")
          .eq("campaign_id", campaign.id)
          .eq("status", "approved")
          .gt("earned_amount", 0);

        if (submissionsError) {
          console.error(`Error fetching submissions for campaign ${campaign.id}:`, submissionsError);
          continue;
        }

        // Only mark as distributed if there are submissions to pay
        if (submissions && submissions.length > 0) {
          const { error: updateError } = await supabase
            .from("campaigns")
            .update({
              distributed: true,
              distributed_at: new Date().toISOString(),
            })
            .eq("id", campaign.id)
            .eq("distributed", false); // Prevent race condition

          if (!updateError) {
            distributed++;
            console.log(`Auto-distributed campaign ${campaign.id} (${campaign.title})`);
          }
        }
      } catch (err) {
        console.error(`Error processing campaign ${campaign.id}:`, err);
        // Continue with next campaign
      }
    }

    return NextResponse.json({
      message: "Auto-distribution completed",
      campaigns_checked: campaigns.length,
      campaigns_distributed: distributed,
    });
  } catch (error) {
    console.error("Error in auto-distribute cron job:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

