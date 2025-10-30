"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

interface Campaign {
  id: string;
  title: string;
  description: string;
  campaign_amount: number;
  rate_per_1k_views: number;
  status: string;
  created_at: string;
  creator: {
    wallet_address: string;
    username?: string;
  };
}

export default function CampaignDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCampaign = async () => {
      try {
        const response = await fetch(`/api/campaigns/${params.id}`);
        
        if (!response.ok) {
          throw new Error("Campaign not found");
        }

        const data = await response.json();
        setCampaign(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load campaign");
      } finally {
        setLoading(false);
      }
    };

    if (params.id) {
      fetchCampaign();
    }
  }, [params.id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading campaign...</div>
      </div>
    );
  }

  if (error || !campaign) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <div className="text-xl text-red-500">{error || "Campaign not found"}</div>
        <button
          onClick={() => router.push("/")}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Back to Home
        </button>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800";
      case "draft":
        return "bg-yellow-100 text-yellow-800";
      case "ended":
        return "bg-gray-100 text-gray-800";
      case "inactive":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-start justify-between mb-4">
            <h1 className="text-3xl font-bold text-gray-900">{campaign.title}</h1>
            <span
              className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(
                campaign.status
              )}`}
            >
              {campaign.status.toUpperCase()}
            </span>
          </div>

          <p className="text-gray-600 mb-4">{campaign.description}</p>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-sm text-gray-500 mb-1">Total Budget</div>
              <div className="text-2xl font-bold text-gray-900">
                {campaign.campaign_amount} SOL
              </div>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-sm text-gray-500 mb-1">Rate per 1k Views</div>
              <div className="text-2xl font-bold text-gray-900">
                {campaign.rate_per_1k_views} SOL
              </div>
            </div>
          </div>

          <div className="border-t pt-4">
            <div className="text-sm text-gray-500">Created by</div>
            <div className="text-gray-900 font-medium">
              {campaign.creator.username || 
                `${campaign.creator.wallet_address.slice(0, 4)}...${campaign.creator.wallet_address.slice(-4)}`}
            </div>
          </div>
        </div>

        {/* Submissions Section - Placeholder for PR #6 */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Submissions</h2>
          <div className="text-center py-12 text-gray-500">
            <p>Submission display coming in next PR...</p>
            <p className="text-sm mt-2">This will show all submitted content for this campaign</p>
          </div>
        </div>
      </div>
    </div>
  );
}

