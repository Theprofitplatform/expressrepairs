import { describe, it, expect } from 'vitest';
import { parseHourTo24, parseTimeToMinutes, dayName, isOpenAt } from '../src/lib/hours.js';
import { HOURS } from '../src/data/content.js';

describe('hours helpers', () => {
  it('parses 12h clock strings to 24h integers', () => {
    expect(parseHourTo24('9:00 AM')).toBe(9);
    expect(parseHourTo24('6:00 PM')).toBe(18);
    expect(parseHourTo24('12:00 PM')).toBe(12);
    expect(parseHourTo24('12:00 AM')).toBe(0);
  });

  it('maps day-of-week index to schema.org day name', () => {
    expect(dayName(1)).toBe('Monday');
    expect(dayName(0)).toBe('Sunday');
  });

  it('reports open during listed hours and closed outside them', () => {
    // Monday (dow 1) is 9:00 AM – 6:00 PM in HOURS
    const monday10am = new Date('2026-06-08T10:00:00');
    const monday8pm = new Date('2026-06-08T20:00:00');
    expect(isOpenAt(monday10am, HOURS)).toBe(true);
    expect(isOpenAt(monday8pm, HOURS)).toBe(false);
  });

  it('parseTimeToMinutes keeps minutes (handles half-hour boundaries)', () => {
    expect(parseTimeToMinutes('9:00 AM')).toBe(540);
    expect(parseTimeToMinutes('5:30 PM')).toBe(1050);
    expect(parseTimeToMinutes('12:00 AM')).toBe(0);
    expect(parseTimeToMinutes('nope')).toBe(null);
  });

  it('isOpenAt treats open time as open and close time as closed (boundaries)', () => {
    // Monday 9:00 AM – 6:00 PM
    expect(isOpenAt(new Date('2026-06-08T09:00:00'), HOURS)).toBe(true);
    expect(isOpenAt(new Date('2026-06-08T18:00:00'), HOURS)).toBe(false);
  });
});
