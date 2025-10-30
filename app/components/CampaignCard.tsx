import Link from "next/link";

export interface ApiCampaign {
  id: string;
  creator_id: string;
  title: string;
  description: string | null;
  campaign_amount: number;
  rate_per_1k_views: number;
  status: string;
  created_at: string;
  updated_at: string;
}

interface CampaignCardProps {
  campaign: ApiCampaign;
  currentUserId?: string;
}

export default function CampaignCard({ campaign, currentUserId }: CampaignCardProps) {

  // Calculate completion status from database status field
  const isCompleted = campaign.status === 'completed';
  
  // Check if current user is the campaign owner
  const isOwner = currentUserId && campaign.creator_id === currentUserId;

  return (
    <div className="bg-white dark:bg-slate-900 rounded-lg shadow hover:shadow-lg transition-shadow p-6 border border-slate-200 dark:border-slate-800">
      <div className="flex justify-between items-start mb-4">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-slate-100">
          {campaign.title}
        </h2>
        <span
          className={`px-3 py-1 text-xs font-medium rounded-full ${
            isCompleted
              ? "bg-green-100 text-green-800"
              : campaign.status === 'active'
              ? "bg-blue-100 text-blue-800"
              : "bg-gray-100 text-gray-800"
          }`}
        >
          {isCompleted ? "Completed" : campaign.status}
        </span>
      </div>

      {campaign.description && (
        <p className="text-gray-600 dark:text-slate-400 text-sm mb-4 line-clamp-2">
          {campaign.description}
        </p>
      )}

      <div className="space-y-3">
        <div className="flex justify-between text-sm">
          <span className="text-gray-500 dark:text-slate-400">Total Amount:</span>
          <span className="font-semibold text-gray-900 dark:text-slate-100">
            {campaign.campaign_amount} SOL
          </span>
        </div>

        <div className="flex justify-between text-sm">
          <span className="text-gray-500 dark:text-slate-400">Rate:</span>
          <span className="font-semibold text-gray-900 dark:text-slate-100">
            {campaign.rate_per_1k_views} SOL / 1k views
          </span>
        </div>

        {/* Action button */}
        <Link href={`/campaigns/${campaign.id}`} className="block w-full mt-4">
          <button className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-medium py-2.5 px-4 rounded-lg transition-all duration-200 shadow-md hover:shadow-lg">
            {isOwner ? "View your Campaign" : "Submit Content"}
          </button>
        </Link>
      </div>
    </div>
  );
}

