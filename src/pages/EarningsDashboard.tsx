import { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { Layout } from '@/components/layout/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Loader2, DollarSign, TrendingUp, Calendar, Wallet, AlertCircle, CheckCircle2 } from 'lucide-react';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface EarningsData {
  earnings: {
    balance: number;
    lifetimeEarnings: number;
    pendingPayout: number;
    lastPayoutAt: string | null;
  };
  summary: {
    totalEarnings: number;
    tipsTotal: number;
    subscriptionsTotal: number;
    tipsCount: number;
    subscriptionsCount: number;
  };
  tips: any[];
  subscriptions: any[];
  monthlyEarnings: Array<{ month: string; amount: number }>;
}

interface BalanceData {
  balance: number;
  lifetimeEarnings: number;
  pendingPayout: number;
  lastPayoutAt: string | null;
  canRequestPayout: boolean;
  minimumPayoutAmount: number;
}

export default function EarningsDashboard() {
  const { user: _user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [earnings, setEarnings] = useState<EarningsData | null>(null);
  const [balance, setBalance] = useState<BalanceData | null>(null);
  const [payoutDialogOpen, setPayoutDialogOpen] = useState(false);
  const [requestingPayout, setRequestingPayout] = useState(false);
  const [payoutForm, setPayoutForm] = useState({
    accountNumber: '',
    ifsc: '',
    beneficiaryName: '',
    amount: '',
  });

  useEffect(() => {
    loadEarnings();
    loadBalance();
  }, []);

  const loadEarnings = async () => {
    try {
      const response = await api.earnings.get<EarningsData>();
      if (response.success && response.data) {
        setEarnings(response.data);
      }
    } catch (error: any) {
      toast.error('Failed to load earnings data');
    } finally {
      setLoading(false);
    }
  };

  const loadBalance = async () => {
    try {
      const response = await api.payouts.getBalance<BalanceData>();
      if (response.success && response.data) {
        setBalance(response.data);
      }
    } catch (error: any) {
      console.error('Failed to load balance:', error);
    }
  };

  const handleRequestPayout = async () => {
    if (!balance) return;

    const amount = payoutForm.amount ? parseFloat(payoutForm.amount) : balance.balance;

    if (amount < balance.minimumPayoutAmount) {
      toast.error(`Minimum payout amount is ₹${balance.minimumPayoutAmount}`);
      return;
    }

    if (amount > balance.balance) {
      toast.error('Insufficient balance');
      return;
    }

    setRequestingPayout(true);
    try {
      const response = await api.payouts.request({
        accountNumber: payoutForm.accountNumber,
        ifsc: payoutForm.ifsc.toUpperCase(),
        beneficiaryName: payoutForm.beneficiaryName,
        amount: amount,
      });

      if (response.success) {
        toast.success('Payout request submitted successfully!');
        setPayoutDialogOpen(false);
        setPayoutForm({
          accountNumber: '',
          ifsc: '',
          beneficiaryName: '',
          amount: '',
        });
        loadBalance();
        loadEarnings();
      } else {
        throw new Error(response.error?.message || 'Failed to request payout');
      }
    } catch (error: any) {
      toast.error(error?.error?.message || error?.message || 'Failed to request payout');
    } finally {
      setRequestingPayout(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatCurrency = (amount: number) => {
    return `₹${amount.toFixed(2)}`;
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <Helmet>
        <title>Earnings Dashboard - PassionFantasia</title>
      </Helmet>

      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Earnings Dashboard</h1>
          <p className="text-muted-foreground">Track your earnings and request payouts</p>
        </div>

        {/* Earnings Overview */}
        {earnings && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Available Balance</CardTitle>
                <Wallet className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(earnings.earnings.balance)}</div>
                <p className="text-xs text-muted-foreground mt-1">Ready to withdraw</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pending Payout</CardTitle>
                <AlertCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(earnings.earnings.pendingPayout)}</div>
                <p className="text-xs text-muted-foreground mt-1">Processing</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Lifetime Earnings</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(earnings.earnings.lifetimeEarnings)}</div>
                <p className="text-xs text-muted-foreground mt-1">All time</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Last Payout</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-sm">
                  {formatDate(earnings.earnings.lastPayoutAt)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Most recent</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Payout Button */}
        {balance && (
          <div className="mb-8">
            <Button
              onClick={() => setPayoutDialogOpen(true)}
              disabled={!balance.canRequestPayout}
              size="lg"
              className="w-full sm:w-auto"
            >
              <DollarSign className="h-5 w-5 mr-2" />
              Request Payout
            </Button>
            {!balance.canRequestPayout && (
              <p className="text-sm text-muted-foreground mt-2">
                Minimum payout amount is ₹{balance.minimumPayoutAmount}. Current balance: {formatCurrency(balance.balance)}
              </p>
            )}
          </div>
        )}

        {/* Earnings Breakdown */}
        {earnings && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <Card>
              <CardHeader>
                <CardTitle>Earnings Summary</CardTitle>
                <CardDescription>Breakdown of your earnings</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Total Earnings</span>
                    <span className="text-lg font-bold">{formatCurrency(earnings.summary.totalEarnings)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">From Tips</span>
                    <span className="font-medium">{formatCurrency(earnings.summary.tipsTotal)}</span>
                    <Badge variant="secondary">{earnings.summary.tipsCount} tips</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">From Subscriptions</span>
                    <span className="font-medium">{formatCurrency(earnings.summary.subscriptionsTotal)}</span>
                    <Badge variant="secondary">{earnings.summary.subscriptionsCount} subs</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Monthly Earnings</CardTitle>
                <CardDescription>Last 12 months</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {earnings.monthlyEarnings.length > 0 ? (
                    earnings.monthlyEarnings.slice(0, 6).map((item) => (
                      <div key={item.month} className="flex justify-between items-center">
                        <span className="text-sm">{new Date(item.month + '-01').toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}</span>
                        <span className="font-medium">{formatCurrency(item.amount)}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">No earnings data available</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Transaction History */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Transactions</CardTitle>
            <CardDescription>Your recent earnings and payouts</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {earnings && earnings.tips.length > 0 ? (
                earnings.tips.slice(0, 10).map((tip) => (
                  <div key={tip.id} className="flex justify-between items-center p-3 border rounded-lg">
                    <div className="flex-1">
                      <div className="font-medium">Tip Received</div>
                      <div className="text-sm text-muted-foreground">
                        {new Date(tip.created_at).toLocaleDateString('en-IN')}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-green-600">+{formatCurrency(tip.amount)}</div>
                      {tip.message && (
                        <div className="text-xs text-muted-foreground mt-1">{tip.message}</div>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">No transactions yet</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Payout Request Dialog */}
      <Dialog open={payoutDialogOpen} onOpenChange={setPayoutDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Request Payout</DialogTitle>
            <DialogDescription>
              Enter your bank account details to request a payout. Minimum amount: ₹{balance?.minimumPayoutAmount || 50}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="accountNumber">Account Number</Label>
              <Input
                id="accountNumber"
                value={payoutForm.accountNumber}
                onChange={(e) => setPayoutForm({ ...payoutForm, accountNumber: e.target.value })}
                placeholder="Enter account number"
                maxLength={18}
              />
            </div>
            <div>
              <Label htmlFor="ifsc">IFSC Code</Label>
              <Input
                id="ifsc"
                value={payoutForm.ifsc}
                onChange={(e) => setPayoutForm({ ...payoutForm, ifsc: e.target.value.toUpperCase() })}
                placeholder="Enter IFSC code"
                maxLength={11}
              />
            </div>
            <div>
              <Label htmlFor="beneficiaryName">Beneficiary Name</Label>
              <Input
                id="beneficiaryName"
                value={payoutForm.beneficiaryName}
                onChange={(e) => setPayoutForm({ ...payoutForm, beneficiaryName: e.target.value })}
                placeholder="Account holder name"
              />
            </div>
            <div>
              <Label htmlFor="amount">Amount (Optional - defaults to full balance)</Label>
              <Input
                id="amount"
                type="number"
                value={payoutForm.amount}
                onChange={(e) => setPayoutForm({ ...payoutForm, amount: e.target.value })}
                placeholder={`Max: ₹${balance?.balance.toFixed(2) || '0.00'}`}
                min={balance?.minimumPayoutAmount || 50}
                max={balance?.balance || 0}
              />
            </div>
            <Button
              onClick={handleRequestPayout}
              disabled={requestingPayout || !payoutForm.accountNumber || !payoutForm.ifsc || !payoutForm.beneficiaryName}
              className="w-full"
            >
              {requestingPayout ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Request Payout
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
