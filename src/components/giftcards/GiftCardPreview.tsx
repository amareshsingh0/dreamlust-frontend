import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Gift } from 'lucide-react';

interface GiftCardPreviewProps {
  amount: number;
  currency?: string;
  design?: 'default' | 'premium' | 'holiday';
  recipientName?: string;
  className?: string;
}

const designStyles = {
  default: 'bg-gradient-to-br from-primary to-primary/60',
  premium: 'bg-gradient-to-br from-purple-600 to-pink-600',
  holiday: 'bg-gradient-to-br from-red-500 to-green-500',
};

export function GiftCardPreview({
  amount,
  currency: _currency = 'INR',
  design = 'default',
  recipientName,
  className,
}: GiftCardPreviewProps) {
  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardContent className={cn('p-0', designStyles[design])}>
        <div className="p-8 text-white">
          <div className="flex items-center justify-between mb-6">
            <Gift className="h-8 w-8" />
            <div className="text-right">
              <p className="text-sm opacity-90">Gift Card</p>
              <p className="text-xs opacity-75">PassionFantasia</p>
            </div>
          </div>
          
          <div className="mb-6">
            <p className="text-sm opacity-90 mb-1">Amount</p>
            <p className="text-4xl font-bold">
              ₹{amount.toFixed(0)}
            </p>
          </div>

          {recipientName && (
            <div className="pt-4 border-t border-white/20">
              <p className="text-sm opacity-90 mb-1">For</p>
              <p className="text-lg font-semibold">{recipientName}</p>
            </div>
          )}

          <div className="mt-6 pt-4 border-t border-white/20">
            <p className="text-xs opacity-75">
              Redeem at checkout or add to account balance
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

