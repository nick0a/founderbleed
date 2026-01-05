'use client';

import { useState, KeyboardEvent } from 'react';
import { X, Loader2, Send } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

interface MultiEmailInputProps {
  onSend: (emails: string[]) => Promise<void>;
  disabled?: boolean;
}

export function MultiEmailInput({ onSend, disabled }: MultiEmailInputProps) {
  const [emails, setEmails] = useState<string[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);

  const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === ' ' && inputValue.trim()) {
      e.preventDefault();
      const email = inputValue.trim();
      if (isValidEmail(email)) {
        if (!emails.includes(email)) {
          setEmails([...emails, email]);
        }
        setInputValue('');
        setError(null);
      } else {
        setError('Invalid email format');
      }
    }

    if (e.key === 'Enter' && emails.length > 0) {
      e.preventDefault();
      handleSend();
    }

    if (e.key === 'Backspace' && !inputValue && emails.length > 0) {
      setEmails(emails.slice(0, -1));
    }
  };

  const removeEmail = (emailToRemove: string) => {
    setEmails(emails.filter(e => e !== emailToRemove));
  };

  const handleSend = async () => {
    if (emails.length === 0) return;
    
    setIsSending(true);
    try {
      await onSend(emails);
      setEmails([]);
      toast.success(`Report sent to ${emails.length} recipient(s)`);
    } catch (err) {
      toast.error('Failed to send report');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2 p-2 border rounded-md bg-background min-h-[42px] focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
        {emails.map((email) => (
          <Badge key={email} variant="secondary" className="gap-1 pr-1">
            {email}
            <button
              type="button"
              onClick={() => removeEmail(email)}
              className="ml-1 rounded-full hover:bg-muted p-0.5"
              disabled={isSending}
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
        <Input
          type="text"
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value);
            setError(null);
          }}
          onKeyDown={handleKeyDown}
          placeholder={emails.length === 0 ? "Enter email addresses..." : "Add more..."}
          className="flex-1 min-w-[150px] border-0 shadow-none focus-visible:ring-0 p-0 h-auto"
          disabled={disabled || isSending}
        />
      </div>
      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          Press Space to add, Enter to send
        </p>
        <Button
          size="sm"
          onClick={handleSend}
          disabled={emails.length === 0 || isSending || disabled}
        >
          {isSending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Sending...
            </>
          ) : (
            <>
              <Send className="h-4 w-4" />
              Send ({emails.length})
            </>
          )}
        </Button>
      </div>
    </div>
  );
}