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
      <div className="min-h-screen flex items-center justify-center bg-cream">
        <div className="text-center">
          <div className="animate-spin h-10 w-10 border-3 border-sage border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-charcoal-light text-xl">Loading profile…</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-6 bg-cream">
        <div className="text-xl text-red-700">{error || "Profile not found"}</div>
        <button
          onClick={() => router.push("/")}
          className="px-6 py-3 bg-sage text-white rounded-xl hover:bg-sage-dark transition-all shadow-soft"
        >
          Back to Home
        </button>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "badge-active text-white";
      case "draft":
        return "bg-charcoal-light/10 text-charcoal-light border border-charcoal-light/20";
      case "ended":
        return "bg-earth/10 text-earth-dark border border-earth/20";
      case "approved":
        return "badge-approved text-white";
      case "rejected":
        return "bg-red-100/50 text-red-800 border border-red-200/50";
      case "pending":
        return "bg-earth/10 text-earth-dark border border-earth/20";
      default:
        return "bg-parchment text-charcoal border border-border";
    }
  };

  return (
    <div className="min-h-screen bg-cream py-10 px-4">
      <div className="max-w-4xl mx-auto">
        {/* User Header */}
        <div className="bg-card rounded-xl shadow-soft p-8 mb-8 border-2 border-border">
          <h1 className="text-3xl font-bold text-charcoal mb-3 tracking-tight">
            {data.user.username || "Anonymous User"}
          </h1>
          <p className="text-sm text-charcoal-light font-mono break-all">
            {data.user.wallet_address}
          </p>
          <p className="text-sm text-charcoal-light mt-3">
            Joined {new Date(data.user.created_at).toLocaleDateString()}
          </p>
        </div>

        {/* My Campaigns Section */}
        <div className="bg-card rounded-xl shadow-soft p-8 mb-8 border-2 border-border">
          <h2 className="text-2xl font-bold text-charcoal mb-6 tracking-tight">
            My Campaigns ({data.campaigns.length})
          </h2>

          {data.campaigns.length === 0 ? (
            <div className="text-center py-16 text-charcoal-light">
              <p className="text-lg">No campaigns created yet</p>
              <Link
                href="/create"
                className="mt-6 inline-block px-6 py-3 bg-sage text-white rounded-xl hover:bg-sage-dark transition-all shadow-soft"
              >
                Create Your First Campaign
              </Link>
            </div>
          ) : (
            <div className="space-y-5">
              {data.campaigns.map((campaign) => (
                <Link
                  key={campaign.id}
                  href={`/campaigns/${campaign.id}`}
                  className="block border-2 border-border rounded-lg p-6 hover:border-sage/30 hover:bg-parchment transition-all"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-semibold text-charcoal truncate">
                        {campaign.title}
                      </h3>
                      <p className="text-sm text-charcoal-light mt-2 line-clamp-2 leading-relaxed">
                        {campaign.description}
                      </p>
                      <div className="flex gap-6 mt-4 text-sm text-charcoal-light">
                        <span>Budget: {campaign.campaign_amount} SOL</span>
                        <span>Rate: ${campaign.rate_per_1k_views} USDC/1k views</span>
                      </div>
                      <p className="text-xs text-charcoal-light mt-3">
                        Created {new Date(campaign.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <span
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium ${getStatusColor(
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
        <div className="bg-card rounded-xl shadow-soft p-8 border-2 border-border">
          <h2 className="text-2xl font-bold text-charcoal mb-6 tracking-tight">
            My Submissions ({data.submissions.length})
          </h2>

          {data.submissions.length === 0 ? (
            <div className="text-center py-16 text-charcoal-light">
              <p className="text-lg">No submissions yet</p>
              <p className="text-base mt-2">
                Browse campaigns and submit your content!
              </p>
            </div>
          ) : (
            <div className="space-y-5">
              {data.submissions.map((submission) => (
                <div
                  key={submission.id}
                  className="border-2 border-border rounded-lg p-6 hover:bg-parchment transition-all"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <Link
                        href={`/campaigns/${submission.campaigns.id}`}
                        className="text-sm font-medium text-sage-dark hover:text-sage truncate block transition"
                      >
                        Campaign: {submission.campaigns.title}
                      </Link>
                      <a
                        href={submission.video_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block text-sm text-charcoal-light hover:text-charcoal mt-2 transition break-all"
                      >
                        {submission.video_url}
                      </a>
                      <div className="flex gap-6 mt-4 text-sm text-charcoal-light">
                        <span>Views: {submission.view_count.toLocaleString()}</span>
                        <span>Earned: ${submission.earned_amount.toFixed(2)} USDC</span>
                      </div>
                      <p className="text-xs text-charcoal-light mt-3">
                        Submitted {new Date(submission.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <span
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium ${getStatusColor(
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

