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
      <div className="min-h-screen flex items-center justify-center bg-cream">
        <div className="text-center">
          <div className="animate-spin h-10 w-10 border-3 border-sage border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-charcoal-light text-xl">Loading campaign...</p>
        </div>
      </div>
    );
  }

  if (error && !campaign) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-6 bg-cream">
        <div className="text-xl text-red-700">{error}</div>
        <button
          onClick={() => router.push("/")}
          className="px-6 py-3 bg-sage text-white rounded-xl hover:bg-sage-dark transition-all shadow-soft"
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
        return "bg-charcoal-light/10 text-charcoal-light border border-charcoal-light/20";
      case "active":
        return "badge-active text-white";
      case "ended":
        return "bg-earth/10 text-earth-dark border border-earth/20";
      case "cancelled":
        return "bg-red-100/50 text-red-800 border border-red-200/50";
      default:
        return "bg-parchment text-charcoal border border-border";
    }
  };

  return (
    <div className="min-h-screen bg-cream py-12 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-10">
          <button
            onClick={() => router.push("/")}
            className="text-sage-dark hover:text-sage mb-6 flex items-center gap-2 transition"
          >
            ← Back to campaigns
          </button>
          <h1 className="text-3xl font-bold text-charcoal tracking-tight">Fund Campaign</h1>
          <p className="text-charcoal-light mt-3 text-lg">
            Send SOL to activate your campaign
          </p>
        </div>

        {/* Campaign Details Card */}
        <div className="bg-card rounded-xl shadow-soft p-8 mb-8 border-2 border-border">
          <div className="flex items-start justify-between mb-6">
            <h2 className="text-2xl font-bold text-charcoal tracking-tight">
              {campaign.title}
            </h2>
            <span
              className={`px-3 py-1.5 rounded-lg text-sm font-medium ${getStatusBadge(
                campaign.status
              )}`}
            >
              {campaign.status.toUpperCase()}
            </span>
          </div>

          <p className="text-charcoal-light mb-8 leading-relaxed">{campaign.description}</p>

          {campaign.metadata?.requirements && (
            <div className="mb-8 p-6 bg-sage/5 border-2 border-sage/20 rounded-lg">
              <h3 className="text-sm font-semibold text-charcoal mb-3">
                Requirements:
              </h3>
              <p className="text-charcoal-light text-sm leading-relaxed">
                {campaign.metadata.requirements}
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
            <div className="bg-parchment p-6 rounded-lg border-2 border-border text-center">
              <div className="text-sm text-charcoal-light mb-2 font-medium">Campaign Budget</div>
              <div className="text-3xl font-bold text-charcoal">
                {campaign.campaign_amount} SOL
              </div>
            </div>
            <div className="bg-parchment p-6 rounded-lg border-2 border-border text-center">
              <div className="text-sm text-charcoal-light mb-2 font-medium">
                Rate per 1k Views
              </div>
              <div className="text-3xl font-bold text-charcoal">
                {campaign.rate_per_1k_views} SOL
              </div>
            </div>
          </div>

          {/* Alert Messages */}
          {error && (
            <div className="mb-8 bg-red-50 border-2 border-red-200/50 text-red-700 px-6 py-4 rounded-lg text-center">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-8 bg-sage/10 border-2 border-sage/20 text-sage-dark px-6 py-5 rounded-lg text-center">
              <p className="font-medium mb-4">{success}</p>
              {txSignature && (
                <a
                  href={`https://explorer.solana.com/tx/${txSignature}?cluster=mainnet`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sage-dark hover:text-sage hover:underline text-sm inline-block mb-4 font-medium transition"
                >
                  View transaction on Solana Explorer →
                </a>
              )}
              <div>
                <button
                  onClick={() => router.push(`/campaigns/${params.id}`)}
                  className="mt-2 px-6 py-3 bg-sage text-white rounded-xl hover:bg-sage-dark transition-all text-sm font-medium shadow-soft"
                >
                  Go to Campaign Page
                </button>
              </div>
            </div>
          )}

          {/* Funding Information - Only show if not successful */}
          {!success && (
            <>
              <div className="bg-earth/5 border-2 border-earth/20 rounded-lg p-6 mb-8">
                <h3 className="text-sm font-semibold text-charcoal mb-4">
                  💡 How it works:
                </h3>
                <ul className="text-sm text-charcoal-light space-y-2.5 text-left leading-relaxed">
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
              className="flex-1 px-6 py-3.5 border-2 border-border rounded-xl text-charcoal hover:bg-parchment transition-all font-medium"
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
              className="flex-1 px-6 py-3.5 bg-sage text-white rounded-xl hover:bg-sage-dark transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow-soft hover:shadow-soft-lg"
            >
              {funding ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></div>
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

