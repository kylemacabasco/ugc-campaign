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

  // Check if current user is the campaign owner
  const isOwner = currentUserId && campaign.creator_id === currentUserId;

  const getStatusStyle = (status: string) => {
    switch (status) {
      case "active":
        return "badge-active text-white";
      case "draft":
        return "bg-charcoal-light/10 text-charcoal-light border border-charcoal-light/20";
      case "ended":
        return "bg-earth/10 text-earth-dark border border-earth/20";
      case "cancelled":
        return "bg-red-100/50 text-red-800 border border-red-200/50";
      default:
        return "bg-parchment text-charcoal border border-border";
    }
  };

  return (
    <div className="bg-card rounded-xl shadow-soft hover:shadow-soft-lg transition-all p-8 border-2 border-border hover:-translate-y-1 duration-300">
      <div className="flex justify-between items-start mb-5 gap-3">
        <h2 className="text-2xl font-semibold text-charcoal line-clamp-2 flex-1 min-w-0 tracking-tight">
          {campaign.title}
        </h2>
        <span
          className={`px-3 py-1.5 text-xs font-medium rounded-lg uppercase whitespace-nowrap ${getStatusStyle(
            campaign.status
          )}`}
        >
          {campaign.status}
        </span>
      </div>

      {campaign.description && (
        <p className="text-charcoal-light text-base mb-6 line-clamp-2 leading-relaxed">
          {campaign.description}
        </p>
      )}

      <div className="space-y-4">
        <div className="flex justify-between text-base">
          <span className="text-charcoal-light">Total Amount:</span>
          <span className="font-semibold text-charcoal">
            {campaign.campaign_amount} SOL
          </span>
        </div>

        <div className="flex justify-between text-base">
          <span className="text-charcoal-light">Rate:</span>
          <span className="font-semibold text-charcoal">
            {campaign.rate_per_1k_views} SOL / 1k views
          </span>
        </div>

        {/* Action button */}
        <Link href={`/campaigns/${campaign.id}`} className="block w-full mt-6">
          <button className="w-full bg-sage hover:bg-sage-dark text-white font-medium py-3.5 px-5 rounded-xl transition-all duration-200 shadow-soft hover:shadow-soft-lg hover:-translate-y-0.5">
            {isOwner ? "View your Campaign" : "Submit Content"}
          </button>
        </Link>
      </div>
    </div>
  );
}

