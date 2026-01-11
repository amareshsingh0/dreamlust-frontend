/**
 * Subtitle Settings Component
 * Allows customization of subtitle appearance
 */

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Settings } from 'lucide-react';

interface SubtitleSettingsProps {
  availableLanguages: string[];
  selectedLanguage?: string;
  onLanguageChange: (language: string | 'off') => void;
  fontSize?: 'small' | 'medium' | 'large';
  onFontSizeChange?: (size: 'small' | 'medium' | 'large') => void;
  textColor?: string;
  onTextColorChange?: (color: string) => void;
  backgroundColor?: string;
  onBackgroundColorChange?: (color: string) => void;
  opacity?: number;
  onOpacityChange?: (opacity: number) => void;
  languages: Record<string, { native: string }>;
}

export function SubtitleSettings({
  availableLanguages,
  selectedLanguage,
  onLanguageChange,
  fontSize = 'medium',
  onFontSizeChange,
  textColor = '#FFFFFF',
  onTextColorChange,
  backgroundColor = '#000000',
  onBackgroundColorChange,
  opacity = 80,
  onOpacityChange,
  languages,
}: SubtitleSettingsProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Subtitle Settings</CardTitle>
            <CardDescription>Customize subtitle appearance</CardDescription>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowAdvanced(!showAdvanced)}
          >
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Language Selection */}
        <div>
          <Label>Subtitles</Label>
          <Select
            value={selectedLanguage || 'off'}
            onValueChange={onLanguageChange}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="off">Off</SelectItem>
              {availableLanguages.map((lang) => (
                <SelectItem key={lang} value={lang}>
                  {languages[lang]?.native || lang}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Advanced Settings */}
        {showAdvanced && (
          <div className="space-y-4 pt-4 border-t">
            {/* Font Size */}
            {onFontSizeChange && (
              <div>
                <Label>Font Size</Label>
                <Select value={fontSize} onValueChange={onFontSizeChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="small">Small</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="large">Large</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Text Color */}
            {onTextColorChange && (
              <div>
                <Label>Text Color</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={textColor}
                    onChange={(e) => onTextColorChange(e.target.value)}
                    className="h-10 w-20 rounded border"
                  />
                  <span className="text-sm text-muted-foreground">{textColor}</span>
                </div>
              </div>
            )}

            {/* Background Color */}
            {onBackgroundColorChange && (
              <div>
                <Label>Background Color</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={backgroundColor}
                    onChange={(e) => onBackgroundColorChange(e.target.value)}
                    className="h-10 w-20 rounded border"
                  />
                  <span className="text-sm text-muted-foreground">{backgroundColor}</span>
                </div>
              </div>
            )}

            {/* Opacity */}
            {onOpacityChange && (
              <div>
                <Label>Opacity: {opacity}%</Label>
                <Slider
                  value={[opacity]}
                  onValueChange={([value]) => onOpacityChange(value)}
                  min={0}
                  max={100}
                  step={1}
                />
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}


