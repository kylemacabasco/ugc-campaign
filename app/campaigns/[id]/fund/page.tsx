"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { 
  SystemProgram, 
  Transaction, 
  PublicKey, 
  LAMPORTS_PER_SOL 
} from "@solana/web3.js";
import { useAuth } from "@/app/providers/AuthProvider";

interface Campaign {
  id: string;
  title: string;
  description: string;
  campaign_amount: number;
  rate_per_1k_views: number;
  status: string;
  creator_id: string;
  metadata: {
    requirements?: string;
  };
}

export default function FundCampaignPage() {
  const params = useParams();
  const router = useRouter();
  const { publicKey, sendTransaction } = useWallet();
  const { connection } = useConnection();
  const { user } = useAuth();

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [funding, setFunding] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [txSignature, setTxSignature] = useState<string | null>(null);

  useEffect(() => {
    const fetchCampaign = async () => {
      try {
        const response = await fetch(`/api/campaigns/${params.id}`);
        if (!response.ok) {
          throw new Error("Campaign not found");
        }
        const data = await response.json();
        setCampaign(data);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load campaign"
        );
      } finally {
        setLoading(false);
      }
    };

    if (params.id) {
      fetchCampaign();
    }
  }, [params.id]);

  const handleFundCampaign = async () => {
    if (!publicKey || !campaign || !user) {
      setError("Please connect your wallet and sign in.");
      return;
    }

    // Check if user is the campaign creator
    if (campaign.creator_id !== user.id) {
      setError("Only the campaign creator can fund this campaign.");
      return;
    }

    if (campaign.status !== "draft") {
      setError("Campaign is not in draft status.");
      return;
    }

    setFunding(true);
    setError(null);
    setSuccess(null);

    try {
      // Get treasury address from environment variables
      const treasuryAddress = process.env.NEXT_PUBLIC_TREASURY_ADDRESS;
      if (!treasuryAddress) {
        throw new Error("Treasury address not configured. Please set NEXT_PUBLIC_TREASURY_ADDRESS in your environment variables.");
      }
      
      // Validate treasury address format (Issue #2)
      let treasuryPublicKey: PublicKey;
      try {
        treasuryPublicKey = new PublicKey(treasuryAddress);
        // Validate it's on the correct curve
        if (!PublicKey.isOnCurve(treasuryPublicKey.toBytes())) {
          throw new Error("Invalid treasury address: not on ed25519 curve");
        }
      } catch (validationError) {
        console.error("Treasury address validation failed:", validationError);
        throw new Error(
          `Invalid treasury address format. Please contact support. Address: ${treasuryAddress.substring(0, 8)}...`
        );
      }
      
      // Create transaction to send SOL
      const lamports = Math.floor(campaign.campaign_amount * LAMPORTS_PER_SOL);
      
      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: treasuryPublicKey,
          lamports,
        })
      );

      // Get latest blockhash
      const { blockhash } = await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = publicKey;

      // Send transaction
      const signature = await sendTransaction(transaction, connection);
      
      // Store transaction signature immediately (Issue #3 - Part 1)
      // This ensures we have a record even if confirmation or status update fails
      try {
        const storeTxResponse = await fetch(`/api/campaigns/${params.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            funding_tx_signature: signature,
            funded_at: new Date().toISOString(),
            updater_wallet: publicKey.toBase58(),
          }),
        });

        if (!storeTxResponse.ok) {
          console.warn("Failed to store transaction signature, but continuing with confirmation...");
        }
      } catch (storeTxError) {
        console.warn("Error storing tx signature:", storeTxError);
      }

      setTxSignature(signature);
      
      // Wait for confirmation
      await connection.confirmTransaction(signature, "confirmed");

      setSuccess(`Transaction confirmed successfully!`);

      // Update campaign status to active (Issue #3 - Part 2)
      // If this fails, we still have the tx signature stored above
      try {
        const updateResponse = await fetch(`/api/campaigns/${params.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status: "active",
            funding_tx_signature: signature,
            funded_at: new Date().toISOString(),
            updater_wallet: publicKey.toBase58(),
          }),
        });

        if (!updateResponse.ok) {
          const errorData = await updateResponse.json().catch(() => ({}));
          throw new Error(
            errorData?.error || 
            "Failed to activate campaign. Transaction succeeded but campaign status update failed. Please contact support with this transaction signature."
          );
        }
      } catch (statusUpdateError) {
        console.error("Status update failed:", statusUpdateError);
        setSuccess(
          `Transaction confirmed! However, there was an issue updating the campaign status. ` +
          `Please contact support with your transaction signature for manual activation.`
        );
        return;
      }
    } catch (err) {
      console.error("Error funding campaign:", err);
      setError(
        err instanceof Error ? err.message : "Failed to fund campaign"
      );
    } finally {
      setFunding(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Loading campaign...</p>
        </div>
      </div>
    );
  }

  if (error && !campaign) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-gray-50">
        <div className="text-xl text-red-500">{error}</div>
        <button
          onClick={() => router.push("/")}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Back to Home
        </button>
      </div>
    );
  }

  if (!campaign) {
    return null;
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "draft":
        return "bg-gray-100 text-gray-800";
      case "active":
        return "bg-green-100 text-green-800";
      case "ended":
        return "bg-blue-100 text-blue-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push("/")}
            className="text-blue-600 hover:text-blue-800 mb-4 flex items-center gap-2"
          >
            ← Back to campaigns
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Fund Campaign</h1>
          <p className="text-gray-600 mt-2">
            Send SOL to activate your campaign
          </p>
        </div>

        {/* Campaign Details Card */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-start justify-between mb-4">
            <h2 className="text-2xl font-bold text-gray-900">
              {campaign.title}
            </h2>
            <span
              className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusBadge(
                campaign.status
              )}`}
            >
              {campaign.status.toUpperCase()}
            </span>
          </div>

          <p className="text-gray-600 mb-6">{campaign.description}</p>

          {campaign.metadata?.requirements && (
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">
                Requirements:
              </h3>
              <p className="text-gray-600 text-sm">
                {campaign.metadata.requirements}
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 text-center">
              <div className="text-sm text-blue-700 mb-1">Campaign Budget</div>
              <div className="text-3xl font-bold text-blue-900">
                {campaign.campaign_amount} SOL
              </div>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg border border-purple-200 text-center">
              <div className="text-sm text-purple-700 mb-1">
                Rate per 1k Views
              </div>
              <div className="text-3xl font-bold text-purple-900">
                {campaign.rate_per_1k_views} SOL
              </div>
            </div>
          </div>

          {/* Alert Messages */}
          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-center">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-6 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md text-center">
              <p className="font-medium mb-3">{success}</p>
              {txSignature && (
                <a
                  href={`https://explorer.solana.com/tx/${txSignature}?cluster=mainnet`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-green-800 hover:text-green-900 hover:underline text-sm inline-block mb-3 font-medium"
                >
                  View transaction on Solana Explorer →
                </a>
              )}
              <div>
                <button
                  onClick={() => router.push(`/campaigns/${params.id}`)}
                  className="mt-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-sm font-medium"
                >
                  Go to Campaign Page
                </button>
              </div>
            </div>
          )}

          {/* Funding Information - Only show if not successful */}
          {!success && (
            <>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                <h3 className="text-sm font-semibold text-yellow-800 mb-2">
                  💡 How it works:
                </h3>
                <ul className="text-sm text-yellow-700 space-y-1 text-left inline-block">
                  <li>
                    • You will send {campaign.campaign_amount} SOL to fund this
                    campaign
                  </li>
                  <li>
                    • Once funded, your campaign will become active</li>
                  <li>
                    • Creators can submit content and earn based on their views
                  </li>
                  <li>
                    • Payouts are calculated at {campaign.rate_per_1k_views} SOL
                    per 1,000 views
                  </li>
                </ul>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-4">
            <button
              onClick={() => router.back()}
              className="flex-1 px-6 py-3 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              onClick={handleFundCampaign}
              disabled={
                funding ||
                !publicKey ||
                campaign.status !== "draft" ||
                campaign.creator_id !== user?.id
              }
              className="flex-1 px-6 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {funding ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                  Sending...
                </span>
              ) : (
                `Fund ${campaign.campaign_amount} SOL & Activate`
              )}
            </button>
          </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

