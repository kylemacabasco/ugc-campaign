"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/app/providers/AuthProvider";
import Link from "next/link";

interface Campaign {
  id: string;
  title: string;
  description: string;
  campaign_amount: number;
  rate_per_1k_views: number;
  status: string;
  creator_id: string;
  distributed: boolean;
}

interface Submission {
  id: string;
  user_id: string;
  video_url: string;
  status: string;
  view_count: number;
  earned_amount: number;
  created_at: string;
  users?: {
    wallet_address: string;
    username: string;
  };
}

export default function CampaignDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [distributing, setDistributing] = useState(false);
  const [ending, setEnding] = useState(false);
  
  // Check if current user is the campaign owner
  const isOwner = user && campaign && user.id === campaign.creator_id;

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch campaign
        const campaignResponse = await fetch(`/api/campaigns/${params.id}`);
        if (!campaignResponse.ok) {
          throw new Error("Campaign not found");
        }
        const campaignData = await campaignResponse.json();
        setCampaign(campaignData);

        // Fetch submissions
        const submissionsResponse = await fetch(`/api/submissions?campaign_id=${params.id}`);
        if (submissionsResponse.ok) {
          const submissionsData = await submissionsResponse.json();
          setSubmissions(submissionsData);
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load campaign"
        );
      } finally {
        setLoading(false);
      }
    };

    if (params.id) {
      fetchData();
    }
  }, [params.id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl animate-pulse">Loading campaign…</div>
      </div>
    );
  }

  if (error || !campaign) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <div className="text-xl text-red-500">
          {error || "Campaign not found"}
        </div>
        <button
          onClick={() => router.push("/")}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Back to Home
        </button>
      </div>
    );
  }

  const handleRefreshViews = async () => {
    if (!params.id) return;
    
    setRefreshing(true);
    try {
      const response = await fetch(`/api/campaigns/${params.id}/refresh-views`, {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Failed to refresh views");
      }

      // Refetch submissions to get updated data
      const submissionsResponse = await fetch(`/api/submissions?campaign_id=${params.id}`);
      if (submissionsResponse.ok) {
        const submissionsData = await submissionsResponse.json();
        setSubmissions(submissionsData);
      }
    } catch (err) {
      console.error("Error refreshing views:", err);
      alert("Failed to refresh views. Please try again.");
    } finally {
      setRefreshing(false);
    }
  };

  const handleDistributePayouts = async () => {
    if (!params.id || !user) return;

    const confirmed = confirm(
      "Are you sure you want to distribute payouts? This action cannot be undone."
    );
    if (!confirmed) return;

    setDistributing(true);
    try {
      // Fetch submissions with user wallet addresses
      const submissionsResponse = await fetch(
        `${process.env.NEXT_PUBLIC_SITE_URL || ""}/api/submissions?campaign_id=${params.id}`
      );
      
      if (!submissionsResponse.ok) {
        throw new Error("Failed to fetch submissions");
      }
      
      const allSubmissions: Submission[] = await submissionsResponse.json();
      
      // Filter approved submissions with earnings
      const approvedSubmissions = allSubmissions.filter(
        (s) => s.status === "approved" && s.earned_amount > 0
      );

      if (approvedSubmissions.length === 0) {
        alert("No approved submissions with earnings to distribute");
        setDistributing(false);
        return;
      }

      // Calculate total and build distribution list
      const totalOwed = approvedSubmissions.reduce((sum, s) => sum + s.earned_amount, 0);
      
      // Build detailed distribution list
      const distributionList = approvedSubmissions
        .map((s, i) => 
          `${i + 1}. ${s.users?.wallet_address || s.user_id.slice(0, 8)}: $${s.earned_amount.toFixed(2)} USDC`
        )
        .join("\n");
      
      alert(
        `Distribution Summary:\n\n` +
        `${approvedSubmissions.length} creators to pay\n` +
        `Total: $${totalOwed.toFixed(2)} USDC\n\n` +
        `Recipients:\n${distributionList}\n\n` +
        `Please manually send USDC to each creator.\n\n` +
        `Once complete, the campaign will be marked as distributed.`
      );

      // Mark as distributed
      const response = await fetch(`/api/campaigns/${params.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          updater_wallet: user.wallet_address,
          distributed: true,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to mark campaign as distributed");
      }

      // Refetch campaign
      const campaignResponse = await fetch(`/api/campaigns/${params.id}`);
      if (campaignResponse.ok) {
        const campaignData = await campaignResponse.json();
        setCampaign(campaignData);
      }

      alert("Campaign marked as distributed!");
    } catch (err) {
      console.error("Error distributing payouts:", err);
      alert(`Failed to distribute payouts: ${err instanceof Error ? err.message : "Unknown error"}`);
    } finally {
      setDistributing(false);
    }
  };

  const handleEndCampaign = async () => {
    if (!params.id || !user) return;

    const confirmed = confirm(
      "Are you sure you want to end this campaign? This will stop accepting new submissions and allow you to distribute payouts."
    );
    if (!confirmed) return;

    setEnding(true);
    try {
      const response = await fetch(`/api/campaigns/${params.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          updater_wallet: user.wallet_address,
          status: "ended",
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to end campaign");
      }

      // Refetch campaign
      const campaignResponse = await fetch(`/api/campaigns/${params.id}`);
      if (campaignResponse.ok) {
        const campaignData = await campaignResponse.json();
        setCampaign(campaignData);
      }

      alert("Campaign ended successfully!");
    } catch (err) {
      console.error("Error ending campaign:", err);
      alert(`Failed to end campaign: ${err instanceof Error ? err.message : "Unknown error"}`);
    } finally {
      setEnding(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800";
      case "draft":
        return "bg-gray-100 text-gray-800";
      case "ended":
        return "bg-blue-100 text-blue-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Campaign Details */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-start justify-between mb-4 gap-3">
            <div className="flex-1 min-w-0">
              <h1 className="text-3xl font-bold text-gray-900 break-words">
                {campaign.title}
              </h1>
            </div>
            <div className="flex items-center gap-3">
              {isOwner && campaign.status === "active" && (
                <button
                  onClick={handleEndCampaign}
                  disabled={ending}
                  className="px-4 py-2 text-sm bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition font-medium whitespace-nowrap"
                >
                  {ending ? "Ending…" : "End Campaign"}
                </button>
              )}
              {isOwner && campaign.status === "ended" && !campaign.distributed && (
                <button
                  onClick={handleDistributePayouts}
                  disabled={distributing}
                  className="px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition font-medium whitespace-nowrap"
                >
                  {distributing ? "Distributing…" : "Distribute Payouts"}
                </button>
              )}
              {isOwner && (
                <Link
                  href={`/campaigns/${params.id}/edit`}
                  className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium whitespace-nowrap"
                >
                  Edit
                </Link>
              )}
              {campaign.distributed && (
                <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-medium whitespace-nowrap">
                  DISTRIBUTED
                </span>
              )}
              <span
                className={`px-3 py-1 rounded-full text-sm font-medium whitespace-nowrap ${getStatusColor(
                  campaign.status
                )}`}
              >
                {campaign.status.toUpperCase()}
              </span>
            </div>
          </div>

          <p className="text-gray-600 mb-6">{campaign.description}</p>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-sm text-gray-500 mb-1">Total Budget</div>
              <div className="text-2xl font-bold text-gray-900">
                {campaign.campaign_amount} SOL
              </div>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-sm text-gray-500 mb-1">
                Rate per 1k Views
              </div>
              <div className="text-2xl font-bold text-gray-900">
                ${campaign.rate_per_1k_views} USDC
              </div>
            </div>
          </div>
        </div>

        {/* Submissions Section */}
        <div className="bg-white rounded-lg shadow-md p-6 mt-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-gray-900">
              Submissions ({submissions.length})
            </h2>
            {submissions.length > 0 && (
              <button
                onClick={handleRefreshViews}
                disabled={refreshing}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition"
              >
                {refreshing ? "Refreshing…" : "Refresh Views"}
              </button>
            )}
          </div>

          {submissions.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <p>No submissions yet</p>
              <p className="text-sm mt-2">Be the first to submit content!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {submissions.map((submission) => (
                <div
                  key={submission.id}
                  className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <a
                        href={submission.video_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 font-medium"
                      >
                        {submission.video_url}
                      </a>
                      <div className="flex gap-4 mt-2 text-sm text-gray-600">
                        <span>Views: {submission.view_count.toLocaleString()}</span>
                        <span>Earned: ${submission.earned_amount.toFixed(2)} USDC</span>
                        <span>
                          Submitted: {new Date(submission.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${
                        submission.status === "approved"
                          ? "bg-green-100 text-green-800"
                          : submission.status === "rejected"
                          ? "bg-red-100 text-red-800"
                          : "bg-yellow-100 text-yellow-800"
                      }`}
                    >
                      {submission.status.toUpperCase()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
