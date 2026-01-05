// Leave Detection Keywords (case-insensitive)
export const LEAVE_KEYWORDS = {
  vacation: ['vacation', 'holiday', 'annual leave', 'PTO', 'paid time off'],
  outOfOffice: ['OOO', 'out of office', 'away', 'traveling', 'travel day'],
  leaveTypes: ['sick leave', 'sick day', 'personal day', 'bereavement', 'parental leave', 'maternity', 'paternity'],
  blockedTime: ['time off', 'day off', 'off work', 'not working', 'unavailable']
};

export interface LeaveDetectionResult {
  isLeave: boolean;
  method: string;
  confidence: 'high' | 'medium' | 'low';
}

export function detectLeave(
  title: string,
  description: string,
  isAllDay: boolean,
  eventType?: string // 'outOfOffice', 'focusTime', etc.
): LeaveDetectionResult {
  const text = `${title} ${description}`.toLowerCase();

  // Method A: Google Calendar event type
  if (eventType === 'outOfOffice') {
    return { isLeave: true, method: 'google_event_type', confidence: 'high' };
  }

  // Method B: Keyword matching
  const allKeywords = Object.values(LEAVE_KEYWORDS).flat();
  const hasKeyword = allKeywords.some(kw => text.includes(kw.toLowerCase()));

  // High confidence: keyword + title match for "vacation" or "PTO"
  if (title.toLowerCase().includes('vacation') || title.toLowerCase().includes('pto')) {
    return { isLeave: true, method: 'keyword_title', confidence: 'high' };
  }

  // Medium confidence: other keywords or all-day with keyword
  if (hasKeyword) {
    const confidence = isAllDay ? 'medium' : 'medium';
    return { isLeave: true, method: 'keyword_match', confidence };
  }

  // Low confidence: pattern-based (all-day multi-day without keywords)
  // This would require looking at surrounding events - handle in processing

  return { isLeave: false, method: 'none', confidence: 'low' };
}