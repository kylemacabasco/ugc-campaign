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
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Link
            href={`/campaigns/${params.id}`}
            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 transition group"
          >
            <svg
              className="w-5 h-5 transform group-hover:-translate-x-1 transition-transform"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            <span className="font-medium">Back to Campaign</span>
          </Link>
        </div>

        <div className="bg-white rounded-lg shadow-md p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">
            Submit Your Video
          </h1>

          {/* Video URL Display */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <div className="text-sm text-gray-600 mb-2">Video URL:</div>
            <a
              href={videoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 break-all"
            >
              {videoUrl}
            </a>
          </div>

          {/* Campaign Info */}
          {campaign && (
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Campaign: {campaign.title}
              </h3>
              {campaign.metadata?.requirements && (
                <div className="text-sm text-gray-700 whitespace-pre-wrap">
                  <strong>Requirements:</strong>
                  <p className="mt-1">{campaign.metadata.requirements}</p>
                </div>
              )}
            </div>
          )}

          {/* Flow Steps */}
          {flowStep === "validating" && (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mb-4"></div>
              <h2 className="text-2xl font-semibold text-gray-900 mb-2">
                Analyzing Your Video
              </h2>
              <p className="text-gray-600">
                Our AI is reviewing your video against the campaign requirements...
              </p>
            </div>
          )}

          {flowStep === "result" && validationResult && (
            <div className="space-y-6">
              {/* Validation Result */}
              <div
                className={`p-6 rounded-lg border-2 ${
                  validationResult.valid
                    ? "bg-green-50 border-green-300"
                    : "bg-red-50 border-red-300"
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0">
                    {validationResult.valid ? (
                      <svg
                        className="w-8 h-8 text-green-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                    ) : (
                      <svg
                        className="w-8 h-8 text-red-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                    )}
                  </div>
                  <div className="flex-1">
                    <h3
                      className={`text-xl font-bold mb-2 ${
                        validationResult.valid ? "text-green-900" : "text-red-900"
                      }`}
                    >
                      {validationResult.valid
                        ? "✓ Video Meets Requirements!"
                        : "✗ Video Does Not Meet Requirements"}
                    </h3>
                    <p
                      className={`text-base ${
                        validationResult.valid ? "text-green-800" : "text-red-800"
                      }`}
                    >
                      {validationResult.explanation}
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-4">
                {validationResult.valid ? (
                  <>
                    <button
                      onClick={handleBackToCampaign}
                      className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition font-medium"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleConfirmSubmission}
                      disabled={!user || !publicKey}
                      className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition font-medium"
                    >
                      {!user || !publicKey
                        ? "Connect Wallet to Submit"
                        : "Confirm & Submit"}
                    </button>
                  </>
                ) : (
                  <button
                    onClick={handleBackToCampaign}
                    className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
                  >
                    Back to Campaign
                  </button>
                )}
              </div>

              {!validationResult.valid && (
                <div className="text-center text-sm text-gray-600">
                  <p>Your video does not meet the requirements for this campaign.</p>
                  <p className="mt-1">
                    Please review the requirements and submit a different video.
                  </p>
                </div>
              )}
            </div>
          )}

          {flowStep === "submitting" && (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
              <h2 className="text-2xl font-semibold text-gray-900 mb-2">
                Submitting Your Video
              </h2>
              <p className="text-gray-600">Please wait...</p>
            </div>
          )}

          {flowStep === "success" && (
            <div className="text-center py-12">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
                <svg
                  className="w-10 h-10 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <h2 className="text-2xl font-semibold text-gray-900 mb-2">
                Video Submitted Successfully!
              </h2>
              <p className="text-gray-600 mb-6">
                Your video has been submitted to the campaign. You can now view it on the campaign page.
              </p>
              <button
                onClick={handleBackToCampaign}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
              >
                Back to Campaign
              </button>
            </div>
          )}

          {flowStep === "error" && (
            <div className="text-center py-12">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4">
                <svg
                  className="w-10 h-10 text-red-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </div>
              <h2 className="text-2xl font-semibold text-gray-900 mb-2">
                Something Went Wrong
              </h2>
              <p className="text-red-600 mb-6">{error}</p>
              <button
                onClick={handleBackToCampaign}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
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

