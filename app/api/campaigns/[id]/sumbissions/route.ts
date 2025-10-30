import { NextRequest, NextResponse } from "next/server";
import { supabase } from "../../../../../lib/supabase";

// POST /api/[id]/submission - Create a submission for a campaign
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) { 
  try {
    const { id } = await params;
    const body = await request.json();
    const { user_id, video_url, platform = "youtube" } = body ?? {};

    if (!user_id || !video_url) {
      return NextResponse.json(
        { error: "user_id and video_url are required" },
        { status: 400 }
      );
    }

    // If your FK is campaign_id, change contract_id -> campaign_id
    const { data, error } = await supabase
      .from("submissions")
      .insert({
        contract_id: id,
        user_id,
        video_url,
        platform,
        status: "pending",
      })
      .select("*")
      .single();

    if (error) {
      return NextResponse.json(
        { error: "Failed to create submission" },
        { status: 500 }
      );
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error("Error in POST /api/[id]/submission:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// GET /api/[id]/submission - List submissions for a campaign
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // If your FK is campaign_id, change contract_id -> campaign_id
    const { data, error } = await supabase
      .from("submissions")
      .select("id,user_id,platform,video_url,view_count,status,updated_at")
      .eq("contract_id", id)
      .order("updated_at", { ascending: false });

    if (error) {
      return NextResponse.json(
        { error: "Failed to load submissions" },
        { status: 500 }
      );
    }

    return NextResponse.json({ submissions: data ?? [] });
  } catch (error) {
    console.error("Error in GET /api/[id]/submission:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
