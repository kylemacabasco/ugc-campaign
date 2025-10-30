"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

interface User {
  wallet_address: string;
  username: string | null;
  created_at: string;
}

interface Campaign {
  id: string;
  title: string;
  description: string;
  campaign_amount: number;
  rate_per_1k_views: number;
  status: string;
  created_at: string;
}

interface Submission {
  id: string;
  video_url: string;
  status: string;
  view_count: number;
  earned_amount: number;
  created_at: string;
  campaigns: {
    id: string;
    title: string;
    status: string;
  };
}

interface ProfileData {
  user: User;
  campaigns: Campaign[];
  submissions: Submission[];
}

export default function ProfilePage() {
  const params = useParams();
  const router = useRouter();
  const [data, setData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await fetch(`/api/profile/${params.wallet}`);
        if (!response.ok) {
          throw new Error("User not found");
        }
        const profileData = await response.json();
        setData(profileData);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load profile");
      } finally {
        setLoading(false);
      }
    };

    if (params.wallet) {
      fetchProfile();
    }
  }, [params.wallet]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl animate-pulse">Loading profile…</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <div className="text-xl text-red-500">{error || "Profile not found"}</div>
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
      case "inactive":
        return "bg-yellow-100 text-yellow-800";
      case "completed":
        return "bg-blue-100 text-blue-800";
      case "approved":
        return "bg-green-100 text-green-800";
      case "rejected":
        return "bg-red-100 text-red-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* User Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {data.user.username || "Anonymous User"}
          </h1>
          <p className="text-sm text-gray-600 font-mono break-all">
            {data.user.wallet_address}
          </p>
          <p className="text-sm text-gray-500 mt-2">
            Joined {new Date(data.user.created_at).toLocaleDateString()}
          </p>
        </div>

        {/* My Campaigns Section */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            My Campaigns ({data.campaigns.length})
          </h2>

          {data.campaigns.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <p>No campaigns created yet</p>
              <Link
                href="/create-campaign"
                className="mt-4 inline-block px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Create Your First Campaign
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {data.campaigns.map((campaign) => (
                <Link
                  key={campaign.id}
                  href={`/campaigns/${campaign.id}`}
                  className="block border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-semibold text-gray-900 truncate">
                        {campaign.title}
                      </h3>
                      <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                        {campaign.description}
                      </p>
                      <div className="flex gap-4 mt-3 text-sm text-gray-600">
                        <span>Budget: {campaign.campaign_amount} SOL</span>
                        <span>Rate: ${campaign.rate_per_1k_views} USDC/1k views</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-2">
                        Created {new Date(campaign.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(
                        campaign.status
                      )}`}
                    >
                      {campaign.status.toUpperCase()}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* My Submissions Section */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            My Submissions ({data.submissions.length})
          </h2>

          {data.submissions.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <p>No submissions yet</p>
              <p className="text-sm mt-2">
                Browse campaigns and submit your content!
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {data.submissions.map((submission) => (
                <div
                  key={submission.id}
                  className="border border-gray-200 rounded-lg p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <Link
                        href={`/campaigns/${submission.campaigns.id}`}
                        className="text-sm font-medium text-blue-600 hover:text-blue-800 truncate block"
                      >
                        Campaign: {submission.campaigns.title}
                      </Link>
                      <a
                        href={submission.video_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block text-sm text-gray-700 hover:text-gray-900 mt-2"
                      >
                        {submission.video_url}
                      </a>
                      <div className="flex gap-4 mt-3 text-sm text-gray-600">
                        <span>Views: {submission.view_count.toLocaleString()}</span>
                        <span>Earned: ${submission.earned_amount.toFixed(2)} USDC</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-2">
                        Submitted {new Date(submission.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(
                        submission.status
                      )}`}
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

