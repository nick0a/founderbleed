'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Plus,
  MessageSquare,
  MoreVertical,
  Archive,
  Trash2,
  Pencil,
  ArchiveRestore,
  Loader2,
} from 'lucide-react';
import { formatDistanceToNow, isToday, format } from 'date-fns';

export interface PlanningSession {
  id: string;
  title: string | null;
  createdAt: string;
  updatedAt: string;
  status: string;
  conversationHistory: Array<{ role: string; content: string }>;
}

interface ConversationSidebarProps {
  sessions: PlanningSession[];
  currentSessionId: string | null;
  showArchived: boolean;
  onShowArchivedChange: (show: boolean) => void;
  onSelectSession: (sessionId: string) => void;
  onCreateSession: () => void;
  onArchiveSession: (sessionId: string) => void;
  onUnarchiveSession: (sessionId: string) => void;
  onDeleteSession: (sessionId: string) => void;
  onRenameSession: (sessionId: string, newTitle: string) => void;
  isLoading?: boolean;
}

export function ConversationSidebar({
  sessions,
  currentSessionId,
  showArchived,
  onShowArchivedChange,
  onSelectSession,
  onCreateSession,
  onArchiveSession,
  onUnarchiveSession,
  onDeleteSession,
  onRenameSession,
  isLoading,
}: ConversationSidebarProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const activeSessions = sessions.filter((s) => s.status === 'active');
  const archivedSessions = sessions.filter((s) => s.status === 'archived');

  const handleStartRename = (session: PlanningSession) => {
    setEditingId(session.id);
    setEditTitle(session.title || getDefaultTitle(session));
  };

  const handleSaveRename = () => {
    if (editingId && editTitle.trim()) {
      onRenameSession(editingId, editTitle.trim());
    }
    setEditingId(null);
    setEditTitle('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveRename();
    } else if (e.key === 'Escape') {
      setEditingId(null);
      setEditTitle('');
    }
  };

  // Format timestamp: time for today, date for other days
  const formatSessionTime = (dateStr: string) => {
    const date = new Date(dateStr);
    if (isToday(date)) {
      return format(date, 'h:mm a'); // e.g., "2:30 PM"
    }
    return format(date, 'MMM d'); // e.g., "Jan 6"
  };

  const getDefaultTitle = (session: PlanningSession) => {
    // Try to get first user message as title
    const firstUserMessage = session.conversationHistory?.find(
      (m) => m.role === 'user'
    );
    if (firstUserMessage?.content) {
      const content = firstUserMessage.content;
      return content.length > 25 ? content.slice(0, 22) + '...' : content;
    }
    return 'New conversation';
  };

  const renderSession = (session: PlanningSession) => {
    const isActive = session.id === currentSessionId;
    const isEditing = editingId === session.id;
    const displayTitle = session.title || getDefaultTitle(session);

    return (
      <div
        key={session.id}
        className={`group flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors ${
          isActive
            ? 'bg-primary/10 text-primary'
            : 'hover:bg-muted'
        }`}
        onClick={() => !isEditing && onSelectSession(session.id)}
      >
        <MessageSquare className="h-4 w-4 flex-shrink-0" />

        {isEditing ? (
          <Input
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            onBlur={handleSaveRename}
            onKeyDown={handleKeyDown}
            className="h-6 text-sm"
            autoFocus
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <div className="flex-1 min-w-0">
            <span className="block truncate text-sm">{displayTitle}</span>
            <span className="block text-xs text-muted-foreground">
              {formatSessionTime(session.updatedAt || session.createdAt)}
            </span>
          </div>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => handleStartRename(session)}>
              <Pencil className="h-4 w-4 mr-2" />
              Rename
            </DropdownMenuItem>
            {session.status === 'active' ? (
              <DropdownMenuItem onClick={() => onArchiveSession(session.id)}>
                <Archive className="h-4 w-4 mr-2" />
                Archive
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem onClick={() => onUnarchiveSession(session.id)}>
                <ArchiveRestore className="h-4 w-4 mr-2" />
                Unarchive
              </DropdownMenuItem>
            )}
            <DropdownMenuItem
              className="text-destructive"
              onClick={() => setDeleteConfirmId(session.id)}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full border-r bg-muted/30">
      {/* Header */}
      <div className="p-3 border-b">
        <Button
          onClick={onCreateSession}
          className="w-full"
          size="sm"
          disabled={isLoading}
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Plus className="h-4 w-4 mr-2" />
          )}
          New Chat
        </Button>
      </div>

      {/* Sessions List */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {activeSessions.length === 0 && !showArchived ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No conversations yet
            </p>
          ) : (
            activeSessions.map(renderSession)
          )}

          {/* Archived section */}
          {archivedSessions.length > 0 && (
            <div className="mt-4">
              <button
                onClick={() => onShowArchivedChange(!showArchived)}
                className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:text-foreground w-full"
              >
                <Archive className="h-4 w-4" />
                <span>Archived ({archivedSessions.length})</span>
              </button>

              {showArchived && (
                <div className="mt-1 space-y-1 opacity-70">
                  {archivedSessions.map(renderSession)}
                </div>
              )}
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Conversation</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this conversation? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (deleteConfirmId) {
                  onDeleteSession(deleteConfirmId);
                  setDeleteConfirmId(null);
                }
              }}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
