"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
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

interface ValidationResult {
  valid: boolean;
  explanation: string;
  campaign?: {
    title: string;
    requirements: string;
  };
}

type FlowStep = "validating" | "result" | "submitting" | "success" | "error";

export default function SubmitContentPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { publicKey } = useWallet();
  const { user } = useAuth();

  const [videoUrl, setVideoUrl] = useState("");
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [flowStep, setFlowStep] = useState<FlowStep>("validating");
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Get video URL from query params
  useEffect(() => {
    const urlParam = searchParams.get("videoUrl");
    if (urlParam) {
      setVideoUrl(urlParam);
    } else {
      setError("No video URL provided");
      setFlowStep("error");
    }
  }, [searchParams]);

  // Fetch campaign details
  useEffect(() => {
    const fetchCampaign = async () => {
      try {
        const response = await fetch(`/api/campaigns/${params.id}`);
        if (!response.ok) {
          throw new Error("Failed to load campaign");
        }
        const data = await response.json();
        setCampaign(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load campaign");
        setFlowStep("error");
      }
    };

    if (params.id) {
      fetchCampaign();
    }
  }, [params.id]);

  // Run validation when both videoUrl and campaign are available
  useEffect(() => {
    const runValidation = async () => {
      if (!videoUrl || !campaign || flowStep !== "validating") return;

      try {
        const response = await fetch("/api/validate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            campaign_id: campaign.id,
            video_url: videoUrl,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Failed to validate video");
        }

        setValidationResult(data);
        setFlowStep("result");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to validate video");
        setFlowStep("error");
      }
    };

    runValidation();
  }, [videoUrl, campaign, flowStep]);

  const handleConfirmSubmission = async () => {
    if (!user || !publicKey) {
      setError("Please connect your wallet to submit");
      return;
    }

    setFlowStep("submitting");
    try {
      const response = await fetch("/api/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaign_id: params.id,
          submitter_wallet: publicKey.toBase58(),
          video_url: videoUrl,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to submit video");
      }

      setFlowStep("success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit video");
      setFlowStep("error");
    }
  };

  const handleBackToCampaign = () => {
    router.push(`/campaigns/${params.id}`);
  };

  return (
    <div className="min-h-screen bg-cream py-10 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link
            href={`/campaigns/${params.id}`}
            className="inline-flex items-center gap-2 text-charcoal-light hover:text-charcoal transition group"
          >
            <svg
              className="w-5 h-5 transform group-hover:-translate-x-1 transition-transform"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 19l-7-7 7-7"
              />
            </svg>
            <span className="font-medium">Back to Campaign</span>
          </Link>
        </div>

        <div className="bg-card rounded-xl shadow-soft p-10 border-2 border-border">
          <h1 className="text-3xl font-bold text-charcoal mb-8 tracking-tight">
            Submit Your Video
          </h1>

          {/* Video URL Display */}
          <div className="mb-8 p-5 bg-parchment rounded-lg border border-border">
            <div className="text-sm text-charcoal-light mb-2 font-medium">Video URL:</div>
            <a
              href={videoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sage-dark hover:text-sage break-all transition"
            >
              {videoUrl}
            </a>
          </div>

          {/* Campaign Info */}
          {campaign && (
            <div className="mb-8 p-5 bg-sage/5 border-2 border-sage/20 rounded-lg">
              <h3 className="text-lg font-semibold text-charcoal mb-3">
                Campaign: {campaign.title}
              </h3>
              {campaign.metadata?.requirements && (
                <div className="text-sm text-charcoal-light whitespace-pre-wrap">
                  <strong className="text-charcoal">Requirements:</strong>
                  <p className="mt-2 leading-relaxed">{campaign.metadata.requirements}</p>
                </div>
              )}
            </div>
          )}

          {/* Flow Steps */}
          {flowStep === "validating" && (
            <div className="text-center py-16">
              <div className="inline-block animate-spin rounded-full h-14 w-14 border-3 border-sage border-t-transparent mb-6"></div>
              <h2 className="text-2xl font-semibold text-charcoal mb-3 tracking-tight">
                Analyzing Your Video
              </h2>
              <p className="text-charcoal-light leading-relaxed">
                Our AI is reviewing your video against the campaign requirements...
              </p>
            </div>
          )}

          {flowStep === "result" && validationResult && (
            <div className="space-y-8">
              {/* Validation Result */}
              <div
                className={`p-8 rounded-xl border-2 ${
                  validationResult.valid
                    ? "bg-sage/5 border-sage/30"
                    : "bg-red-50/50 border-red-200/50"
                }`}
              >
                <div className="flex items-start gap-5">
                  <div className="flex-shrink-0">
                    {validationResult.valid ? (
                      <svg
                        className="w-10 h-10 text-sage"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                    ) : (
                      <svg
                        className="w-10 h-10 text-red-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                    )}
                  </div>
                  <div className="flex-1">
                    <h3
                      className={`text-xl font-bold mb-3 tracking-tight ${
                        validationResult.valid ? "text-sage-dark" : "text-red-800"
                      }`}
                    >
                      {validationResult.valid
                        ? "✅ Video Meets Requirements!"
                        : "❌ Video Does Not Meet Requirements"}
                    </h3>
                    <p
                      className={`text-base leading-relaxed ${
                        validationResult.valid ? "text-charcoal-light" : "text-red-700"
                      }`}
                    >
                      {validationResult.explanation}
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-5">
                {validationResult.valid ? (
                  <>
                    <button
                      onClick={handleBackToCampaign}
                      className="flex-1 px-6 py-3.5 bg-parchment text-charcoal rounded-xl hover:bg-border transition-all font-medium shadow-soft"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleConfirmSubmission}
                      disabled={!user || !publicKey}
                      className="flex-1 px-6 py-3.5 bg-sage text-white rounded-xl hover:bg-sage-dark disabled:bg-charcoal-light/30 disabled:cursor-not-allowed transition-all font-medium shadow-soft hover:shadow-soft-lg"
                    >
                      {!user || !publicKey
                        ? "Connect Wallet to Submit"
                        : "Confirm & Submit"}
                    </button>
                  </>
                ) : (
                  <button
                    onClick={handleBackToCampaign}
                    className="w-full px-6 py-3.5 bg-sage text-white rounded-xl hover:bg-sage-dark transition-all font-medium shadow-soft hover:shadow-soft-lg"
                  >
                    Back to Campaign
                  </button>
                )}
              </div>

              {!validationResult.valid && (
                <div className="text-center text-sm text-charcoal-light">
                  <p>Your video does not meet the requirements for this campaign.</p>
                  <p className="mt-1.5">
                    Please review the requirements and submit a different video.
                  </p>
                </div>
              )}
            </div>
          )}

          {flowStep === "submitting" && (
            <div className="text-center py-16">
              <div className="inline-block animate-spin rounded-full h-14 w-14 border-3 border-sage border-t-transparent mb-6"></div>
              <h2 className="text-2xl font-semibold text-charcoal mb-3 tracking-tight">
                Submitting Your Video
              </h2>
              <p className="text-charcoal-light">Please wait...</p>
            </div>
          )}

          {flowStep === "success" && (
            <div className="text-center py-16">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-sage/10 border-2 border-sage/30 rounded-full mb-6">
                <svg
                  className="w-12 h-12 text-sage"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <h2 className="text-2xl font-semibold text-charcoal mb-3 tracking-tight">
                Video Submitted Successfully!
              </h2>
              <p className="text-charcoal-light mb-8 leading-relaxed">
                Your video has been submitted to the campaign. You can now view it on the campaign page.
              </p>
              <button
                onClick={handleBackToCampaign}
                className="px-8 py-3.5 bg-sage text-white rounded-xl hover:bg-sage-dark transition-all font-medium shadow-soft hover:shadow-soft-lg"
              >
                Back to Campaign
              </button>
            </div>
          )}

          {flowStep === "error" && (
            <div className="text-center py-16">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-red-50 border-2 border-red-200 rounded-full mb-6">
                <svg
                  className="w-12 h-12 text-red-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </div>
              <h2 className="text-2xl font-semibold text-charcoal mb-3 tracking-tight">
                Something Went Wrong
              </h2>
              <p className="text-red-700 mb-8">{error}</p>
              <button
                onClick={handleBackToCampaign}
                className="px-8 py-3.5 bg-sage text-white rounded-xl hover:bg-sage-dark transition-all font-medium shadow-soft hover:shadow-soft-lg"
              >
                Back to Campaign
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

