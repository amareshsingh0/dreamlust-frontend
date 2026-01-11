/**
 * Currency Selector Component
 * Allows users to select their preferred currency
 */

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DollarSign } from 'lucide-react';
import { useLocale } from '@/contexts/LocaleContext';
import { CURRENCY_NAMES, CURRENCY_SYMBOLS } from '@/lib/preferences/constants';

export function CurrencySelector() {
  const { currency, setCurrency, currencies: _currencies, supportedCurrencies } = useLocale();

  return (
    <div className="flex items-center gap-2">
      <DollarSign className="h-4 w-4 text-muted-foreground" />
      <Select value={currency} onValueChange={setCurrency}>
        <SelectTrigger className="w-[200px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {supportedCurrencies.map((curr) => (
            <SelectItem key={curr} value={curr}>
              {CURRENCY_SYMBOLS[curr]} {CURRENCY_NAMES[curr]} ({curr})
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

