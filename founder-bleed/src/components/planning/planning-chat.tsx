'use client';

import { useChat } from '@ai-sdk/react';
import { TextStreamChatTransport, UIMessage } from 'ai';
import { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Send, Loader2, Calendar } from 'lucide-react';
import { EventSuggestionCard } from './event-suggestion-card';
import { toast } from 'sonner';

interface EventSuggestion {
  type: string;
  title: string;
  start: string;
  end: string;
  tier: string;
}

// Simplified message format for storage
interface StoredMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface PlanningChatProps {
  auditId?: string;
  sessionId?: string;
  initialMessages?: StoredMessage[];
  hasWriteAccess: boolean;
  onRequestWriteAccess: () => void;
  onEventAdded?: () => void;
  onMessagesChange?: (messages: StoredMessage[]) => void;
  plannableDays?: number[]; // 0=Sun, 1=Mon, ... 6=Sat
}

// Helper to extract text content from UIMessage parts (AI SDK v6)
function getMessageTextContent(message: UIMessage): string {
  return message.parts
    .filter((part): part is { type: 'text'; text: string } => part.type === 'text')
    .map((part) => part.text)
    .join('');
}

export function PlanningChat({
  auditId,
  sessionId,
  initialMessages = [],
  hasWriteAccess,
  onRequestWriteAccess,
  onEventAdded,
  onMessagesChange,
  plannableDays,
}: PlanningChatProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [addedEvents, setAddedEvents] = useState<Set<string>>(new Set());
  const [dismissedEvents, setDismissedEvents] = useState<Set<string>>(new Set());
  const [inputValue, setInputValue] = useState('');
  const lastSavedRef = useRef<string>('');

  // Convert stored messages to UIMessage format for initial state
  const convertToUIMessages = useCallback((stored: StoredMessage[]): UIMessage[] => {
    return stored.map((m, i) => ({
      id: `stored-${i}`,
      role: m.role,
      parts: [{ type: 'text' as const, text: m.content }],
      createdAt: new Date(),
    }));
  }, []);

  // Create transport with memoization to avoid re-creating on each render
  const transport = useMemo(() => new TextStreamChatTransport({
    api: '/api/planning/chat',
    body: { auditId, sessionId, plannableDays },
  }), [auditId, sessionId, plannableDays]);

  const { messages, status, error, sendMessage, setMessages } = useChat({
    transport,
    onError: (err) => {
      console.error('Chat error:', err);
      toast.error('Failed to send message. Please try again.');
    },
  });

  // Initialize messages on first load
  useEffect(() => {
    if (initialMessages.length > 0) {
      setMessages(convertToUIMessages(initialMessages));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reset messages when sessionId or initialMessages change
  useEffect(() => {
    setMessages(convertToUIMessages(initialMessages));
    setAddedEvents(new Set());
    setDismissedEvents(new Set());
  }, [sessionId, initialMessages, setMessages, convertToUIMessages]);

  // Save messages when they change (debounced)
  useEffect(() => {
    if (!onMessagesChange || status === 'streaming') return;

    const storedMessages: StoredMessage[] = messages.map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: getMessageTextContent(m),
    }));

    // Only save if messages have changed
    const messagesJson = JSON.stringify(storedMessages);
    if (messagesJson !== lastSavedRef.current && storedMessages.length > 0) {
      lastSavedRef.current = messagesJson;
      onMessagesChange(storedMessages);
    }
  }, [messages, status, onMessagesChange]);

  const isLoading = status === 'streaming' || status === 'submitted';

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Parse event suggestions from AI response
  const parseEventSuggestions = (content: string): EventSuggestion[] => {
    const jsonRegex = /```json\n([\s\S]*?)\n```/g;
    const suggestions: EventSuggestion[] = [];

    let match;
    while ((match = jsonRegex.exec(content)) !== null) {
      try {
        const parsed = JSON.parse(match[1]);
        if (parsed.type === 'event_suggestion') {
          suggestions.push(parsed);
        }
      } catch {
        // Invalid JSON, skip
      }
    }

    return suggestions;
  };

  // Get all suggestions from all messages
  const getAllSuggestions = (): EventSuggestion[] => {
    const allSuggestions: EventSuggestion[] = [];
    messages.forEach((message) => {
      if (message.role === 'assistant') {
        const textContent = getMessageTextContent(message);
        const suggestions = parseEventSuggestions(textContent);
        allSuggestions.push(...suggestions);
      }
    });
    return allSuggestions;
  };

  const handleAddEvent = async (suggestion: EventSuggestion) => {
    if (!hasWriteAccess) {
      onRequestWriteAccess();
      return;
    }

    try {
      const response = await fetch('/api/calendar/events/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: suggestion.title,
          startTime: suggestion.start,
          endTime: suggestion.end,
          tier: suggestion.tier,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        if (data.error === 'write_access_required') {
          onRequestWriteAccess();
          return;
        }
        throw new Error(data.error || 'Failed to create event');
      }

      // Mark event as added
      const eventKey = `${suggestion.title}-${suggestion.start}`;
      setAddedEvents((prev) => new Set([...prev, eventKey]));
      toast.success(`Added "${suggestion.title}" to your calendar`);

      // Notify parent to refresh calendar
      onEventAdded?.();
    } catch (error) {
      console.error('Add event error:', error);
      toast.error('Failed to add event to calendar');
    }
  };

  const handleAddAll = async () => {
    const allSuggestions = getAllSuggestions();
    const unadded = allSuggestions.filter(
      (s) => !addedEvents.has(`${s.title}-${s.start}`)
    );

    if (unadded.length === 0) {
      toast.info('All suggestions have already been added');
      return;
    }

    if (!hasWriteAccess) {
      onRequestWriteAccess();
      return;
    }

    let addedCount = 0;
    for (const suggestion of unadded) {
      try {
        const response = await fetch('/api/calendar/events/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: suggestion.title,
            startTime: suggestion.start,
            endTime: suggestion.end,
            tier: suggestion.tier,
          }),
        });

        if (response.ok) {
          const eventKey = `${suggestion.title}-${suggestion.start}`;
          setAddedEvents((prev) => new Set([...prev, eventKey]));
          addedCount++;
        }
      } catch {
        // Continue with next event
      }
    }

    if (addedCount > 0) {
      toast.success(`Added ${addedCount} event${addedCount > 1 ? 's' : ''} to your calendar`);
      // Notify parent to refresh calendar
      onEventAdded?.();
    }
  };

  // Remove JSON code blocks from displayed content
  const cleanContent = (content: string): string => {
    return content.replace(/```json\n[\s\S]*?\n```/g, '').trim();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isLoading) return;

    const message = inputValue.trim();
    setInputValue('');

    await sendMessage({ text: message });
  };

  const allSuggestions = getAllSuggestions();
  const unaddedSuggestions = allSuggestions.filter(
    (s) => !addedEvents.has(`${s.title}-${s.start}`) && !dismissedEvents.has(`${s.title}-${s.start}`)
  );

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-muted-foreground py-8">
            <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="font-medium">Start a conversation to get planning recommendations</p>
            <p className="text-sm mt-2">Try: &quot;Help me plan my week&quot;</p>
          </div>
        )}

        {messages.map((message) => {
          const textContent = getMessageTextContent(message);
          return (
            <div
              key={message.id}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <Card
                className={`max-w-[85%] p-4 ${
                  message.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted'
                }`}
              >
                <div className="whitespace-pre-wrap text-sm">
                  {cleanContent(textContent)}
                </div>

                {/* Render event suggestions */}
                {message.role === 'assistant' &&
                  parseEventSuggestions(textContent).map((suggestion, i) => {
                    const eventKey = `${suggestion.title}-${suggestion.start}`;
                    const isAdded = addedEvents.has(eventKey);
                    const isDismissed = dismissedEvents.has(eventKey);

                    return (
                      <EventSuggestionCard
                        key={i}
                        suggestion={suggestion}
                        isAdded={isAdded}
                        isDismissed={isDismissed}
                        onAdd={() => handleAddEvent(suggestion)}
                        onDismiss={() => {
                          // Mark as dismissed to hide from UI
                          setDismissedEvents((prev) => new Set([...prev, eventKey]));
                        }}
                      />
                    );
                  })}
              </Card>
            </div>
          );
        })}

        {isLoading && (
          <div className="flex justify-start">
            <Card className="p-4 bg-muted">
              <Loader2 className="h-4 w-4 animate-spin" />
            </Card>
          </div>
        )}
      </div>

      {/* Bulk add button */}
      {unaddedSuggestions.length > 1 && (
        <div className="px-4 py-2 border-t bg-muted/50">
          <Button
            variant="outline"
            size="sm"
            onClick={handleAddAll}
            className="w-full"
          >
            <Calendar className="h-4 w-4 mr-2" />
            Add All Suggestions ({unaddedSuggestions.length})
          </Button>
        </div>
      )}

      {/* Error display */}
      {error && (
        <div className="px-4 py-2 text-sm text-destructive bg-destructive/10">
          Error: {error.message}
        </div>
      )}

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-4 border-t">
        <div className="flex gap-2">
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Ask about planning your day, week, or month..."
            disabled={isLoading}
            className="flex-1"
          />
          <Button type="submit" disabled={isLoading || !inputValue.trim()}>
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
