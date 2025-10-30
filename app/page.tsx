"use client";

import WalletButton from "./components/WalletButton";
import UsernameForm from "./components/UsernameForm";
import UserProfile from "./components/UserProfile";
import CampaignCard, { ApiCampaign } from "./components/CampaignCard";
import { useAuth } from "@/app/providers/AuthProvider";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { useState, useEffect } from "react";

export default function Home() {
  const { connected } = useWallet();
  const { user, loading } = useAuth();
  const [showProfile, setShowProfile] = useState(false);
  const [campaigns, setCampaigns] = useState<ApiCampaign[]>([]);
  const [campaignsLoading, setCampaignsLoading] = useState(true);

  // Fetch campaigns for all users
  useEffect(() => {
    const fetchCampaigns = async () => {
      try {
        setCampaignsLoading(true);
        const response = await fetch('/api/campaigns');
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
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Loading…</p>
        </div>
      </div>
    );
  }

  // Show wallet connection if not connected
  if (!connected) {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <h1 className="text-xl font-semibold text-gray-900">UGC Campaigns</h1>
              <WalletButton />
            </div>
          </div>
        </header>

        {/* Main content */}
        <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                Browse Available Campaigns
              </h2>
              <p className="text-gray-600">
                Connect your wallet to participate in campaigns
              </p>
            </div>

            {/* Campaigns grid */}
            {campaignsLoading ? (
              <div className="text-center py-12">
                <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                <p className="text-gray-600">Loading campaigns…</p>
              </div>
            ) : campaigns.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {campaigns.map((campaign) => (
                  <CampaignCard key={campaign.id} campaign={campaign} currentUserId={user?.id}/>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-gray-500">No campaigns available yet</p>
              </div>
            )}
          </div>
        </main>
      </div>
    );
  }

  // Show username form for first-time users without username
  if (user && !user.username && !showProfile) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
        <UsernameForm 
          isFirstTime={true} 
          onComplete={() => setShowProfile(true)} 
        />
      </div>
    );
  }

  // Show profile or main app interface
  if (showProfile) {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Header with back button */}
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center h-16">
              <button
                onClick={() => setShowProfile(false)}
                className="flex items-center text-blue-600 hover:text-blue-800 font-medium"
              >
                ← Back to Home
              </button>
              <h1 className="ml-4 text-xl font-semibold text-gray-900">Profile</h1>
            </div>
          </div>
        </header>

        {/* Profile content */}
        <div className="flex items-center justify-center py-8 px-4">
          <UserProfile />
        </div>
      </div>
    );
  }

  // Main app interface for authenticated users
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-1">
                Available Campaigns
              </h2>
              <p className="text-gray-600 text-sm">
                Browse and participate in UGC campaigns
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <span className="text-sm text-gray-600">
                {user?.username}
              </span>
              <WalletMultiButton className="!text-xs !py-1 !px-3" />
              <button
                onClick={() => setShowProfile(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors text-sm"
              >
                Profile
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">

          {/* Campaigns grid */}
          {campaignsLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="text-gray-600">Loading campaigns…</p>
            </div>
          ) : campaigns.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {campaigns.map((campaign) => (
                <CampaignCard key={campaign.id} campaign={campaign} currentUserId={user?.id} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="bg-white p-8 rounded-lg shadow-md max-w-md mx-auto">
                <p className="text-gray-500 mb-4">No campaigns available yet</p>
                <p className="text-sm text-gray-400">
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
