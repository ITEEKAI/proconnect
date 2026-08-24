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
