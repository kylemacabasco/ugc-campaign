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
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
          <div className="flex items-start justify-between mb-4">
            <h1 className="text-3xl font-bold text-gray-900">
              {campaign.title}
            </h1>
            <span
              className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(
                campaign.status
              )}`}
            >
              {campaign.status.toUpperCase()}
            </span>
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
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Submissions ({submissions.length})
          </h2>

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
