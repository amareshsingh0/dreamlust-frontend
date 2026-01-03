import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DatePicker } from '@/components/ui/DatePicker';
import { AmountSelector } from './AmountSelector';
import { GiftCardPreview } from './GiftCardPreview';
import { toast } from 'sonner';
import { api } from '@/lib/api';

interface GiftCardPurchaseProps {
  onSuccess?: () => void;
}

export function GiftCardPurchase({ onSuccess }: GiftCardPurchaseProps) {
  const [amount, setAmount] = useState<number | undefined>();
  const [recipientEmail, setRecipientEmail] = useState('');
  const [personalMessage, setPersonalMessage] = useState('');
  const [sendDate, setSendDate] = useState<Date | null>(null);
  const [selectedDesign, setSelectedDesign] = useState<'default' | 'premium' | 'holiday'>('default');
  const [isPurchasing, setIsPurchasing] = useState(false);

  const amounts = [100, 500, 1000, 2000];

  const handlePurchase = async () => {
    if (!amount) {
      toast.error('Please select an amount');
      return;
    }

    if (recipientEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipientEmail)) {
      toast.error('Please enter a valid email address');
      return;
    }

    setIsPurchasing(true);

    try {
      const response = await api.giftcards.purchase({
        amount,
        currency: 'INR',
        recipientEmail: recipientEmail || undefined,
        personalMessage: personalMessage || undefined,
        sendDate: sendDate?.toISOString(),
        expiresInDays: 365,
      });

      if (response.success) {
        toast.success('Gift card purchased successfully!');
        // Reset form
        setAmount(undefined);
        setRecipientEmail('');
        setPersonalMessage('');
        setSendDate(null);
        onSuccess?.();
      } else {
        throw new Error(response.error?.message || 'Failed to purchase gift card');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to purchase gift card');
    } finally {
      setIsPurchasing(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Send a Gift Card</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Amount Selector */}
          <div>
            <Label className="mb-3 block">Select Amount</Label>
            <AmountSelector
              amounts={amounts}
              selected={amount}
              onSelect={setAmount}
            />
          </div>

          {/* Recipient Information */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="recipient-email">Recipient Email (optional)</Label>
              <Input
                id="recipient-email"
                type="email"
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                placeholder="recipient@example.com"
              />
              <p className="text-xs text-muted-foreground">
                Leave empty to receive the gift card code yourself
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="personal-message">Personal Message (optional)</Label>
              <Textarea
                id="personal-message"
                value={personalMessage}
                onChange={(e) => setPersonalMessage(e.target.value)}
                placeholder="Add a personal message..."
                rows={3}
                maxLength={500}
              />
              <p className="text-xs text-muted-foreground">
                {personalMessage.length}/500 characters
              </p>
            </div>

            <DatePicker
              label="Send Date (optional)"
              value={sendDate}
              onChange={setSendDate}
              placeholder="Select when to send the gift card"
              minDate={new Date()}
            />
          </div>

          {/* Design Selection */}
          <div className="space-y-2">
            <Label>Card Design</Label>
            <div className="flex gap-2">
              {(['default', 'premium', 'holiday'] as const).map((design) => (
                <Button
                  key={design}
                  type="button"
                  variant={selectedDesign === design ? 'default' : 'outline'}
                  onClick={() => setSelectedDesign(design)}
                  className="capitalize"
                >
                  {design}
                </Button>
              ))}
            </div>
          </div>

          {/* Preview */}
          {amount && (
            <div>
              <Label className="mb-3 block">Preview</Label>
              <GiftCardPreview
                amount={amount}
                design={selectedDesign}
                recipientName={recipientEmail ? recipientEmail.split('@')[0] : undefined}
              />
            </div>
          )}

          {/* Purchase Button */}
          <Button
            onClick={handlePurchase}
            disabled={!amount || isPurchasing}
            className="w-full"
            size="lg"
          >
            {isPurchasing
              ? 'Processing...'
              : amount
              ? `Purchase for ₹${amount.toFixed(0)}`
              : 'Select an amount'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

