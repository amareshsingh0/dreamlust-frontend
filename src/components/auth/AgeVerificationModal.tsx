/**
 * Age Verification Modal Component
 * Shown on first login or when age verification is required
 */

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Calendar, AlertCircle } from 'lucide-react';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

interface AgeVerificationModalProps {
  open: boolean;
  onComplete: () => void;
  required?: boolean;
  minimumAge?: number;
}

export function AgeVerificationModal({
  open,
  onComplete,
  required = true,
  minimumAge = 18,
}: AgeVerificationModalProps) {
  const [birthDate, setBirthDate] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const calculateAge = (date: string): number => {
    const birth = new Date(date);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    
    return age;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!birthDate) {
      setError('Please enter your date of birth');
      return;
    }

    const age = calculateAge(birthDate);
    
    if (age < minimumAge) {
      setError(`You must be at least ${minimumAge} years old to use this service.`);
      return;
    }

    if (age < 13) {
      setError('You must be at least 13 years old to create an account.');
      return;
    }

    if (age > 120) {
      setError('Please enter a valid date of birth.');
      return;
    }

    setLoading(true);
    try {
      // Update user profile with birth date
      const response = await (api as any).user.updateProfile({
        birthDate: new Date(birthDate).toISOString(),
      });

      if (response.success) {
        toast({
          title: 'Age verified',
          description: 'Your age has been verified successfully.',
        });
        onComplete();
      } else {
        setError(response.error?.message || 'Failed to verify age');
      }
    } catch (error: any) {
      setError(error.message || 'Failed to verify age');
    } finally {
      setLoading(false);
    }
  };

  const today = new Date();
  const maxDate = today.toISOString().split('T')[0];
  const minDate = new Date(today.getFullYear() - 120, 0, 1).toISOString().split('T')[0];

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Age Verification Required
          </DialogTitle>
          <DialogDescription>
            {required
              ? `To access all content, please verify your age. You must be at least ${minimumAge} years old.`
              : 'Please provide your date of birth to access age-restricted content.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="birthDate">Date of Birth</Label>
            <Input
              id="birthDate"
              type="date"
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
              min={minDate}
              max={maxDate}
              required
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              You must be at least {minimumAge} years old
            </p>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="flex justify-end gap-2">
            {!required && (
              <Button
                type="button"
                variant="outline"
                onClick={onComplete}
                disabled={loading}
              >
                Skip for now
              </Button>
            )}
            <Button type="submit" disabled={loading}>
              {loading ? 'Verifying...' : 'Verify Age'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

