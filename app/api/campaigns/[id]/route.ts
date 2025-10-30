import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

// GET /api/campaigns/[id] - Get single campaign
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const { data } = await supabase
      .from("campaigns")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (!data) {
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
    const { status, updater_wallet, funding_tx_signature, funded_at } = body;

    if (!updater_wallet) {
      return NextResponse.json(
        { error: "updater_wallet is required" },
        { status: 400 }
      );
    }

    // Get campaign
    const { data: campaign } = await supabase
      .from("campaigns")
      .select("id, creator_id")
      .eq("id", id)
      .maybeSingle();

    if (!campaign) {
      return NextResponse.json(
        { error: "Campaign not found" },
        { status: 404 }
      );
    }

    // Check authorization: only campaign creator can update
    const { data: creator } = await supabase
      .from("users")
      .select("wallet_address")
      .eq("id", campaign.creator_id)
      .maybeSingle();

    if (!creator || creator.wallet_address !== updater_wallet) {
      return NextResponse.json(
        { error: "Only campaign creator can update campaigns" },
        { status: 403 }
      );
    }

    // Build update object
    const updates: any = {};
    if (status) {
      if (!["draft", "active", "ended", "cancelled"].includes(status)) {
        return NextResponse.json(
          {
            error:
              "Invalid status. Must be: draft, active, ended, or cancelled",
          },
          { status: 400 }
        );
      }
      updates.status = status;
    }

    // Add funding transaction fields if provided
    if (funding_tx_signature) {
      updates.funding_tx_signature = funding_tx_signature;
    }

    if (funded_at) {
      updates.funded_at = funded_at;
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
      .select("*")
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
