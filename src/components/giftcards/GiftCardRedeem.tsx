import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Gift, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';

interface GiftCardRedeemProps {
  onSuccess?: (newBalance: string) => void;
}

export function GiftCardRedeem({ onSuccess }: GiftCardRedeemProps) {
  const [code, setCode] = useState('');
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [redeemedAmount, setRedeemedAmount] = useState<string | null>(null);

  const handleRedeem = async () => {
    if (!code.trim()) {
      toast.error('Please enter a gift card code');
      return;
    }

    setIsRedeeming(true);

    try {
      const response = await api.giftcards.redeem({ code: code.trim() });

      if (response.success) {
        toast.success('Gift card redeemed successfully!');
        const data = response.data as { amount?: string; newBalance?: string } | undefined;
        setRedeemedAmount(data?.amount || null);
        setCode('');
        onSuccess?.(data?.newBalance || '0');
        
        // Clear success message after 5 seconds
        setTimeout(() => {
          setRedeemedAmount(null);
        }, 5000);
      } else {
        throw new Error(response.error?.message || 'Failed to redeem gift card');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to redeem gift card');
    } finally {
      setIsRedeeming(false);
    }
  };

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Auto-format code: remove spaces and convert to uppercase
    const formatted = e.target.value
      .replace(/\s+/g, '')
      .replace(/-/g, '')
      .toUpperCase()
      .slice(0, 12);
    
    // Add dashes every 4 characters
    let formattedCode = '';
    for (let i = 0; i < formatted.length; i++) {
      if (i > 0 && i % 4 === 0) {
        formattedCode += '-';
      }
      formattedCode += formatted[i];
    }
    
    setCode(formattedCode);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Gift className="h-5 w-5" />
          Redeem Gift Card
        </CardTitle>
        <CardDescription>
          Enter your gift card code to add the balance to your account
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {redeemedAmount && (
          <div className="p-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
            <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
              <CheckCircle2 className="h-5 w-5" />
              <p className="font-semibold">
                Successfully redeemed ${redeemedAmount}!
              </p>
            </div>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="gift-card-code">Enter Gift Card Code</Label>
          <Input
            id="gift-card-code"
            value={code}
            onChange={handleCodeChange}
            placeholder="XXXX-XXXX-XXXX"
            className="text-lg font-mono tracking-wider text-center"
            maxLength={14} // 12 chars + 2 dashes
            disabled={isRedeeming}
          />
          <p className="text-xs text-muted-foreground">
            Enter the 12-character code from your gift card
          </p>
        </div>

        <Button
          onClick={handleRedeem}
          disabled={!code.trim() || isRedeeming || code.replace(/-/g, '').length < 12}
          className="w-full"
          size="lg"
        >
          {isRedeeming ? 'Redeeming...' : 'Redeem Gift Card'}
        </Button>

        <div className="pt-4 border-t space-y-2">
          <p className="text-sm font-medium">How to redeem:</p>
          <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
            <li>Enter the 12-character code from your gift card</li>
            <li>The balance will be added to your account immediately</li>
            <li>You can use the balance for purchases, subscriptions, and tips</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}

