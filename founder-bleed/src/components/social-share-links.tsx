'use client';

import { Linkedin, Twitter, Link2, Check, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useState } from 'react';

interface SocialShareLinksProps {
  shareUrl: string;
  heroMetric: string; // e.g., "$127,000"
}

export function SocialShareLinks({ shareUrl, heroMetric }: SocialShareLinksProps) {
  const [copied, setCopied] = useState(false);
  const [textCopied, setTextCopied] = useState(false);

  // LinkedIn only supports URL - content comes from Open Graph meta tags
  const linkedInUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`;
  
  // Twitter/X supports pre-populated text
  const twitterText = `🩸 ${heroMetric}/year bleeding out on delegatable work. Time for a calendar triage.`;
  const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(twitterText)}&url=${encodeURIComponent(shareUrl)}`;

  // Pre-written text for manual copying
  const shareText = `I just discovered I'm losing ${heroMetric}/year on work I should be delegating. Check out my Founder Bleed audit: ${shareUrl}`;

  const copyLink = async () => {
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    toast.success('Link copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  const copyShareText = async () => {
    await navigator.clipboard.writeText(shareText);
    setTextCopied(true);
    toast.success('Share text copied! Paste into LinkedIn');
    setTimeout(() => setTextCopied(false), 3000);
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={copyShareText}>
          {textCopied ? (
            <>
              <Check className="h-4 w-4" />
              Text Copied!
            </>
          ) : (
            <>
              <Copy className="h-4 w-4" />
              Copy Share Text
            </>
          )}
        </Button>
        <Button variant="outline" asChild>
          <a href={linkedInUrl} target="_blank" rel="noopener noreferrer">
            <Linkedin className="h-4 w-4" />
            LinkedIn
          </a>
        </Button>
        <Button variant="outline" asChild>
          <a href={twitterUrl} target="_blank" rel="noopener noreferrer">
            <Twitter className="h-4 w-4" />
            Twitter/X
          </a>
        </Button>
        <Button variant="outline" onClick={copyLink}>
          {copied ? (
            <>
              <Check className="h-4 w-4" />
              Link Copied!
            </>
          ) : (
            <>
              <Link2 className="h-4 w-4" />
              Copy Link
            </>
          )}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Tip: Copy share text first, then click LinkedIn to paste it into your post
      </p>
    </div>
  );
}