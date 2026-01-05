export const LEAVE_KEYWORDS = {
  vacation: ["vacation", "holiday", "annual leave", "PTO", "paid time off"],
  outOfOffice: ["OOO", "out of office", "away", "traveling", "travel day"],
  leaveTypes: [
    "sick leave",
    "sick day",
    "personal day",
    "bereavement",
    "parental leave",
    "maternity",
    "paternity",
  ],
  blockedTime: [
    "time off",
    "day off",
    "off work",
    "not working",
    "unavailable",
  ],
};

export function detectLeave(
  title: string,
  description: string,
  isAllDay: boolean,
  eventType?: string
): { isLeave: boolean; method: string; confidence: "high" | "medium" | "low" } {
  const text = `${title} ${description}`.toLowerCase();

  if (eventType === "outOfOffice") {
    return { isLeave: true, method: "google_event_type", confidence: "high" };
  }

  const allKeywords = Object.values(LEAVE_KEYWORDS).flat();
  const hasKeyword = allKeywords.some((kw) => text.includes(kw.toLowerCase()));

  if (title.toLowerCase().includes("vacation") || title.toLowerCase().includes("pto")) {
    return { isLeave: true, method: "keyword_title", confidence: "high" };
  }

  if (hasKeyword) {
    return { isLeave: true, method: "keyword_match", confidence: "medium" };
  }

  return { isLeave: false, method: "none", confidence: "low" };
}
