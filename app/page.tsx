"use client";

import Link from "next/link";
import WalletButton from "./components/WalletButton";
import UsernameForm from "./components/UsernameForm";
import CampaignCard, { ApiCampaign } from "./components/CampaignCard";
import { useAuth } from "@/app/providers/AuthProvider";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { useState, useEffect } from "react";

export default function Home() {
  const { connected } = useWallet();
  const { user, loading } = useAuth();
  const [campaigns, setCampaigns] = useState<ApiCampaign[]>([]);
  const [campaignsLoading, setCampaignsLoading] = useState(true);

  // Fetch active campaigns for all users
  useEffect(() => {
    const fetchCampaigns = async () => {
      try {
        setCampaignsLoading(true);
        const response = await fetch('/api/campaigns?status=active');
        if (response.ok) {
          const data = await response.json();
          setCampaigns(data);
        }
      } catch (error) {
        console.error('Error fetching campaigns:', error);
      } finally {
        setCampaignsLoading(false);
      }
    };

    fetchCampaigns();
  }, []);

  // Show loading state
  if (connected && loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-cream">
        <div className="text-center">
          <div className="animate-spin h-10 w-10 border-3 border-sage border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-charcoal-light">Loading…</p>
        </div>
      </div>
    );
  }

  // Show wallet connection if not connected
  if (!connected) {
    return (
      <div className="min-h-screen bg-cream">
        {/* Header */}
        <header className="bg-card border-b border-border">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-20">
              <h1 className="text-2xl font-semibold text-charcoal tracking-tight">UGC Campaigns</h1>
              <WalletButton />
            </div>
          </div>
        </header>

        {/* Main content */}
        <main className="max-w-7xl mx-auto py-10 sm:px-6 lg:px-8">
          <div className="px-4 py-8 sm:px-0">
            <div className="text-center mb-12">
              <h2 className="text-4xl font-bold text-charcoal mb-4 tracking-tight">
                Browse Available Campaigns
              </h2>
              <p className="text-charcoal-light text-lg">
                Connect your wallet to participate in campaigns
              </p>
            </div>

            {/* Campaigns grid */}
            {campaignsLoading ? (
              <div className="text-center py-16">
                <div className="animate-spin h-10 w-10 border-3 border-sage border-t-transparent rounded-full mx-auto mb-4"></div>
                <p className="text-charcoal-light">Loading campaigns…</p>
              </div>
            ) : campaigns.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {campaigns.map((campaign) => (
                  <CampaignCard key={campaign.id} campaign={campaign} currentUserId={user?.id}/>
                ))}
              </div>
            ) : (
              <div className="text-center py-16">
                <p className="text-charcoal-light">No campaigns available yet</p>
              </div>
            )}
          </div>
        </main>
      </div>
    );
  }

  // Show username form for first-time users without username
  if (user && !user.username) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-cream p-4">
        <UsernameForm 
          isFirstTime={true} 
        />
      </div>
    );
  }

  // Main app interface for authenticated users
  return (
    <div className="min-h-screen bg-cream">
      {/* Header */}
      <header className="bg-card border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h2 className="text-3xl font-bold text-charcoal mb-2 tracking-tight">
                Available Campaigns
              </h2>
              <p className="text-charcoal-light text-base">
                Browse and participate in UGC campaigns
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-charcoal-light font-medium">
                {user?.username}
              </span>
              <WalletMultiButton className="!text-xs !py-2 !px-4" />
              <Link
                href={`/profile/${user?.wallet_address}`}
                className="bg-sage text-white px-5 py-2 rounded-lg hover:bg-sage-dark transition-all text-sm font-medium shadow-soft hover:shadow-soft-lg"
              >
                Profile
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto py-10 sm:px-6 lg:px-8">
        <div className="px-4 py-8 sm:px-0">
          
          {/* Create Campaign Button */}
          <div className="mb-8 flex justify-end">
            <Link
              href="/create"
              className="bg-sage text-white px-8 py-3 rounded-xl hover:bg-sage-dark transition-all font-medium shadow-soft hover:shadow-soft-lg flex items-center gap-2"
            >
              <svg 
                className="w-5 h-5" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
                strokeWidth={2}
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  d="M12 4v16m8-8H4" 
                />
              </svg>
              Create Campaign
            </Link>
          </div>

          {/* Campaigns grid */}
          {campaignsLoading ? (
            <div className="text-center py-16">
              <div className="animate-spin h-10 w-10 border-3 border-sage border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="text-charcoal-light">Loading campaigns…</p>
            </div>
          ) : campaigns.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {campaigns.map((campaign) => (
                <CampaignCard key={campaign.id} campaign={campaign} currentUserId={user?.id} />
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <div className="bg-card p-10 rounded-xl border border-border max-w-md mx-auto shadow-soft">
                <p className="text-charcoal-light mb-3 text-lg">No campaigns available yet</p>
                <p className="text-sm text-charcoal-light opacity-70">
                  Check back soon for new opportunities!
                </p>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
