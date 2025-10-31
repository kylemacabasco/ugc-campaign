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
      <div className="min-h-screen flex items-center justify-center bg-cream">
        <div className="text-center">
          <div className="animate-spin h-10 w-10 border-3 border-sage border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-charcoal-light text-xl">Loading campaign…</p>
        </div>
      </div>
    );
  }

  if (error || !campaign) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-6 bg-cream">
        <div className="text-xl text-red-700">{error || "Campaign not found"}</div>
        <Link
          href="/"
          className="px-6 py-3 bg-sage text-white rounded-xl hover:bg-sage-dark transition-all shadow-soft"
        >
          Back to Home
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream py-10 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-card rounded-xl shadow-soft p-8 border-2 border-border">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-2xl font-bold text-charcoal tracking-tight">Edit Campaign</h1>
            <Link
              href={`/campaigns/${params.id}`}
              className="text-sm text-sage-dark hover:text-sage transition"
            >
              ← Back to Campaign
            </Link>
          </div>

          {/* Notice about locked fields */}
          <div className="bg-sage/5 border-2 border-sage/20 rounded-lg p-5 mb-8">
            <p className="text-sm text-charcoal-light leading-relaxed">
              <strong className="text-charcoal">Note:</strong> Campaign amount and rate cannot be changed after creation.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Title */}
            <div>
              <label
                htmlFor="title"
                className="block text-sm font-medium text-charcoal mb-2"
              >
                Title <span className="text-red-600">*</span>
              </label>
              <input
                type="text"
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                maxLength={200}
                className="w-full px-4 py-3 border-2 border-border rounded-lg focus:border-sage focus:outline-none transition-all text-charcoal bg-parchment"
                placeholder="My Awesome Campaign"
              />
              <p className="mt-2 text-sm text-charcoal-light">
                {title.length}/200 characters
              </p>
            </div>

            {/* Description */}
            <div>
              <label
                htmlFor="description"
                className="block text-sm font-medium text-charcoal mb-2"
              >
                Description
              </label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                maxLength={5000}
                className="w-full px-4 py-3 border-2 border-border rounded-lg focus:border-sage focus:outline-none transition-all text-charcoal bg-parchment"
                placeholder="Describe your campaign…"
              />
              <p className="mt-2 text-sm text-charcoal-light">
                {description.length}/5000 characters
              </p>
            </div>

            {/* Asset Folder URL */}
            <div>
              <label
                htmlFor="assetFolder"
                className="block text-sm font-medium text-charcoal mb-2"
              >
                Asset Folder URL
              </label>
              <input
                type="url"
                id="assetFolder"
                value={assetFolderUrl}
                onChange={(e) => setAssetFolderUrl(e.target.value)}
                className="w-full px-4 py-3 border-2 border-border rounded-lg focus:border-sage focus:outline-none transition-all text-charcoal bg-parchment"
                placeholder="https://drive.google.com/…"
              />
              <p className="mt-2 text-sm text-charcoal-light">
                Link to folder with campaign assets, guidelines, etc.
              </p>
            </div>

            {/* Locked Fields (Read-only display) */}
            <div className="border-t-2 border-border pt-8">
              <h3 className="text-sm font-medium text-charcoal mb-5">
                Campaign Terms (Cannot be changed)
              </h3>
              <div className="grid grid-cols-2 gap-6">
                <div className="bg-parchment p-5 rounded-lg border border-border">
                  <div className="text-sm text-charcoal-light mb-2 font-medium">Total Budget</div>
                  <div className="text-xl font-bold text-charcoal">
                    {campaign.campaign_amount} SOL
                  </div>
                </div>
                <div className="bg-parchment p-5 rounded-lg border border-border">
                  <div className="text-sm text-charcoal-light mb-2 font-medium">Rate per 1k Views</div>
                  <div className="text-xl font-bold text-charcoal">
                    ${campaign.rate_per_1k_views} USDC
                  </div>
                </div>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border-2 border-red-200/50 text-red-700 px-5 py-4 rounded-lg">
                {error}
              </div>
            )}

            {/* Submit Button */}
            <div className="flex gap-4 pt-4">
              <button
                type="submit"
                disabled={saving}
                className="flex-1 bg-sage text-white py-3.5 px-4 rounded-xl hover:bg-sage-dark disabled:bg-charcoal-light/30 disabled:cursor-not-allowed transition-all font-medium shadow-soft hover:shadow-soft-lg"
              >
                {saving ? "Saving…" : "Save Changes"}
              </button>
              <Link
                href={`/campaigns/${params.id}`}
                className="px-6 py-3.5 border-2 border-border text-charcoal rounded-xl hover:bg-parchment transition-all font-medium inline-flex items-center"
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

