import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

// GET /api/campaigns/[id] - Get single campaign
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const { data, error } = await supabase
      .from("campaigns")
      .select(`
        *,
        creator:users!creator_id(wallet_address, username)
      `)
      .eq("id", id)
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: "Campaign not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error in GET /api/campaigns/[id]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PATCH /api/campaigns/[id] - Update campaign
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { status, updater_wallet } = body;

    if (!updater_wallet) {
      return NextResponse.json(
        { error: "updater_wallet is required" },
        { status: 400 }
      );
    }

    // Get campaign with creator info
    const { data: campaign, error: campaignError } = await supabase
      .from("campaigns")
      .select(`
        id,
        creator_id,
        users!creator_id(wallet_address)
      `)
      .eq("id", id)
      .single();

    if (campaignError || !campaign) {
      return NextResponse.json(
        { error: "Campaign not found" },
        { status: 404 }
      );
    }

    // Check authorization: only campaign creator can update
    const creatorData = campaign.users as any;
    const creatorWallet = creatorData?.wallet_address;

    if (creatorWallet !== updater_wallet) {
      return NextResponse.json(
        { error: "Only campaign creator can update campaigns" },
        { status: 403 }
      );
    }

    // Build update object
    const updates: any = {};
    if (status) {
      if (!["inactive", "active", "completed", "cancelled"].includes(status)) {
        return NextResponse.json(
          {
            error:
              "Invalid status. Must be: inactive, active, completed, or cancelled",
          },
          { status: 400 }
        );
      }
      updates.status = status;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: "No valid fields to update" },
        { status: 400 }
      );
    }

    // Update campaign
    const { data: updated, error: updateError } = await supabase
      .from("campaigns")
      .update(updates)
      .eq("id", id)
      .select(`
        *,
        creator:users!creator_id(wallet_address, username)
      `)
      .single();

    if (updateError) {
      console.error("Error updating campaign:", updateError);
      return NextResponse.json(
        { error: "Failed to update campaign" },
        { status: 500 }
      );
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error in PATCH /api/campaigns/[id]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
