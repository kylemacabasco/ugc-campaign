"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/app/providers/AuthProvider";
import Link from "next/link";

export default function SubmitContentPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();

  const [url, setUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setUrl(""); // Clear URL if file is selected

      // Create preview for images
      if (selectedFile.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setUploadPreview(reader.result as string);
        };
        reader.readAsDataURL(selectedFile);
      } else {
        setUploadPreview(null);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!user) {
      setError("Please connect your wallet first");
      return;
    }

    if (!url && !file) {
      setError("Please provide either a URL or upload a file");
      return;
    }

    try {
      setSubmitting(true);

      let contentUrl = url;

      // If file is selected, upload it first
      if (file) {
        setUploading(true);
        const formData = new FormData();
        formData.append("file", file);

        const uploadResponse = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        if (!uploadResponse.ok) {
          const uploadError = await uploadResponse.json();
          throw new Error(uploadError.error || "Failed to upload file");
        }

        const uploadData = await uploadResponse.json();
        contentUrl = uploadData.url;
        setUploading(false);
      }

      // Create submission
      const response = await fetch("/api/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaign_id: params.id,
          submitter_wallet: user.wallet_address,
          video_url: contentUrl,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Submission error:", errorData);
        throw new Error(errorData.error || "Failed to submit content");
      }

      // Success! Redirect to campaign page
      router.push(`/campaigns/${params.id}`);
    } catch (err) {
      console.error("Submission error:", err);
      setError(err instanceof Error ? err.message : "Failed to submit content");
    } finally {
      setUploading(false);
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Submit Content</h1>
            <Link
              href={`/campaigns/${params.id}`}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              ← Back to Campaign
            </Link>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* URL Input */}
            <div>
              <label
                htmlFor="url"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Content URL (YouTube, etc.)
              </label>
              <input
                type="url"
                id="url"
                value={url}
                onChange={(e) => {
                  setUrl(e.target.value);
                  if (e.target.value) {
                    setFile(null);
                    setUploadPreview(null);
                  }
                }}
                disabled={!!file}
                placeholder="https://www.youtube.com/watch?v=..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
              />
            </div>

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">OR</span>
              </div>
            </div>

            {/* File Upload */}
            <div>
              <label
                htmlFor="file"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Upload Media
              </label>
              <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-lg hover:border-gray-400 transition">
                <div className="space-y-1 text-center">
                  {uploadPreview ? (
                    <div className="mb-4">
                      <img
                        src={uploadPreview}
                        alt="Preview"
                        className="max-h-48 mx-auto rounded-lg"
                      />
                    </div>
                  ) : (
                    <svg
                      className="mx-auto h-12 w-12 text-gray-400"
                      stroke="currentColor"
                      fill="none"
                      viewBox="0 0 48 48"
                    >
                      <path
                        d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                        strokeWidth={2}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                  <div className="flex text-sm text-gray-600">
                    <label
                      htmlFor="file-upload"
                      className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none"
                    >
                      <span>{file ? file.name : "Upload a file"}</span>
                      <input
                        id="file-upload"
                        name="file-upload"
                        type="file"
                        className="sr-only"
                        accept="image/*,video/*"
                        onChange={handleFileChange}
                        disabled={!!url}
                      />
                    </label>
                    <p className="pl-1">or drag and drop</p>
                  </div>
                  <p className="text-xs text-gray-500">
                    Images or videos up to 50MB
                  </p>
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
            <button
              type="submit"
              disabled={submitting || uploading || (!url && !file)}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition font-medium"
            >
              {uploading
                ? "Uploading..."
                : submitting
                ? "Submitting..."
                : "Submit Content"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

