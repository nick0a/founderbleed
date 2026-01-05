'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';

interface CalendarEvent {
  id: string;
  calendarId?: string;
  title: string;
  start: string;
  end: string;
  tier?: string;
  planningScore?: number;
  isAllDay?: boolean;
}

interface CalendarWeekViewProps {
  auditId?: string;
  planningScore?: number;
  refreshKey?: number; // Increment to trigger refresh
  hasWriteAccess?: boolean;
  onRequestWriteAccess?: () => void;
  visibleDays?: number; // 1, 3, 5, 6, or 7 days to display
}

// Tier colors
const TIER_COLORS: Record<string, string> = {
  unique: 'bg-purple-500',
  founder: 'bg-blue-500',
  senior: 'bg-green-500',
  junior: 'bg-yellow-500',
  ea: 'bg-gray-500',
};

const TIER_BG_COLORS: Record<string, string> = {
  unique: 'bg-purple-100 dark:bg-purple-900/30 border-purple-300 dark:border-purple-700',
  founder: 'bg-blue-100 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700',
  senior: 'bg-green-100 dark:bg-green-900/30 border-green-300 dark:border-green-700',
  junior: 'bg-yellow-100 dark:bg-yellow-900/30 border-yellow-300 dark:border-yellow-700',
  ea: 'bg-gray-100 dark:bg-gray-900/30 border-gray-300 dark:border-gray-700',
};

// Planning score badge colors
function getPlanningScoreBadge(score: number | undefined) {
  if (score === undefined || score === null) return null;

  if (score >= 70) {
    return <Badge variant="outline" className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 text-xs">{score}%</Badge>;
  } else if (score >= 40) {
    return <Badge variant="outline" className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 text-xs">{score}%</Badge>;
  } else {
    return <Badge variant="outline" className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 text-xs">{score}%</Badge>;
  }
}

