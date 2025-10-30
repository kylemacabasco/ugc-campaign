"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type Submission = {
  id: string | number;
  user_id: string | null;
  platform: string | null;
  video_url: string;
  view_count: number | null;
  status: string | null;
  updated_at: string | null;
};

export default function CampaignContentList({ campaignId }: { campaignId: string }) {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | number | null>(null);
  const [bulkUpdating, setBulkUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getSubmissionStatusClasses = (status: Submission["status"]) => {
    switch (status) {
      case "approved":
        return "bg-emerald-100 text-emerald-800";
      case "rejected":
        return "bg-rose-100 text-rose-800";
      default:
        return "bg-slate-100 text-slate-700";
    }
  };

  // Fetch submissions via short route: /api/campaigns/[id]?include=submissions
  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/campaigns/${campaignId}?include=submissions`, { cache: "no-store" });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || "Failed to load submissions");
        if (mounted) setSubmissions(data.submissions || []);
      } catch (e: any) {
        if (mounted) setError(e?.message || "Failed to load submissions");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [campaignId]);

  // Update one submission via short route: POST /api/campaigns/[id] { op: "refresh_one_view", submission_id }
  const refreshOne = async (id: string | number) => {
    setUpdatingId(id);
    setError(null);
    try {
      const res = await fetch(`/api/campaigns/${campaignId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ op: "refresh_one_view", submission_id: id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to refresh view count");

      setSubmissions((prev) =>
        prev.map((s) =>
          String(s.id) === String(id)
            ? { ...s, view_count: data.view_count ?? s.view_count, updated_at: new Date().toISOString() }
            : s
        )
      );
    } catch (e: any) {
      setError(e?.message || "Failed to refresh view count");
    } finally {
      setUpdatingId(null);
    }
  };

  // Bulk update via short route: POST /api/campaigns/[id] { op: "refresh_all_views" }
  const refreshAll = async () => {
    setBulkUpdating(true);
    setError(null);
    try {
      const res = await fetch(`/api/campaigns/${campaignId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ op: "refresh_all_views" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to refresh all");

      // Re-fetch to get fresh counts
      const res2 = await fetch(`/api/campaigns/${campaignId}?include=submissions`, { cache: "no-store" });
      const data2 = await res2.json();
      if (!res2.ok) throw new Error(data2?.error || "Failed to reload submissions");
      setSubmissions(data2.submissions || []);
    } catch (e: any) {
      setError(e?.message || "Failed to refresh all view counts");
    } finally {
      setBulkUpdating(false);
    }
  };

  const hasSubs = useMemo(() => submissions.length > 0, [submissions]);

  if (loading) {
    return (
      <section className="space-y-3">
        <div className="h-6 w-44 rounded bg-gray-200 animate-pulse" />
        <div className="h-28 w-full rounded bg-gray-200 animate-pulse" />
        <div className="h-28 w-full rounded bg-gray-200 animate-pulse" />
      </section>
    );
  }

  return (
    <section className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Submissions</h2>
        {hasSubs ? (
          <button
            onClick={refreshAll}
            disabled={bulkUpdating}
            className="px-3 py-2 rounded-md border border-gray-300 text-sm hover:bg-gray-50 disabled:opacity-50"
          >
            {bulkUpdating ? "Updating…" : "Update All Views"}
          </button>
        ) : null}
      </div>

      {/* Error Banner */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Empty State */}
      {!hasSubs ? (
        <p className="text-sm text-gray-600">No submissions yet.</p>
      ) : (
        <ul className="space-y-3">
          {submissions.map((s) => (
            <li key={s.id} className="rounded-lg border bg-white p-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="space-y-1">
                  <div className="text-sm text-gray-700">
                    User: <span className="font-medium">{s.user_id ?? "—"}</span>
                  </div>
                  <div className="text-sm text-gray-700">
                    Platform: <span className="font-medium">{s.platform ?? "—"}</span>
                  </div>
                  <div className="truncate text-sm">
                    Link:{" "}
                    <Link href={s.video_url} target="_blank" className="underline break-all">
                      {s.video_url}
                    </Link>
                  </div>
                  <div className="text-sm text-gray-700">
                    Views: <span className="font-semibold">{s.view_count ?? 0}</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
                    <span>Status:</span>
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 font-semibold capitalize ${getSubmissionStatusClasses(
                        s.status
                      )}`}
                    >
                      {s.status ?? "pending"}
                    </span>
                    <span className="text-[11px] text-gray-400">
                      {s.updated_at ? new Date(s.updated_at).toLocaleString() : "—"}
                    </span>
                  </div>
                </div>

                <div className="sm:self-start">
                  <button
                    onClick={() => refreshOne(s.id)}
                    disabled={updatingId === s.id}
                    className="px-3 py-2 rounded-md border border-gray-300 text-sm hover:bg-gray-50 disabled:opacity-50"
                  >
                    {updatingId === s.id ? "Updating…" : "Update Views"}
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
