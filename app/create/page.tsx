"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useWallet } from "@solana/wallet-adapter-react";
import { useAuth } from "../providers/AuthProvider";

export default function CreateCampaignPage() {
  const router = useRouter();
  const { publicKey } = useWallet();
  const { user } = useAuth();

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    requirements: "",
    bountyAmount: "",
    ratePer1kViews: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) return setError("Please sign in.");
    if (!publicKey) return setError("Please connect your wallet.");

    const title = formData.title.trim();
    const bounty = Number(formData.bountyAmount);
    const rate = Number(formData.ratePer1kViews);

    if (title.length < 3) return setError("Title must be at least 3 characters.");
    if (!Number.isFinite(bounty) || bounty <= 0) return setError("Bounty must be a positive number.");
    if (!Number.isFinite(rate) || rate <= 0) return setError("Rate per 1k views must be a positive number.");

    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          // Server will generate/ensure a unique slug
          title,
          description: formData.description,
          requirements: formData.requirements,
          campaign_amount: bounty,
          rate_per_1k_views: rate,
          creator_wallet: publicKey.toBase58(), // remove if your API derives from auth
        }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || "Failed to create campaign");

      const created = data?.campaign ?? data;
      const id = created?.id ?? created?.campaign?.id;
      if (!id) throw new Error("Campaign created, but no id returned.");

      setSuccess("Campaign created. Redirecting to fund…");
      router.push(`/campaigns/${id}/fund`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create campaign");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-600">Please sign in to create a campaign.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Create New Campaign</h1>
          <p className="text-gray-600 mt-2">Set up a campaign for UGC creators</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-6">
          {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">{error}</div>}
          {success && <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">{success}</div>}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Title</label>
            <input
              type="text"
              required
              className="w-full border border-gray-300 rounded-md px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder:text-gray-500"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g., Product Review Campaign"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
            <textarea
              required
              rows={4}
              className="w-full border border-gray-300 rounded-md px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder:text-gray-500"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe what creators need to do..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Requirements</label>
            <textarea
              required
              rows={3}
              className="w-full border border-gray-300 rounded-md px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder:text-gray-500"
              value={formData.requirements}
              onChange={(e) => setFormData({ ...formData, requirements: e.target.value })}
              placeholder="e.g., Feature our product for at least 10 seconds, mention our brand name..."
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Bounty Amount (SOL)</label>
              <input
                inputMode="decimal"
                type="number"
                required
                step="0.000001"
                min="0.000001"
                className="w-full border border-gray-300 rounded-md px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder:text-gray-500"
                value={formData.bountyAmount}
                onChange={(e) => setFormData({ ...formData, bountyAmount: e.target.value })}
                placeholder="10.000000"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Rate per 1k Views (SOL)</label>
              <input
                inputMode="decimal"
                type="number"
                required
                step="0.000001"
                min="0.000001"
                className="w-full border border-gray-300 rounded-md px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder:text-gray-500"
                value={formData.ratePer1kViews}
                onChange={(e) => setFormData({ ...formData, ratePer1kViews: e.target.value })}
                placeholder="0.500000"
              />
            </div>
          </div>

          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => router.back()}
              className="flex-1 px-6 py-3 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? "Creating..." : "Create Campaign"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
