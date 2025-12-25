/**
 * Language Selector Component
 * Allows users to select their preferred language with auto-detection
 */

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Globe, X } from 'lucide-react';
import { useLocale } from '@/contexts/LocaleContext';
import { LANGUAGE_NAMES } from '@/lib/preferences/constants';

export function LanguageSelector() {
  const { language, setLanguage, detectedLanguage, languages: _languages, supportedLanguages } = useLocale();
  const [showSuggestion, setShowSuggestion] = useState(false);

  useEffect(() => {
    if (detectedLanguage) {
      setShowSuggestion(true);
    }
  }, [detectedLanguage]);

  const handleAcceptDetection = async () => {
    if (detectedLanguage) {
      await setLanguage(detectedLanguage);
      setShowSuggestion(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Language Detection Suggestion */}
      {showSuggestion && detectedLanguage && (
        <Alert className="bg-primary/10 border-primary/20">
          <Globe className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <div>
              <p className="font-medium">We detected your language is {LANGUAGE_NAMES[detectedLanguage]?.native}</p>
              <p className="text-sm text-muted-foreground mt-1">
                Switch to {LANGUAGE_NAMES[detectedLanguage]?.native}?
              </p>
            </div>
            <div className="flex gap-2 ml-4">
              <Button size="sm" onClick={handleAcceptDetection}>
                Continue in {LANGUAGE_NAMES[detectedLanguage]?.native}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowSuggestion(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Language Selector */}
      <div className="flex items-center gap-2">
        <Globe className="h-4 w-4 text-muted-foreground" />
        <Select value={language} onValueChange={setLanguage}>
          <SelectTrigger className="w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {supportedLanguages.map((lang) => (
              <SelectItem key={lang} value={lang}>
                {LANGUAGE_NAMES[lang]?.native} ({LANGUAGE_NAMES[lang]?.english})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}


