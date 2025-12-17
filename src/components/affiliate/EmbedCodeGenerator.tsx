import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Copy, Check } from 'lucide-react';
import { toast } from 'sonner';

interface EmbedCodeGeneratorProps {
  affiliateLink: string;
  affiliateCode: string;
}

export function EmbedCodeGenerator({ affiliateLink, affiliateCode }: EmbedCodeGeneratorProps) {
  const [embedType, setEmbedType] = useState<'link' | 'button' | 'banner'>('link');
  const [copied, setCopied] = useState(false);

  const generateCode = () => {
    switch (embedType) {
      case 'link':
        return `<a href="${affiliateLink}">Join with my referral code: ${affiliateCode}</a>`;
      case 'button':
        return `<a href="${affiliateLink}" style="display: inline-block; padding: 10px 20px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px;">Join Now</a>`;
      case 'banner':
        return `<a href="${affiliateLink}"><img src="${window.location.origin}/api/affiliates/banner/728x90?code=${affiliateCode}" alt="Join Now" /></a>`;
      default:
        return '';
    }
  };

  const embedCode = generateCode();

  const copyCode = () => {
    navigator.clipboard.writeText(embedCode);
    setCopied(true);
    toast.success('Embed code copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Embed Code Generator</CardTitle>
        <CardDescription>Generate HTML code to embed your affiliate link</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Embed Type</Label>
          <Select value={embedType} onValueChange={(value: any) => setEmbedType(value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="link">Text Link</SelectItem>
              <SelectItem value="button">Button</SelectItem>
              <SelectItem value="banner">Banner Image</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Generated Code</Label>
          <Textarea
            value={embedCode}
            readOnly
            className="font-mono text-sm min-h-[100px]"
          />
        </div>

        <Button onClick={copyCode} className="w-full">
          {copied ? (
            <>
              <Check className="h-4 w-4 mr-2" />
              Copied!
            </>
          ) : (
            <>
              <Copy className="h-4 w-4 mr-2" />
              Copy Code
            </>
          )}
        </Button>

        <div className="text-xs text-muted-foreground">
          <p>Preview:</p>
          <div className="mt-2 p-4 border rounded-lg bg-muted/50">
            {embedType === 'link' && (
              <a 
                href={affiliateLink} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                Join with my referral code: {affiliateCode}
              </a>
            )}
            {embedType === 'button' && (
              <a 
                href={affiliateLink} 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-block px-5 py-2.5 bg-primary text-primary-foreground rounded-md no-underline hover:opacity-90"
              >
                Join Now
              </a>
            )}
            {embedType === 'banner' && (
              <a 
                href={affiliateLink} 
                target="_blank" 
                rel="noopener noreferrer"
              >
                <img 
                  src={`${window.location.origin}/api/affiliates/banner/728x90?code=${encodeURIComponent(affiliateCode)}`} 
                  alt="Join Now" 
                  className="max-w-full h-auto"
                />
              </a>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

