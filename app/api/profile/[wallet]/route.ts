import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

// GET /api/profile/[wallet] - Get user's campaigns and submissions
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ wallet: string }> }
) {
  try {
    const { wallet } = await params;

    if (!wallet) {
      return NextResponse.json(
        { error: "Wallet address is required" },
        { status: 400 }
      );
    }

    // Get user by wallet address
    const { data: user } = await supabase
      .from("users")
      .select("id, wallet_address, username, created_at")
      .eq("wallet_address", wallet)
      .maybeSingle();

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Get user's campaigns
    const { data: campaigns, error: campaignsError } = await supabase
      .from("campaigns")
      .select("*")
      .eq("creator_id", user.id)
      .order("created_at", { ascending: false });

    if (campaignsError) {
      console.error("Error fetching campaigns:", campaignsError);
      return NextResponse.json(
        { error: "Failed to fetch campaigns" },
        { status: 500 }
      );
    }

    // Get user's submissions
    const { data: submissions, error: submissionsError } = await supabase
      .from("submissions")
      .select("*, campaigns(id, title, status)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (submissionsError) {
      console.error("Error fetching submissions:", submissionsError);
      return NextResponse.json(
        { error: "Failed to fetch submissions" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      user: {
        wallet_address: user.wallet_address,
        username: user.username,
        created_at: user.created_at,
      },
      campaigns: campaigns || [],
      submissions: submissions || [],
    });
  } catch (error) {
    console.error("Error in GET /api/profile/[wallet]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

