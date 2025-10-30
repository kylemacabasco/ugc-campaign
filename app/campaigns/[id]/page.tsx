"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useWallet } from "@solana/wallet-adapter-react";
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
  metadata?: {
    requirements?: string;
  };
}

interface Submission {
  id: string;
  video_url: string;
  status: string;
  view_count: number;
  earned_amount: number;
  created_at: string;
}

export default function CampaignDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { publicKey } = useWallet();
  const { user } = useAuth();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [videoUrl, setVideoUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  
  // Check if current user is the campaign creator
  const isOwner = user && campaign && user.id === campaign.creator_id;
  // Check if user can submit (authenticated, not creator, campaign is active)
  const canSubmit = user && publicKey && !isOwner && campaign?.status === "active";

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

  const handleSubmitVideo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!videoUrl.trim() || !params.id) return;

    // Check if wallet is connected
    if (!publicKey) {
      alert("Please connect your wallet to submit a video");
      return;
    }

    // Check if user is the creator
    if (isOwner) {
      alert("Campaign creators cannot submit to their own campaigns");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch("/api/submissions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          campaign_id: params.id,
          submitter_wallet: publicKey.toBase58(),
          video_url: videoUrl.trim(),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to submit video");
      }

      // Refetch submissions to show the new one
      const submissionsResponse = await fetch(`/api/submissions?campaign_id=${params.id}`);
      if (submissionsResponse.ok) {
        const submissionsData = await submissionsResponse.json();
        setSubmissions(submissionsData);
      }

      // Reset form and close modal
      setVideoUrl("");
      setShowSubmitModal(false);
      alert("Video submitted successfully!");
    } catch (err) {
      console.error("Error submitting video:", err);
      alert(err instanceof Error ? err.message : "Failed to submit video. Please try again.");
    } finally {
      setSubmitting(false);
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
              {isOwner && (
                <Link
                  href={`/campaigns/${params.id}/edit`}
                  className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium whitespace-nowrap"
                >
                  Edit
                </Link>
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

          {campaign.metadata?.requirements && (
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Requirements
              </h3>
              <p className="text-gray-700 whitespace-pre-wrap">
                {campaign.metadata.requirements}
              </p>
            </div>
          )}

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
            <div className="flex gap-3">
              {canSubmit && (
                <button
                  onClick={() => setShowSubmitModal(true)}
                  className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition font-medium"
                >
                  Submit Video
                </button>
              )}
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
          </div>

          {submissions.length === 0 ? (
            <div className="text-center py-12 text-gray-600">
              <p className="text-lg">No submissions yet</p>
              <p className="text-base mt-2">Be the first to submit content!</p>
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
                      <div className="flex gap-4 mt-2 text-base text-gray-700">
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

        {/* Submit Video Modal */}
        {showSubmitModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
              <h3 className="text-2xl font-bold text-gray-900 mb-4">
                Submit Your Video
              </h3>
              {!publicKey && (
                <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-base text-yellow-900 font-medium">
                    Please connect your wallet to submit a video
                  </p>
                </div>
              )}
              {isOwner && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-base text-red-900 font-medium">
                    Campaign creators cannot submit to their own campaigns
                  </p>
                </div>
              )}
              <form onSubmit={handleSubmitVideo}>
                <div className="mb-4">
                  <label
                    htmlFor="videoUrl"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Video URL
                  </label>
                  <input
                    type="url"
                    id="videoUrl"
                    value={videoUrl}
                    onChange={(e) => setVideoUrl(e.target.value)}
                    placeholder="https://www.youtube.com/watch?v=…"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent placeholder:text-gray-600"
                    required
                    disabled={!publicKey || !!isOwner}
                  />
                  <p className="text-sm text-gray-600 mt-2">
                    Enter the URL of your YouTube video
                  </p>
                </div>

                <div className="flex gap-3 justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setShowSubmitModal(false);
                      setVideoUrl("");
                    }}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
                    disabled={submitting}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting || !videoUrl.trim() || !publicKey || !!isOwner}
                    className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition"
                  >
                    {submitting ? "Submitting…" : "Submit"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
