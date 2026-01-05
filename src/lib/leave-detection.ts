// Leave Period Detection for Founder Bleed
// Detects vacation, PTO, sick days, and other out-of-office events

export const LEAVE_KEYWORDS = {
  vacation: ['vacation', 'holiday', 'annual leave', 'PTO', 'paid time off'],
  outOfOffice: ['OOO', 'out of office', 'away', 'traveling', 'travel day'],
  leaveTypes: [
    'sick leave',
    'sick day',
    'personal day',
    'bereavement',
    'parental leave',
    'maternity',
    'paternity',
  ],
  blockedTime: [
    'time off',
    'day off',
    'off work',
    'not working',
    'unavailable',
  ],
};

export type LeaveConfidence = 'high' | 'medium' | 'low';

export interface LeaveDetectionResult {
  isLeave: boolean;
  method: string;
  confidence: LeaveConfidence;
}

export function detectLeave(
  title: string,
  description: string,
  isAllDay: boolean,
  eventType?: string // 'outOfOffice', 'focusTime', etc. from Google Calendar
): LeaveDetectionResult {
  const text = `${title} ${description}`.toLowerCase();
  const titleLower = title.toLowerCase();

  // Method A: Google Calendar event type (highest confidence)
  if (eventType === 'outOfOffice') {
    return { isLeave: true, method: 'google_event_type', confidence: 'high' };
  }

  // Method B: High confidence - specific keywords in title
  if (
    titleLower.includes('vacation') ||
    titleLower.includes('pto') ||
    titleLower.includes('paid time off') ||
    titleLower.includes('annual leave')
  ) {
    return { isLeave: true, method: 'keyword_title', confidence: 'high' };
  }

  // Method C: High confidence - OOO in title
  if (titleLower.includes('ooo') || titleLower.includes('out of office')) {
    return { isLeave: true, method: 'keyword_ooo', confidence: 'high' };
  }

  // Method D: High confidence - sick/medical leave
  if (
    titleLower.includes('sick') ||
    titleLower.includes('medical') ||
    titleLower.includes('doctor')
  ) {
    return { isLeave: true, method: 'keyword_medical', confidence: 'high' };
  }

  // Method E: Medium confidence - other leave keywords anywhere
  const allKeywords = Object.values(LEAVE_KEYWORDS).flat();
  const matchedKeyword = allKeywords.find((kw) =>
    text.includes(kw.toLowerCase())
  );

  if (matchedKeyword) {
    // Higher confidence if all-day event
    const confidence: LeaveConfidence = isAllDay ? 'medium' : 'medium';
    return { isLeave: true, method: 'keyword_match', confidence };
  }

  // Method F: Low confidence - pattern-based detection
  // All-day events with certain patterns might indicate leave
  if (isAllDay) {
    // Check for travel-related
    if (
      titleLower.includes('travel') ||
      titleLower.includes('flight') ||
      titleLower.includes('trip')
    ) {
      return { isLeave: true, method: 'pattern_travel', confidence: 'low' };
    }

    // Check for blocked/unavailable
    if (titleLower.includes('blocked') || titleLower.includes('unavailable')) {
      return { isLeave: true, method: 'pattern_blocked', confidence: 'low' };
    }
  }

  // Not detected as leave
  return { isLeave: false, method: 'none', confidence: 'low' };
}

// Detect consecutive leave days (for summary reporting)
export function detectConsecutiveLeaveDays(
  events: Array<{
    startAt: Date;
    endAt: Date;
    isLeave: boolean;
    isAllDay: boolean;
  }>
): number {
  const leaveDays = new Set<string>();

  for (const event of events) {
    if (!event.isLeave) continue;

    // For all-day events, count each day
    if (event.isAllDay) {
      const start = new Date(event.startAt);
      const end = new Date(event.endAt);

      // Iterate through each day of the event
      const current = new Date(start);
      while (current < end) {
        leaveDays.add(current.toISOString().split('T')[0]);
        current.setDate(current.getDate() + 1);
      }
    } else {
      // For timed leave events, count the day
      leaveDays.add(event.startAt.toISOString().split('T')[0]);
    }
  }

  return leaveDays.size;
}

// Calculate total leave hours excluded
export function calculateLeaveHours(
  events: Array<{
    durationMinutes: number;
    isLeave: boolean;
  }>
): number {
  return events
    .filter((e) => e.isLeave)
    .reduce((sum, e) => sum + e.durationMinutes / 60, 0);
}
