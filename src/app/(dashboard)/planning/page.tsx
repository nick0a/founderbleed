// Planning Assistant Page - AI chat with calendar view
// Subscription-gated feature (Starter+)

'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { LogoWithText } from '@/components/logo';
import { ThemeToggle } from '@/components/theme-toggle';
import Link from 'next/link';
import {
  Send,
  Calendar,
  MessageSquare,
  Loader2,
  Check,
  X,
  ChevronLeft,
  ChevronRight,
  Lock,
  Sparkles,
} from 'lucide-react';

interface EventSuggestion {
  id: string;
  title: string;
  start: string;
  end: string;
  tier: string;
  description?: string;
  status: 'pending' | 'added' | 'dismissed';
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  eventSuggestions?: EventSuggestion[];
}

interface AuditContext {
  efficiencyScore: number;
  planningScore: number;
}

const tierColors: Record<string, string> = {
  unique: 'bg-violet-500',
  founder: 'bg-purple-500',
  senior: 'bg-blue-500',
  junior: 'bg-green-500',
  ea: 'bg-teal-500',
};

export default function PlanningPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [context, setContext] = useState<AuditContext | null>(null);
  const [showPaywall, setShowPaywall] = useState(false);
  const [viewMode, setViewMode] = useState<'chat' | 'split'>('chat');
  const [currentWeek, setCurrentWeek] = useState(new Date());

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/signin');
    }
  }, [status, router]);

  useEffect(() => {
    loadSession();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadSession = async () => {
    try {
      const res = await fetch('/api/planning/chat');
      if (res.status === 403) {
        setShowPaywall(true);
        return;
      }
      if (!res.ok) throw new Error('Failed to load session');

      const data = await res.json();
      setSessionId(data.sessionId);
      setMessages(data.messages || []);
      setContext(data.context);
    } catch (error) {
      console.error('Failed to load planning session:', error);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      role: 'user',
      content: input,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/planning/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: input, sessionId }),
      });

      if (res.status === 403) {
        setShowPaywall(true);
        return;
      }

      if (!res.ok) throw new Error('Failed to send message');

      const data = await res.json();
      setSessionId(data.sessionId);
      setMessages((prev) => [...prev, data.message]);
    } catch (error) {
      console.error('Failed to send message:', error);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'Sorry, I encountered an error. Please try again.',
          timestamp: new Date().toISOString(),
        },
      ]);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleAddEvent = async (event: EventSuggestion) => {
    try {
      const res = await fetch('/api/calendar/events/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: event.title,
          startTime: event.start,
          endTime: event.end,
          description: event.description,
        }),
      });

      if (res.status === 403) {
        const data = await res.json();
        if (data.error === 'write_access_required') {
          alert('Calendar write access required. Please grant additional permissions.');
          return;
        }
      }

      if (!res.ok) throw new Error('Failed to add event');

      // Update event status in messages
      setMessages((prev) =>
        prev.map((msg) => ({
          ...msg,
          eventSuggestions: msg.eventSuggestions?.map((e) =>
            e.id === event.id ? { ...e, status: 'added' as const } : e
          ),
        }))
      );
    } catch (error) {
      console.error('Failed to add event:', error);
      alert('Failed to add event. Please try again.');
    }
  };

  const handleDismissEvent = (eventId: string) => {
    setMessages((prev) =>
      prev.map((msg) => ({
        ...msg,
        eventSuggestions: msg.eventSuggestions?.map((e) =>
          e.id === eventId ? { ...e, status: 'dismissed' as const } : e
        ),
      }))
    );
  };

  const getWeekDays = () => {
    const start = new Date(currentWeek);
    start.setDate(start.getDate() - start.getDay());
    return Array.from({ length: 7 }, (_, i) => {
      const day = new Date(start);
      day.setDate(start.getDate() + i);
      return day;
    });
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  // Paywall Modal
  if (showPaywall) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-4">
          <div className="max-w-6xl mx-auto flex justify-between items-center">
            <Link href="/">
              <LogoWithText />
            </Link>
            <ThemeToggle />
          </div>
        </header>

        <div className="flex items-center justify-center min-h-[calc(100vh-80px)]">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 max-w-md mx-4 text-center">
            <div className="w-16 h-16 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
              <Lock className="h-8 w-8 text-purple-600 dark:text-purple-400" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Unlock Planning Assistant
            </h2>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              The AI Planning Assistant is available on Starter plans and above.
              Upgrade to get personalized calendar optimization suggestions.
            </p>
            <div className="space-y-3">
              <Link href="/api/subscription/create-checkout?tier=starter">
                <Button className="w-full bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800">
                  <Sparkles className="mr-2 h-4 w-4" />
                  Upgrade to Starter - $20/mo
                </Button>
              </Link>
              <Link href="/results">
                <Button variant="outline" className="w-full">
                  Back to Results
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Link href="/">
              <LogoWithText />
            </Link>
            <span className="text-gray-300 dark:text-gray-600">|</span>
            <span className="font-semibold text-gray-900 dark:text-white">
              Planning Assistant
            </span>
          </div>
          <div className="flex items-center gap-4">
            {context && (
              <div className="hidden md:flex items-center gap-4 text-sm">
                <span className="text-gray-500">
                  Planning Score:{' '}
                  <span className="font-semibold text-purple-600 dark:text-purple-400">
                    {context.planningScore}%
                  </span>
                </span>
              </div>
            )}
            <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
              <button
                onClick={() => setViewMode('chat')}
                className={`p-2 rounded ${viewMode === 'chat' ? 'bg-white dark:bg-gray-600 shadow' : ''}`}
                title="Chat only"
              >
                <MessageSquare className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode('split')}
                className={`p-2 rounded ${viewMode === 'split' ? 'bg-white dark:bg-gray-600 shadow' : ''}`}
                title="Split view"
              >
                <Calendar className="h-4 w-4" />
              </button>
            </div>
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Chat Panel */}
        <div
          className={`flex flex-col ${viewMode === 'split' ? 'w-1/2 border-r border-gray-200 dark:border-gray-700' : 'w-full max-w-3xl mx-auto'}`}
        >
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 && (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Sparkles className="h-8 w-8 text-purple-600 dark:text-purple-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  Welcome to Planning Assistant
                </h3>
                <p className="text-gray-500 dark:text-gray-400 mb-6">
                  I&apos;ll help you optimize your calendar based on your audit
                  results.
                </p>
                <div className="flex flex-wrap justify-center gap-2">
                  {['Plan my week', 'Add focus blocks', 'Help me delegate'].map(
                    (suggestion) => (
                      <button
                        key={suggestion}
                        onClick={() => setInput(suggestion)}
                        className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                      >
                        {suggestion}
                      </button>
                    )
                  )}
                </div>
              </div>
            )}

            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                    msg.role === 'user'
                      ? 'bg-purple-600 text-white'
                      : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700'
                  }`}
                >
                  <div
                    className={`whitespace-pre-wrap ${msg.role === 'assistant' ? 'text-gray-900 dark:text-white' : ''}`}
                  >
                    {msg.content.replace(/```event[\s\S]*?```/g, '')}
                  </div>

                  {/* Event Suggestions */}
                  {msg.eventSuggestions && msg.eventSuggestions.length > 0 && (
                    <div className="mt-4 space-y-3">
                      {msg.eventSuggestions.map((event) => (
                        <div
                          key={event.id}
                          className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 border border-gray-200 dark:border-gray-600"
                        >
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-gray-500" />
                                <span className="font-medium text-gray-900 dark:text-white">
                                  {event.title}
                                </span>
                              </div>
                              <div className="text-sm text-gray-500 mt-1">
                                {new Date(event.start).toLocaleString('en-US', {
                                  weekday: 'short',
                                  month: 'short',
                                  day: 'numeric',
                                  hour: 'numeric',
                                  minute: '2-digit',
                                })}
                                {' - '}
                                {new Date(event.end).toLocaleTimeString('en-US', {
                                  hour: 'numeric',
                                  minute: '2-digit',
                                })}
                              </div>
                              <span
                                className={`inline-block mt-2 text-xs px-2 py-0.5 rounded text-white ${tierColors[event.tier] || 'bg-gray-500'}`}
                              >
                                {event.tier.charAt(0).toUpperCase() +
                                  event.tier.slice(1)}
                              </span>
                            </div>
                            <div className="flex gap-1">
                              {event.status === 'pending' && (
                                <>
                                  <button
                                    onClick={() => handleAddEvent(event)}
                                    className="p-1.5 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded hover:bg-green-200 dark:hover:bg-green-900/50"
                                    title="Add to Calendar"
                                  >
                                    <Check className="h-4 w-4" />
                                  </button>
                                  <button
                                    onClick={() => handleDismissEvent(event.id)}
                                    className="p-1.5 bg-gray-100 dark:bg-gray-600 text-gray-500 rounded hover:bg-gray-200 dark:hover:bg-gray-500"
                                    title="Dismiss"
                                  >
                                    <X className="h-4 w-4" />
                                  </button>
                                </>
                              )}
                              {event.status === 'added' && (
                                <span className="text-green-600 dark:text-green-400 text-sm flex items-center gap-1">
                                  <Check className="h-4 w-4" />
                                  Added
                                </span>
                              )}
                              {event.status === 'dismissed' && (
                                <span className="text-gray-400 text-sm">
                                  Dismissed
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl px-4 py-3">
                  <Loader2 className="h-5 w-5 animate-spin text-purple-600" />
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                sendMessage();
              }}
              className="flex gap-2"
            >
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about your calendar optimization..."
                className="flex-1 px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                disabled={isLoading}
              />
              <Button
                type="submit"
                disabled={!input.trim() || isLoading}
                className="bg-purple-600 hover:bg-purple-700"
              >
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </div>
        </div>

        {/* Calendar Panel (Split View) */}
        {viewMode === 'split' && (
          <div className="w-1/2 p-4 overflow-y-auto">
            {/* Week Navigation */}
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={() => {
                  const prev = new Date(currentWeek);
                  prev.setDate(prev.getDate() - 7);
                  setCurrentWeek(prev);
                }}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <div className="text-center">
                <button
                  onClick={() => setCurrentWeek(new Date())}
                  className="text-sm text-purple-600 hover:underline"
                >
                  Today
                </button>
              </div>
              <button
                onClick={() => {
                  const next = new Date(currentWeek);
                  next.setDate(next.getDate() + 7);
                  setCurrentWeek(next);
                }}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>

            {/* Week Grid */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              {/* Day Headers */}
              <div className="grid grid-cols-7 border-b border-gray-200 dark:border-gray-700">
                {getWeekDays().map((day) => (
                  <div
                    key={day.toISOString()}
                    className={`p-2 text-center text-sm ${
                      day.toDateString() === new Date().toDateString()
                        ? 'bg-purple-50 dark:bg-purple-900/20'
                        : ''
                    }`}
                  >
                    <div className="font-medium text-gray-900 dark:text-white">
                      {day.toLocaleDateString('en-US', { weekday: 'short' })}
                    </div>
                    <div className="text-gray-500">{day.getDate()}</div>
                  </div>
                ))}
              </div>

              {/* Time Grid */}
              <div className="h-96 overflow-y-auto">
                {Array.from({ length: 10 }, (_, i) => i + 8).map((hour) => (
                  <div
                    key={hour}
                    className="grid grid-cols-7 border-b border-gray-100 dark:border-gray-700"
                  >
                    {getWeekDays().map((day) => (
                      <div
                        key={`${day.toISOString()}-${hour}`}
                        className="h-12 border-r border-gray-100 dark:border-gray-700 relative group hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer"
                      >
                        {day.getDay() === 0 && (
                          <span className="absolute -left-8 text-xs text-gray-400">
                            {hour}:00
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>

            {/* Tier Legend */}
            <div className="mt-4 flex flex-wrap gap-3 justify-center">
              {Object.entries(tierColors).map(([tier, color]) => (
                <div key={tier} className="flex items-center gap-1.5">
                  <div className={`w-3 h-3 rounded ${color}`} />
                  <span className="text-xs text-gray-500 capitalize">{tier}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
