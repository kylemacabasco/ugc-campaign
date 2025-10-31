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
    const { status, updater_wallet, funding_tx_signature, funded_at, title, description, asset_folder_url, distributed } = body;

    if (!updater_wallet) {
      return NextResponse.json(
        { error: "updater_wallet is required" },
        { status: 400 }
      );
    }

    // Get campaign
    const { data: campaign } = await supabase
      .from("campaigns")
      .select("id, creator_id, status, distributed")
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
      
      // Set ended_at timestamp when campaign ends
      if (status === "ended") {
        updates.ended_at = new Date().toISOString();
      }
    }

    // Add funding transaction fields if provided
    if (funding_tx_signature) {
      // Validate funding transaction signature format
      if (typeof funding_tx_signature !== 'string' || funding_tx_signature.trim().length === 0) {
        return NextResponse.json(
          { error: "Invalid funding_tx_signature: must be a non-empty string" },
          { status: 400 }
        );
      }
      
      // Validate Solana transaction signature format (base58, typically 87-88 chars)
      const base58Regex = /^[1-9A-HJ-NP-Za-km-z]{87,88}$/;
      if (!base58Regex.test(funding_tx_signature.trim())) {
        return NextResponse.json(
          { error: "Invalid funding_tx_signature: must be a valid Solana transaction signature" },
          { status: 400 }
        );
      }
      
      updates.funding_tx_signature = funding_tx_signature.trim();
    }

    if (funded_at) {
      updates.funded_at = funded_at;
    }

    // Allow updating campaign details (but not financial terms)
    if (title !== undefined) {
      if (!title || title.trim().length === 0) {
        return NextResponse.json(
          { error: "Title cannot be empty" },
          { status: 400 }
        );
      }
      if (title.trim().length > 200) {
        return NextResponse.json(
          { error: "Title cannot exceed 200 characters" },
          { status: 400 }
        );
      }
      updates.title = title.trim();
    }

    if (description !== undefined) {
      const trimmedDesc = description ? description.trim() : null;
      if (trimmedDesc && trimmedDesc.length > 5000) {
        return NextResponse.json(
          { error: "Description cannot exceed 5000 characters" },
          { status: 400 }
        );
      }
      updates.description = trimmedDesc;
    }

    if (asset_folder_url !== undefined) {
      const trimmedUrl = asset_folder_url ? asset_folder_url.trim() : null;
      // Basic URL validation if provided
      if (trimmedUrl) {
        try {
          new URL(trimmedUrl);
        } catch {
          return NextResponse.json(
            { error: "Asset folder URL must be a valid URL" },
            { status: 400 }
          );
        }
      }
      updates.asset_folder_url = trimmedUrl;
    }

    // Handle distribution marking
    if (distributed !== undefined) {
      if (typeof distributed !== "boolean") {
        return NextResponse.json(
          { error: "distributed must be a boolean" },
          { status: 400 }
        );
      }
      
      // Validate distribution prerequisites
      if (distributed === true) {
        if (campaign.status !== "ended") {
          return NextResponse.json(
            { error: "Campaign must be ended before distributing payouts" },
            { status: 400 }
          );
        }
        if (campaign.distributed) {
          return NextResponse.json(
            { error: "Payouts have already been distributed for this campaign" },
            { status: 400 }
          );
        }
        updates.distributed_at = new Date().toISOString();
      } else {
        // If undoing distribution, clear the timestamp
        updates.distributed_at = null;
      }
      
      updates.distributed = distributed;
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
