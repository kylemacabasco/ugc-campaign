"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/app/providers/AuthProvider";
import Link from "next/link";

interface Campaign {
  id: string;
  title: string;
  description: string | null;
  asset_folder_url: string | null;
  campaign_amount: number;
  rate_per_1k_views: number;
  creator_id: string;
}

export default function EditCampaignPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assetFolderUrl, setAssetFolderUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCampaign = async () => {
      try {
        const response = await fetch(`/api/campaigns/${params.id}`);
        if (!response.ok) {
          throw new Error("Campaign not found");
        }
        const data = await response.json();
        
        // Check if user is the creator
        if (user && data.creator_id !== user.id) {
          setError("You are not authorized to edit this campaign");
          return;
        }

        setCampaign(data);
        setTitle(data.title);
        setDescription(data.description || "");
        setAssetFolderUrl(data.asset_folder_url || "");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load campaign");
      } finally {
        setLoading(false);
      }
    };

    if (params.id && user) {
      fetchCampaign();
    } else if (!user) {
      setError("Please connect your wallet first");
      setLoading(false);
    }
  }, [params.id, user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      setError("Please connect your wallet first");
      return;
    }

    if (!title.trim()) {
      setError("Title is required");
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const response = await fetch(`/api/campaigns/${params.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          asset_folder_url: assetFolderUrl,
          updater_wallet: user.wallet_address,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update campaign");
      }

      // Success! Redirect to campaign page
      router.push(`/campaigns/${params.id}`);
    } catch (err) {
      console.error("Update error:", err);
      setError(err instanceof Error ? err.message : "Failed to update campaign");
    } finally {
      setSaving(false);
    }
  };

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
        <div className="text-xl text-red-500">{error || "Campaign not found"}</div>
        <Link
          href="/"
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Back to Home
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Edit Campaign</h1>
            <Link
              href={`/campaigns/${params.id}`}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              ← Back to Campaign
            </Link>
          </div>

          {/* Notice about locked fields */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-blue-800">
              <strong>Note:</strong> Campaign amount and rate cannot be changed after creation.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Title */}
            <div>
              <label
                htmlFor="title"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                placeholder="My Awesome Campaign"
              />
            </div>

            {/* Description */}
            <div>
              <label
                htmlFor="description"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Description
              </label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                placeholder="Describe your campaign…"
              />
            </div>

            {/* Asset Folder URL */}
            <div>
              <label
                htmlFor="assetFolder"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Asset Folder URL
              </label>
              <input
                type="url"
                id="assetFolder"
                value={assetFolderUrl}
                onChange={(e) => setAssetFolderUrl(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                placeholder="https://drive.google.com/…"
              />
              <p className="mt-1 text-sm text-gray-500">
                Link to folder with campaign assets, guidelines, etc.
              </p>
            </div>

            {/* Locked Fields (Read-only display) */}
            <div className="border-t pt-6">
              <h3 className="text-sm font-medium text-gray-700 mb-4">
                Campaign Terms (Cannot be changed)
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="text-sm text-gray-500 mb-1">Total Budget</div>
                  <div className="text-xl font-bold text-gray-900">
                    {campaign.campaign_amount} SOL
                  </div>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="text-sm text-gray-500 mb-1">Rate per 1k Views</div>
                  <div className="text-xl font-bold text-gray-900">
                    ${campaign.rate_per_1k_views} USDC
                  </div>
                </div>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            {/* Submit Button */}
            <div className="flex gap-4">
              <button
                type="submit"
                disabled={saving}
                className="flex-1 bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition font-medium"
              >
                {saving ? "Saving…" : "Save Changes"}
              </button>
              <Link
                href={`/campaigns/${params.id}`}
                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition font-medium"
              >
                Cancel
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

