import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Copy,
  Check,
  Users,
  DollarSign,
  Clock,
  Percent
} from 'lucide-react';
import { BannerDownloads } from './BannerDownloads';
import { SocialShareButtons } from './SocialShareButtons';
import { EmbedCodeGenerator } from './EmbedCodeGenerator';
import { api } from '@/lib/api';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { format } from 'date-fns';

// Helper function to format dates
const formatDate = (dateString: string): string => {
  try {
    return format(new Date(dateString), 'MMM d, yyyy');
  } catch {
    return dateString;
  }
};

interface AffiliateData {
  id: string;
  code: string;
  status: string;
  commissionRate: number;
  totalReferrals: number;
  totalEarnings: number;
  pendingPayout: number;
  createdAt: string;
  referrals: Array<{
    id: string;
    referredUserId: string;
    status: string;
    commissionAmount: number | null;
    conversionDate: string | null;
    createdAt: string;
  }>;
}

interface AffiliateStats {
  totalReferrals: number;
  totalEarnings: number;
  pendingPayout: number;
  commissionRate: number;
  conversionRate: number;
  status: string;
  code: string;
  stats: {
    pending: number;
    converted: number;
    paid: number;
  };
}

export function AffiliateDashboard() {
  const [affiliate, setAffiliate] = useState<AffiliateData | null>(null);
  const [stats, setStats] = useState<AffiliateStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [copied, setCopied] = useState(false);
  const [referralsPage, _setReferralsPage] = useState(1);
  const [referrals, setReferrals] = useState<any[]>([]);
  const [referralsLoading, setReferralsLoading] = useState(false);

  useEffect(() => {
    loadAffiliateData();
  }, []);

  useEffect(() => {
    if (affiliate) {
      loadReferrals();
    }
  }, [affiliate, referralsPage]);

  const loadAffiliateData = async () => {
    setLoading(true);
    try {
      const [affiliateRes, statsRes] = await Promise.all([
        api.affiliates.getMe(),
        api.affiliates.getStats(),
      ]);

      if (affiliateRes.success && affiliateRes.data) {
        setAffiliate(affiliateRes.data as AffiliateData);
      }
      if (statsRes.success && statsRes.data) {
        setStats(statsRes.data as AffiliateStats);
      }
    } catch (error: any) {
      if (error.status === 404) {
        // User doesn't have an affiliate account yet
        setAffiliate(null);
      } else {
        console.error('Failed to load affiliate data:', error);
        toast.error('Failed to load affiliate data');
      }
    } finally {
      setLoading(false);
    }
  };

  const loadReferrals = async () => {
    if (!affiliate) return;
    setReferralsLoading(true);
    try {
      const response = await api.affiliates.getReferrals({
        page: referralsPage,
        limit: 20,
      });
      if (response.success && response.data) {
        setReferrals((response.data as any).referrals || []);
      }
    } catch (error) {
      console.error('Failed to load referrals:', error);
    } finally {
      setReferralsLoading(false);
    }
  };

  const handleApply = async () => {
    setApplying(true);
    try {
      const response = await api.affiliates.apply();
      if (response.success) {
        toast.success('Affiliate application submitted!');
        await loadAffiliateData();
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to apply for affiliate program');
    } finally {
      setApplying(false);
    }
  };

  const copyAffiliateLink = () => {
    if (!affiliate) return;
    const link = `${window.location.origin}/register?affiliateCode=${affiliate.code}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    toast.success('Affiliate link copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  const copyCode = () => {
    if (!affiliate) return;
    navigator.clipboard.writeText(affiliate.code);
    setCopied(true);
    toast.success('Affiliate code copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32 w-full" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      </div>
    );
  }

  if (!affiliate) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Become an Affiliate</CardTitle>
          <CardDescription>
            Join our affiliate program and earn commissions for every referral
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <h3 className="font-semibold">Benefits:</h3>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              <li>Earn commissions on every successful referral</li>
              <li>Track your referrals and earnings</li>
              <li>Get paid for bringing new users to the platform</li>
            </ul>
          </div>
          <Button onClick={handleApply} disabled={applying} className="w-full">
            {applying ? 'Applying...' : 'Apply to Become an Affiliate'}
          </Button>
        </CardContent>
      </Card>
    );
  }

  const affiliateLink = `${window.location.origin}/register?affiliateCode=${affiliate.code}`;
  const statusColors: Record<string, string> = {
    pending: 'bg-yellow-500',
    approved: 'bg-green-500',
    suspended: 'bg-red-500',
  };

  return (
    <div className="space-y-6">
      {/* Affiliate Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Affiliate Account</CardTitle>
              <CardDescription>Your affiliate program dashboard</CardDescription>
            </div>
            <Badge className={statusColors[affiliate.status] || 'bg-gray-500'}>
              {affiliate.status.toUpperCase()}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Affiliate Link */}
          <div>
            <label className="text-sm font-medium mb-2 block">Your Affiliate Link</label>
            <div className="flex gap-2">
              <Input
                value={affiliateLink}
                readOnly
                className="text-sm"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={copyAffiliateLink}
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Share this link to earn commissions on referrals
            </p>
          </div>

          {/* Affiliate Code */}
          <div>
            <label className="text-sm font-medium mb-2 block">Your Affiliate Code</label>
            <div className="flex gap-2">
              <Input
                value={affiliate.code}
                readOnly
                className="font-mono"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={copyCode}
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Statistics */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Referrals</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalReferrals}</div>
              <p className="text-xs text-muted-foreground">
                {stats.stats.pending} pending, {stats.stats.converted} converted
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
              <Percent className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.conversionRate.toFixed(2)}%</div>
              <p className="text-xs text-muted-foreground">
                {stats.stats.converted + stats.stats.paid} converted
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Earnings</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₹{stats.totalEarnings.toFixed(0)}</div>
              <p className="text-xs text-muted-foreground">All time earnings</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Payout</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₹{stats.pendingPayout.toFixed(0)}</div>
              <p className="text-xs text-muted-foreground">Awaiting payment</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Promotional Materials */}
      <Card>
        <CardHeader>
          <CardTitle>Marketing Materials</CardTitle>
          <CardDescription>Promote your affiliate link with banners and social sharing</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold mb-4">Banner Downloads</h3>
            <BannerDownloads sizes={['728x90', '300x250', '160x600']} />
          </div>

          <div>
            <SocialShareButtons 
              affiliateLink={affiliateLink}
              affiliateCode={affiliate.code}
            />
          </div>

          <div>
            <EmbedCodeGenerator
              affiliateLink={affiliateLink}
              affiliateCode={affiliate.code}
            />
          </div>
        </CardContent>
      </Card>

      {/* Referrals List */}
      <Card>
        <CardHeader>
          <CardTitle>Your Referrals</CardTitle>
          <CardDescription>Track all users you've referred</CardDescription>
        </CardHeader>
        <CardContent>
          {referralsLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : referrals.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No referrals yet. Share your affiliate link to start earning!
            </p>
          ) : (
            <div className="space-y-2">
              {referrals.map((referral) => (
                <div
                  key={referral.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">
                        {referral.email || referral.referredUser?.email || referral.referredUser?.display_name || referral.referredUser?.username || 'User'}
                      </p>
                      <Badge variant="outline">{referral.status}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Referred on {formatDate(referral.createdAt)}
                    </p>
                  </div>
                  <div className="text-right">
                    {referral.commissionAmount ? (
                      <p className="font-semibold text-green-600">
                        ₹{Number(referral.commissionAmount).toFixed(0)}
                      </p>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

