import { all, run } from '../db/database.ts';

export const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] as const;

export interface AvailabilitySlot {
  weekday: number;
  startMinute: number;
  endMinute: number;
}

export function minutesFromClock(value: string): number {
  const match = /^(\d{1,2}):(\d{2})(?::\d{2})?$/.exec(value.trim());
  if (!match) throw new Error('Use 24-hour times like 09:00.');
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) throw new Error('Use 24-hour times like 09:00.');
  return hours * 60 + minutes;
}

export function clockFromMinutes(total: number): string {
  const hours = Math.floor(total / 60);
  const minutes = total % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

export function toAvailabilityDto(slot: AvailabilitySlot) {
  return {
    weekday: slot.weekday,
    weekdayLabel: WEEKDAYS[slot.weekday] ?? 'Unknown',
    start: clockFromMinutes(slot.startMinute),
    end: clockFromMinutes(slot.endMinute),
  };
}

/** Standard office hours used for seeded and newly onboarded professionals. */
export const DEFAULT_WEEKDAY_HOURS: AvailabilitySlot[] = [0, 1, 2, 3, 4].map((weekday) => ({
  weekday,
  startMinute: 9 * 60,
  endMinute: 17 * 60,
}));

export function listSlots(professionalId: number): AvailabilitySlot[] {
  return all<{ weekday: number; start_minute: number; end_minute: number }>(
    `SELECT weekday, start_minute, end_minute
     FROM availability_slots WHERE professional_id = ? ORDER BY weekday`,
    professionalId,
  ).map((row) => ({
    weekday: row.weekday,
    startMinute: row.start_minute,
    endMinute: row.end_minute,
  }));
}

export function replaceSlots(professionalId: number, slots: AvailabilitySlot[]): void {
  run('DELETE FROM availability_slots WHERE professional_id = ?', professionalId);
  for (const slot of slots) {
    run(
      `INSERT INTO availability_slots (professional_id, weekday, start_minute, end_minute)
       VALUES (?, ?, ?, ?)`,
      professionalId,
      slot.weekday,
      slot.startMinute,
      slot.endMinute,
    );
  }
}

export function seedDefaultAvailability(professionalId: number, extra: AvailabilitySlot[] = []): void {
  replaceSlots(professionalId, [...DEFAULT_WEEKDAY_HOURS, ...extra]);
}

export function parseSlotsInput(
  input: Array<{ weekday: number; start: string; end: string }>,
): AvailabilitySlot[] {
  const seen = new Set<number>();
  const slots: AvailabilitySlot[] = [];
  for (const item of input) {
    if (!Number.isInteger(item.weekday) || item.weekday < 0 || item.weekday > 6) {
      throw new Error('Weekday must be 0 (Monday) through 6 (Sunday).');
    }
    if (seen.has(item.weekday)) throw new Error('Each weekday can only have one window.');
    seen.add(item.weekday);
    const startMinute = minutesFromClock(item.start);
    const endMinute = minutesFromClock(item.end);
    if (endMinute <= startMinute) throw new Error('End time must be after start time.');
    slots.push({ weekday: item.weekday, startMinute, endMinute });
  }
  return slots;
}

export function availabilityDto(professionalId: number) {
  return listSlots(professionalId).map(toAvailabilityDto);
}

/**
 * Parse a datetime-local / ISO wall-clock string without applying a timezone.
 * Weekday uses the same 0 = Monday … 6 = Sunday convention as `availability_slots`.
 */
export function parseWallClock(value: string): { weekday: number; minute: number } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/.exec(value.trim());
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);
  if (month < 1 || month > 12 || day < 1 || day > 31 || hour > 23 || minute > 59) return null;
  const utc = new Date(Date.UTC(year, month - 1, day));
  if (utc.getUTCFullYear() !== year || utc.getUTCMonth() !== month - 1 || utc.getUTCDate() !== day) {
    return null;
  }
  const jsDay = utc.getUTCDay();
  const weekday = jsDay === 0 ? 6 : jsDay - 1;
  return { weekday, minute: hour * 60 + minute };
}

/** True when the professional has no hours, or the requested start falls inside a slot. */
export function fitsAvailability(slots: AvailabilitySlot[], scheduledFor: string): boolean {
  if (slots.length === 0) return true;
  const parsed = parseWallClock(scheduledFor);
  if (!parsed) return true;
  const slot = slots.find((item) => item.weekday === parsed.weekday);
  if (!slot) return false;
  return parsed.minute >= slot.startMinute && parsed.minute < slot.endMinute;
}

export function professionalFitsAvailability(professionalId: number, scheduledFor: string): boolean {
  return fitsAvailability(listSlots(professionalId), scheduledFor);
}
