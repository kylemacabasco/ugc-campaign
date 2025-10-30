import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

// POST /api/campaigns - Create new campaign
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      title,
      description,
      campaign_amount,
      rate_per_1k_views,
      creator_wallet,
      requirements,
    } = body;

    if (
      !title ||
      !description ||
      campaign_amount === undefined ||
      rate_per_1k_views === undefined ||
      !creator_wallet
    ) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    if (campaign_amount <= 0 || rate_per_1k_views <= 0) {
      return NextResponse.json(
        { error: "Campaign amount and rate must be positive numbers" },
        { status: 400 }
      );
    }

    // Get user by wallet address
    const { data: user } = await supabase
      .from("users")
      .select("id")
      .eq("wallet_address", creator_wallet)
      .maybeSingle();

    if (!user) {
      return NextResponse.json(
        { error: "User not found. Please connect your wallet first." },
        { status: 401 }
      );
    }

    // Insert campaign
    const { data, error } = await supabase
      .from("campaigns")
      .insert([
        {
          title,
          description,
          campaign_amount,
          rate_per_1k_views,
          creator_id: user.id,
          status: "inactive",
          metadata: requirements ? { requirements } : {},
        },
      ])
      .select()
      .single();

    if (error) {
      console.error("Error creating campaign:", error);
      return NextResponse.json(
        { error: "Failed to create campaign" },
        { status: 500 }
      );
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error("Error in POST /api/campaigns:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// GET /api/campaigns - List all campaigns
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.url
      ? new URL(request.url)
      : { searchParams: new URLSearchParams() };
    const status = searchParams.get("status");
    const creator_wallet = searchParams.get("creator_wallet");

    let query = supabase
      .from("campaigns")
      .select(`
        *,
        creator:users!creator_id(wallet_address, username)
      `)
      .order("created_at", { ascending: false });

    if (status) {
      query = query.eq("status", status);
    }

    if (creator_wallet) {
      const { data: user } = await supabase
        .from("users")
        .select("id")
        .eq("wallet_address", creator_wallet)
        .maybeSingle();

      if (user) {
        query = query.eq("creator_id", user.id);
      } else {
        return NextResponse.json([]);
      }
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching campaigns:", error);
      return NextResponse.json(
        { error: "Failed to fetch campaigns" },
        { status: 500 }
      );
    }

    return NextResponse.json(data || []);
  } catch (error) {
    console.error("Error in GET /api/campaigns:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