export function CalendarWeekView({
  auditId,
  planningScore,
  refreshKey,
  hasWriteAccess,
  onRequestWriteAccess,
  visibleDays = 7,
}: CalendarWeekViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingEventId, setDeletingEventId] = useState<string | null>(null);
  const [hoveredEventId, setHoveredEventId] = useState<string | null>(null);

  // Delete event handler
  const handleDeleteEvent = async (event: CalendarEvent, e: React.MouseEvent) => {
    e.stopPropagation();

    if (!hasWriteAccess) {
      onRequestWriteAccess?.();
      return;
    }

    setDeletingEventId(event.id);
    try {
      const response = await fetch('/api/calendar/events/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId: event.id,
          calendarId: event.calendarId || 'primary',
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        if (data.error === 'write_access_required') {
          onRequestWriteAccess?.();
          return;
        }
        throw new Error(data.error || 'Failed to delete event');
      }

      // Remove from local state
      setEvents((prev) => prev.filter((e) => e.id !== event.id));
      toast.success(`Deleted "${event.title}"`);
    } catch (error) {
      console.error('Delete event error:', error);
      toast.error('Failed to delete event');
    } finally {
      setDeletingEventId(null);
    }
  };

  // Get dates based on visible days setting
  const getVisibleDates = (date: Date, numDays: number) => {
    const dates = [];
    const startDate = new Date(date);
    startDate.setHours(0, 0, 0, 0);

    // For single day view, just show that day
    if (numDays === 1) {
      dates.push(new Date(startDate));
      return dates;
    }

    // For multi-day views, start from Monday of the current week
    const dayOfWeek = startDate.getDay();
    const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Adjust for Sunday (0) to go back to Monday
    startDate.setDate(startDate.getDate() + diff);

    for (let i = 0; i < numDays; i++) {
      const d = new Date(startDate);
      d.setDate(startDate.getDate() + i);
      dates.push(d);
    }
    return dates;
  };

  const displayDates = getVisibleDates(currentDate, visibleDays);
  const periodStart = displayDates[0];
  const periodEnd = new Date(displayDates[displayDates.length - 1]);
  periodEnd.setHours(23, 59, 59, 999);

  // Fetch events
  useEffect(() => {
    async function fetchEvents() {
      setLoading(true);
      try {
        // First get calendar list
        const calResponse = await fetch('/api/calendar/list');
        if (!calResponse.ok) throw new Error('Failed to fetch calendars');

        const calData = await calResponse.json();
        // Handle response format: { calendars: [...] }
        const calendars = calData.calendars || calData || [];

        if (!Array.isArray(calendars) || calendars.length === 0) {
          setEvents([]);
          setLoading(false);
          return;
        }

        const calendarIds = calendars.map((c: { id: string }) => c.id);

        // Fetch events
        const params = new URLSearchParams({
          calendarIds: calendarIds.join(','),
          dateStart: periodStart.toISOString(),
          dateEnd: periodEnd.toISOString(),
        });

        const eventsResponse = await fetch(`/api/calendar/events?${params}`);
        if (!eventsResponse.ok) throw new Error('Failed to fetch events');

        const eventsData = await eventsResponse.json();
        // Handle response format: { events: [...] } or just array
        const eventsArray = eventsData.events || eventsData || [];
        setEvents(Array.isArray(eventsArray) ? eventsArray : []);
      } catch (error) {
        console.error('Failed to fetch events:', error);
        setEvents([]);
      } finally {
        setLoading(false);
      }
    }

    fetchEvents();
  }, [periodStart.toISOString(), refreshKey, visibleDays]);

  // Navigate - for single day view, move by 1 day; for multi-day views, move by 7 days (week)
  const goToPreviousPeriod = () => {
    setCurrentDate((d) => {
      const newDate = new Date(d);
      newDate.setDate(newDate.getDate() - (visibleDays === 1 ? 1 : 7));
      return newDate;
    });
  };

  const goToNextPeriod = () => {
    setCurrentDate((d) => {
      const newDate = new Date(d);
      newDate.setDate(newDate.getDate() + (visibleDays === 1 ? 1 : 7));
      return newDate;
    });
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // Hours to display
  const hours = Array.from({ length: 11 }, (_, i) => i + 8); // 8am to 6pm

  // Get events for a specific day
  const getEventsForDay = (date: Date): CalendarEvent[] => {
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);

    return events.filter((event) => {
      const eventStart = new Date(event.start);
      const eventEnd = new Date(event.end);
      return eventStart <= dayEnd && eventEnd >= dayStart;
    });
  };

  // Calculate event position
  const getEventPosition = (event: CalendarEvent, dayDate: Date) => {
    const eventStart = new Date(event.start);
    const eventEnd = new Date(event.end);

    // Clamp to day boundaries
    const dayStart = new Date(dayDate);
    dayStart.setHours(8, 0, 0, 0);
    const dayEnd = new Date(dayDate);
    dayEnd.setHours(18, 0, 0, 0);

    const clampedStart = new Date(Math.max(eventStart.getTime(), dayStart.getTime()));
    const clampedEnd = new Date(Math.min(eventEnd.getTime(), dayEnd.getTime()));

    const startHour = clampedStart.getHours() + clampedStart.getMinutes() / 60;
    const endHour = clampedEnd.getHours() + clampedEnd.getMinutes() / 60;

    const top = Math.max(0, (startHour - 8) * 48); // 48px per hour
    const height = Math.max(20, (endHour - startHour) * 48);

    return { top, height };
  };

  const formatDateRange = () => {
    const start = displayDates[0];
    const end = displayDates[displayDates.length - 1];
    const startMonth = start.toLocaleDateString('en-US', { month: 'short' });
    const year = start.getFullYear();

    // For single day view, just show the date
    if (visibleDays === 1) {
      return `${startMonth} ${start.getDate()}, ${year}`;
    }

    const endMonth = end.toLocaleDateString('en-US', { month: 'short' });
    if (startMonth === endMonth) {
      return `${startMonth} ${start.getDate()} - ${end.getDate()}, ${year}`;
    }
    return `${startMonth} ${start.getDate()} - ${endMonth} ${end.getDate()}, ${year}`;
  };

  return (
    <Card className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={goToPreviousPeriod}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={goToNextPeriod}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={goToToday}>
            Today
          </Button>
        </div>
        <div className="font-medium">{formatDateRange()}</div>
        {planningScore !== undefined && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Planning Score:</span>
            {getPlanningScoreBadge(planningScore)}
          </div>
        )}
      </div>

      {/* Calendar Grid */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="flex-1 overflow-auto">
          <div
            className="grid min-w-[200px]"
            style={{ gridTemplateColumns: `60px repeat(${visibleDays}, 1fr)` }}
          >
            {/* Time column header */}
            <div className="border-b border-r p-2 h-12 sticky top-0 bg-background z-10"></div>

            {/* Day headers */}
            {displayDates.map((date, i) => {
              const isToday = date.toDateString() === new Date().toDateString();
              return (
                <div
                  key={i}
                  className={`border-b p-2 h-12 text-center sticky top-0 bg-background z-10 ${
                    isToday ? 'bg-primary/10' : ''
                  }`}
                >
                  <div className="text-xs text-muted-foreground">
                    {date.toLocaleDateString('en-US', { weekday: 'short' })}
                  </div>
                  <div className={`text-sm font-medium ${isToday ? 'text-primary' : ''}`}>
                    {date.getDate()}
                  </div>
                </div>
              );
            })}

            {/* Time slots and events */}
            {hours.map((hour) => (
              <div key={`hour-row-${hour}`} className="contents">
                {/* Time label */}
                <div
                  className="border-r border-b p-1 text-xs text-muted-foreground h-12"
                >
                  {hour > 12 ? `${hour - 12}pm` : hour === 12 ? '12pm' : `${hour}am`}
                </div>

                {/* Day cells */}
                {displayDates.map((date, dayIndex) => {
                  const isToday = date.toDateString() === new Date().toDateString();
                  // Only render events in the first hour row, positioned absolutely
                  const dayEvents = hour === 8 ? getEventsForDay(date) : [];

                  return (
                    <div
                      key={`${hour}-${dayIndex}`}
                      className={`border-b relative h-12 ${
                        isToday ? 'bg-primary/5' : ''
                      } ${dayIndex < visibleDays - 1 ? 'border-r' : ''}`}
                    >
                      {dayEvents.map((event, eventIndex) => {
                        const { top, height } = getEventPosition(event, date);
                        const tier = event.tier || 'senior';
                        const bgClass = TIER_BG_COLORS[tier] || TIER_BG_COLORS.senior;
                        const isHovered = hoveredEventId === event.id;
                        const isDeleting = deletingEventId === event.id;

                        return (
                          <div
                            key={event.id}
                            className={`absolute left-1 right-1 rounded border px-1 py-0.5 text-xs overflow-hidden cursor-pointer group ${bgClass}`}
                            style={{
                              top: `${top}px`,
                              height: `${height}px`,
                              zIndex: isHovered ? 100 : eventIndex + 1,
                            }}
                            onMouseEnter={() => setHoveredEventId(event.id)}
                            onMouseLeave={() => setHoveredEventId(null)}
                          >
                            <div className="flex items-start justify-between gap-1">
                              <span className="font-medium truncate flex-1">
                                {event.title}
                              </span>
                              <div className="flex items-center gap-1 flex-shrink-0">
                                {event.planningScore !== undefined && (
                                  <span>
                                    {getPlanningScoreBadge(event.planningScore)}
                                  </span>
                                )}
                                {/* Delete button - shown on hover */}
                                <button
                                  onClick={(e) => handleDeleteEvent(event, e)}
                                  className={`p-0.5 rounded hover:bg-destructive/20 transition-opacity ${
                                    isHovered ? 'opacity-100' : 'opacity-0'
                                  }`}
                                  disabled={isDeleting}
                                  title="Delete event"
                                >
                                  {isDeleting ? (
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                  ) : (
                                    <X className="h-3 w-3 text-destructive" />
                                  )}
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="p-3 border-t bg-muted/30">
        <div className="flex flex-wrap gap-4 justify-center text-xs">
          {Object.entries(TIER_COLORS).map(([tier, color]) => (
            <div key={tier} className="flex items-center gap-1">
              <div className={`w-3 h-3 rounded ${color}`}></div>
              <span className="capitalize">{tier}</span>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}
