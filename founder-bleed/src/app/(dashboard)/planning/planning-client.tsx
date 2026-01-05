'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { PlanningChat } from '@/components/planning/planning-chat';
import { CalendarWeekView } from '@/components/planning/calendar-week-view';
import { ScopeUpgradeModal } from '@/components/planning/scope-upgrade-modal';
import { ConversationSidebar, PlanningSession } from '@/components/planning/conversation-sidebar';
import { PaywallModal } from '@/components/paywall-modal';
import { Layout, MessageSquare, Loader2, GripVertical, PanelLeftClose, PanelLeft } from 'lucide-react';
import { toast } from 'sonner';

type ViewMode = 'chat' | 'split';

interface AuditData {
  id: string;
  planningScore: number | null;
}

interface CalendarSettings {
  calendarViewDays: number;
  plannableDays: number[];
}

interface StoredMessage {
  role: 'user' | 'assistant';
  content: string;
}

export default function PlanningClient() {
  const { data: session, status } = useSession();
  const [viewMode, setViewMode] = useState<ViewMode>('split');
  const [showPaywall, setShowPaywall] = useState(false);
  const [showScopeUpgrade, setShowScopeUpgrade] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState<boolean | null>(null);
  const [hasWriteAccess, setHasWriteAccess] = useState(false);
  const [latestAudit, setLatestAudit] = useState<AuditData | null>(null);
  const [loading, setLoading] = useState(true);
  const [calendarSettings, setCalendarSettings] = useState<CalendarSettings>({
    calendarViewDays: 7,
    plannableDays: [1, 2, 3, 4, 5],
  });

  // Conversation management
  const [sessions, setSessions] = useState<PlanningSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [currentMessages, setCurrentMessages] = useState<StoredMessage[]>([]);
  const [showSidebar, setShowSidebar] = useState(true);
  const [showArchived, setShowArchived] = useState(false);
  const [sessionsLoading, setSessionsLoading] = useState(false);

  // Resizable split state
  const [splitPosition, setSplitPosition] = useState(50);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);

  // Calendar refresh key
  const [calendarRefreshKey, setCalendarRefreshKey] = useState(0);

  const handleEventAdded = useCallback(() => {
    setCalendarRefreshKey((prev) => prev + 1);
  }, []);

  // Fetch sessions
  const fetchSessions = useCallback(async () => {
    try {
      const response = await fetch(`/api/planning/sessions?includeArchived=true`);
      if (response.ok) {
        const data = await response.json();
        setSessions(data.sessions || []);
      }
    } catch (error) {
      console.error('Failed to fetch sessions:', error);
    }
  }, []);

  // Create new session
  const handleCreateSession = useCallback(async () => {
    setSessionsLoading(true);
    try {
      const response = await fetch('/api/planning/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ auditRunId: latestAudit?.id }),
      });

      if (response.ok) {
        const data = await response.json();
        setSessions((prev) => [data.session, ...prev]);
        setCurrentSessionId(data.session.id);
        setCurrentMessages([]);
      }
    } catch (error) {
      console.error('Failed to create session:', error);
      toast.error('Failed to create new conversation');
    } finally {
      setSessionsLoading(false);
    }
  }, [latestAudit?.id]);

  // Select session
  const handleSelectSession = useCallback((sessionId: string) => {
    const selected = sessions.find((s) => s.id === sessionId);
    if (selected) {
      setCurrentSessionId(sessionId);
      // Cast conversation history to proper type
      const messages = (selected.conversationHistory || []).map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }));
      setCurrentMessages(messages);
    }
  }, [sessions]);

  // Archive session
  const handleArchiveSession = useCallback(async (sessionId: string) => {
    try {
      const response = await fetch(`/api/planning/sessions/${sessionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'archived' }),
      });

      if (response.ok) {
        setSessions((prev) =>
          prev.map((s) =>
            s.id === sessionId ? { ...s, status: 'archived' } : s
          )
        );
        if (currentSessionId === sessionId) {
          // Create new session if current was archived
          handleCreateSession();
        }
        toast.success('Conversation archived');
      }
    } catch (error) {
      console.error('Failed to archive session:', error);
      toast.error('Failed to archive conversation');
    }
  }, [currentSessionId, handleCreateSession]);

  // Unarchive session
  const handleUnarchiveSession = useCallback(async (sessionId: string) => {
    try {
      const response = await fetch(`/api/planning/sessions/${sessionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'active' }),
      });

      if (response.ok) {
        setSessions((prev) =>
          prev.map((s) =>
            s.id === sessionId ? { ...s, status: 'active', archivedAt: undefined } : s
          )
        );
        toast.success('Conversation restored');
      }
    } catch (error) {
      console.error('Failed to unarchive session:', error);
      toast.error('Failed to restore conversation');
    }
  }, []);

  // Delete session
  const handleDeleteSession = useCallback(async (sessionId: string) => {
    try {
      const response = await fetch(`/api/planning/sessions/${sessionId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setSessions((prev) => prev.filter((s) => s.id !== sessionId));
        if (currentSessionId === sessionId) {
          // Select another session or create new
          const remaining = sessions.filter((s) => s.id !== sessionId && s.status === 'active');
          if (remaining.length > 0) {
            handleSelectSession(remaining[0].id);
          } else {
            handleCreateSession();
          }
        }
        toast.success('Conversation deleted');
      }
    } catch (error) {
      console.error('Failed to delete session:', error);
      toast.error('Failed to delete conversation');
    }
  }, [currentSessionId, sessions, handleSelectSession, handleCreateSession]);

  // Rename session
  const handleRenameSession = useCallback(async (sessionId: string, newTitle: string) => {
    try {
      const response = await fetch(`/api/planning/sessions/${sessionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTitle }),
      });

      if (response.ok) {
        setSessions((prev) =>
          prev.map((s) =>
            s.id === sessionId ? { ...s, title: newTitle } : s
          )
        );
      }
    } catch (error) {
      console.error('Failed to rename session:', error);
      toast.error('Failed to rename conversation');
    }
  }, []);

  // Save messages to session (debounced callback from chat)
  const handleMessagesChange = useCallback(async (messages: StoredMessage[]) => {
    if (!currentSessionId) return;

    try {
      const response = await fetch(`/api/planning/sessions/${currentSessionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationHistory: messages }),
      });

      // Get the updated session (may include auto-generated title)
      const data = await response.json();
      const updatedSession = data.session;

      // Update local state with any server-side changes (like auto-generated title)
      setSessions((prev) =>
        prev.map((s) =>
          s.id === currentSessionId
            ? {
                ...s,
                conversationHistory: messages,
                updatedAt: new Date().toISOString(),
                // Use server title if it was auto-generated
                title: updatedSession?.title || s.title,
              }
            : s
        )
      );
    } catch (error) {
      console.error('Failed to save messages:', error);
    }
  }, [currentSessionId]);

  // Handle resize drag
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isDragging.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging.current || !containerRef.current) return;

      const container = containerRef.current;
      const rect = container.getBoundingClientRect();
      const newPosition = ((e.clientX - rect.left) / rect.width) * 100;

      setSplitPosition(Math.min(80, Math.max(20, newPosition)));
    };

    const handleMouseUp = () => {
      isDragging.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  // Check subscription status and load sessions
  useEffect(() => {
    async function checkAccess() {
      try {
        // Check subscription
        const subResponse = await fetch('/api/subscription/status');
        if (subResponse.ok) {
          const subData = await subResponse.json();
          setIsSubscribed(subData.isSubscribed);
          if (!subData.isSubscribed) {
            setShowPaywall(true);
          }
        } else {
          setIsSubscribed(false);
          setShowPaywall(true);
        }

        // Check calendar write access
        const scopeResponse = await fetch('/api/calendar/upgrade-scope');
        if (scopeResponse.ok) {
          const scopeData = await scopeResponse.json();
          setHasWriteAccess(scopeData.hasWriteAccess);
        }

        // Get latest audit for context
        const auditsResponse = await fetch('/api/audits');
        if (auditsResponse.ok) {
          const audits = await auditsResponse.json();
          if (audits.length > 0) {
            setLatestAudit({
              id: audits[0].id,
              planningScore: audits[0].planningScore,
            });
          }
        }

        // Fetch calendar settings
        const settingsResponse = await fetch('/api/user/settings');
        if (settingsResponse.ok) {
          const settingsData = await settingsResponse.json();
          if (settingsData.calendarSettings) {
            setCalendarSettings({
              calendarViewDays: settingsData.calendarSettings.calendarViewDays || 7,
              plannableDays: settingsData.calendarSettings.plannableDays || [1, 2, 3, 4, 5],
            });
          }
        }

        // Load sessions
        await fetchSessions();
      } catch (error) {
        console.error('Access check error:', error);
        setIsSubscribed(false);
        setShowPaywall(true);
      } finally {
        setLoading(false);
      }
    }

    if (status !== 'loading') {
      checkAccess();
    }
  }, [status, fetchSessions]);

  // Auto-select or create session when sessions load
  useEffect(() => {
    if (!loading && sessions.length === 0 && !currentSessionId && isSubscribed) {
      handleCreateSession();
    } else if (!loading && sessions.length > 0 && !currentSessionId) {
      const activeSessions = sessions.filter((s) => s.status === 'active');
      if (activeSessions.length > 0) {
        handleSelectSession(activeSessions[0].id);
      } else {
        handleCreateSession();
      }
    }
  }, [loading, sessions, currentSessionId, isSubscribed, handleCreateSession, handleSelectSession]);

  if (status === 'loading' || loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="p-8 text-center">
        <p className="text-muted-foreground">Please sign in to access the Planning Assistant.</p>
      </div>
    );
  }

  // Show paywall for non-subscribers
  if (isSubscribed === false) {
    return (
      <div className="p-8">
        <Card className="max-w-lg mx-auto p-8 text-center">
          <h2 className="text-2xl font-bold mb-4">Planning Assistant</h2>
          <p className="text-muted-foreground mb-6">
            Get AI-powered recommendations to optimize your calendar and improve productivity.
            This feature is available to subscribers.
          </p>
          <Button onClick={() => setShowPaywall(true)}>Subscribe to Access</Button>
        </Card>

        <PaywallModal
          open={showPaywall}
          onOpenChange={setShowPaywall}
          reason="subscription_required"
          feature="Planning Assistant"
        />
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      {/* Conversation Sidebar */}
      {showSidebar && (
        <div className="w-64 flex-shrink-0">
          <ConversationSidebar
            sessions={sessions}
            currentSessionId={currentSessionId}
            showArchived={showArchived}
            onShowArchivedChange={setShowArchived}
            onSelectSession={handleSelectSession}
            onCreateSession={handleCreateSession}
            onArchiveSession={handleArchiveSession}
            onUnarchiveSession={handleUnarchiveSession}
            onDeleteSession={handleDeleteSession}
            onRenameSession={handleRenameSession}
            isLoading={sessionsLoading}
          />
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowSidebar(!showSidebar)}
            >
              {showSidebar ? (
                <PanelLeftClose className="h-4 w-4" />
              ) : (
                <PanelLeft className="h-4 w-4" />
              )}
            </Button>
            <div>
              <h1 className="text-xl font-semibold">Planning Assistant</h1>
              <p className="text-sm text-muted-foreground">
                AI-powered calendar optimization
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant={viewMode === 'chat' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('chat')}
            >
              <MessageSquare className="h-4 w-4 mr-2" />
              Chat Only
            </Button>
            <Button
              variant={viewMode === 'split' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('split')}
            >
              <Layout className="h-4 w-4 mr-2" />
              Split View
            </Button>
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 overflow-hidden" ref={containerRef}>
          {viewMode === 'chat' ? (
            <div className="h-full">
              <PlanningChat
                auditId={latestAudit?.id}
                sessionId={currentSessionId || undefined}
                initialMessages={currentMessages}
                hasWriteAccess={hasWriteAccess}
                onRequestWriteAccess={() => setShowScopeUpgrade(true)}
                onEventAdded={handleEventAdded}
                onMessagesChange={handleMessagesChange}
                plannableDays={calendarSettings.plannableDays}
              />
            </div>
          ) : (
            <div className="flex h-full">
              {/* Chat Panel */}
              <div
                className="h-full overflow-hidden"
                style={{ width: `${splitPosition}%` }}
              >
                <PlanningChat
                  auditId={latestAudit?.id}
                  sessionId={currentSessionId || undefined}
                  initialMessages={currentMessages}
                  hasWriteAccess={hasWriteAccess}
                  onRequestWriteAccess={() => setShowScopeUpgrade(true)}
                  onEventAdded={handleEventAdded}
                  onMessagesChange={handleMessagesChange}
                  plannableDays={calendarSettings.plannableDays}
                />
              </div>

              {/* Resizable Divider */}
              <div
                className="w-2 h-full bg-border hover:bg-primary/20 cursor-col-resize flex items-center justify-center transition-colors"
                onMouseDown={handleMouseDown}
              >
                <GripVertical className="h-6 w-6 text-muted-foreground" />
              </div>

              {/* Calendar Panel */}
              <div
                className="h-full overflow-hidden p-4"
                style={{ width: `${100 - splitPosition}%` }}
              >
                <CalendarWeekView
                  auditId={latestAudit?.id}
                  planningScore={latestAudit?.planningScore ?? undefined}
                  refreshKey={calendarRefreshKey}
                  hasWriteAccess={hasWriteAccess}
                  onRequestWriteAccess={() => setShowScopeUpgrade(true)}
                  visibleDays={calendarSettings.calendarViewDays}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <ScopeUpgradeModal
        open={showScopeUpgrade}
        onOpenChange={setShowScopeUpgrade}
      />

      <PaywallModal
        open={showPaywall}
        onOpenChange={setShowPaywall}
        reason="subscription_required"
        feature="Planning Assistant"
      />
    </div>
  );
}
