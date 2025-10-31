import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

// POST /api/submissions - Create new submission
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { campaign_id, submitter_wallet, video_url } = body;

    if (!campaign_id || !submitter_wallet || !video_url) {
      return NextResponse.json(
        { error: "Missing required fields: campaign_id, submitter_wallet, video_url" },
        { status: 400 }
      );
    }

    // Validate URL format (YouTube or uploaded media or any valid URL)
    const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com\/(watch\?v=|shorts\/)|youtu\.be\/)[\w-]{11}/;
    const isValidUrl = /^https?:\/\/.+/.test(video_url); // Any valid http/https URL
    const isYouTube = youtubeRegex.test(video_url);
    
    if (!isValidUrl) {
      return NextResponse.json(
        { error: "Invalid URL format. Please provide a valid URL." },
        { status: 400 }
      );
    }

    // Get user by wallet
    const { data: user } = await supabase
      .from("users")
      .select("id")
      .eq("wallet_address", submitter_wallet)
      .maybeSingle();

    if (!user) {
      return NextResponse.json(
        { error: "User not found. Please connect your wallet first." },
        { status: 401 }
      );
    }

    // Verify campaign exists and is active
    const { data: campaign } = await supabase
      .from("campaigns")
      .select("id, status")
      .eq("id", campaign_id)
      .maybeSingle();

    if (!campaign) {
      return NextResponse.json(
        { error: "Campaign not found" },
        { status: 404 }
      );
    }

    if (campaign.status !== "active") {
      return NextResponse.json(
        { error: "Campaign is not active" },
        { status: 400 }
      );
    }

    // Check for duplicate submission
    const { data: existing } = await supabase
      .from("submissions")
      .select("id")
      .eq("campaign_id", campaign_id)
      .eq("user_id", user.id)
      .eq("video_url", video_url)
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { error: "This video has already been submitted to this campaign" },
        { status: 409 }
      );
    }

    // Create submission with "approved" status since validation already happened
    // on the submit page before reaching this endpoint
    const { data: submission, error: insertError } = await supabase
      .from("submissions")
      .insert({
        campaign_id,
        user_id: user.id,
        video_url,
        platform: isYouTube ? "youtube" : "uploaded",
        status: "approved", // Already validated via /api/validate
      })
      .select()
      .single();

    if (insertError) {
      console.error("Error creating submission:", insertError);
      return NextResponse.json(
        { error: `Failed to create submission: ${insertError.message || insertError.code || "Unknown error"}` },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        submission,
        message: "Submission created successfully",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error in POST /api/submissions:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// GET /api/submissions - List submissions with optional filters
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.url
      ? new URL(request.url)
      : { searchParams: new URLSearchParams() };
    const campaign_id = searchParams.get("campaign_id");
    const status = searchParams.get("status");

    let query = supabase
      .from("submissions")
      .select("*, users(wallet_address, username)")
      .order("created_at", { ascending: false });

    if (campaign_id) {
      query = query.eq("campaign_id", campaign_id);
    }

    if (status) {
      query = query.eq("status", status);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching submissions:", error);
      return NextResponse.json(
        { error: "Failed to fetch submissions" },
        { status: 500 }
      );
    }

    return NextResponse.json(data || []);
  } catch (error) {
    console.error("Error in GET /api/submissions:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
