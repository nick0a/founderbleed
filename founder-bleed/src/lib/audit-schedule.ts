export type AuditFrequency = "weekly" | "monthly" | "annual";

type ScheduleInput = {
  frequency: AuditFrequency;
  dayOfWeek?: number;
  hour?: number;
  from?: Date;
};

type PeriodRange = {
  start: Date;
  end: Date;
};

function startOfDay(date: Date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function endOfDay(date: Date) {
  const copy = new Date(date);
  copy.setHours(23, 59, 59, 999);
  return copy;
}

export function calculateNextRunAt({
  frequency,
  dayOfWeek = 6,
  hour = 3,
  from = new Date(),
}: ScheduleInput) {
  const base = new Date(from);

  if (frequency === "weekly") {
    const next = startOfDay(base);
    next.setHours(hour, 0, 0, 0);
    const currentDay = next.getDay();
    let diff = dayOfWeek - currentDay;
    if (diff < 0 || (diff === 0 && next <= base)) {
      diff += 7;
    }
    next.setDate(next.getDate() + diff);
    return next;
  }

  if (frequency === "monthly") {
    const next = new Date(base);
    next.setDate(1);
    next.setHours(hour, 0, 0, 0);
    if (next <= base) {
      next.setMonth(next.getMonth() + 1);
    }
    return next;
  }

  const next = new Date(base);
  next.setMonth(0, 1);
  next.setHours(hour, 0, 0, 0);
  if (next <= base) {
    next.setFullYear(next.getFullYear() + 1);
  }
  return next;
}

export function calculateAuditPeriod(
  frequency: AuditFrequency,
  reference: Date = new Date()
): PeriodRange {
  if (frequency === "weekly") {
    const end = new Date(startOfDay(reference));
    end.setDate(end.getDate() - 1);
    const start = new Date(end);
    start.setDate(start.getDate() - 6);
    return { start: startOfDay(start), end: endOfDay(end) };
  }

  if (frequency === "monthly") {
    const end = new Date(startOfDay(reference));
    end.setDate(0);
    const start = new Date(end);
    start.setDate(1);
    return { start: startOfDay(start), end: endOfDay(end) };
  }

  const end = new Date(startOfDay(reference));
  end.setMonth(0, 0);
  const start = new Date(end);
  start.setMonth(0, 1);
  return { start: startOfDay(start), end: endOfDay(end) };
}
