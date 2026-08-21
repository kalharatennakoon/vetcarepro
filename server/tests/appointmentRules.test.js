import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  isClinicOpenDay,
  isWithinClinicHours,
  generateTimeSlots,
  hoursUntil,
  meetsLeadTime,
  MIN_LEAD_HOURS,
  MAX_CONCURRENT_APPOINTMENTS,
} from '../src/utils/appointmentRules.js';

// hoursUntil/meetsLeadTime parse date+time as LOCAL time (`new Date(...)`
// with no timezone suffix), so test fixtures must be built from local
// components too - Date#toISOString() would give UTC values and silently
// skew the test by the machine's UTC offset.
const localDateTimeParts = (date) => ({
  date: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`,
  time: `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`,
});

describe('isClinicOpenDay', () => {
  test('Monday-Saturday are open', () => {
    // 2026-08-17 is a Monday, 2026-08-22 is a Saturday
    assert.equal(isClinicOpenDay('2026-08-17'), true);
    assert.equal(isClinicOpenDay('2026-08-22'), true);
  });

  test('Sunday is closed', () => {
    // 2026-08-23 is a Sunday
    assert.equal(isClinicOpenDay('2026-08-23'), false);
  });

  test('accepts a Date object the same as a string (pg DATE column shape)', () => {
    assert.equal(isClinicOpenDay(new Date('2026-08-23T00:00:00.000Z')), false);
  });
});

describe('isWithinClinicHours', () => {
  test('a slot starting at opening time fits', () => {
    assert.equal(isWithinClinicHours('09:00'), true);
  });

  test('a 30-minute slot ending exactly at closing time fits', () => {
    assert.equal(isWithinClinicHours('18:00', 30), true);
  });

  test('a slot that would run past closing time does not fit', () => {
    assert.equal(isWithinClinicHours('18:15', 30), false);
  });

  test('a slot starting before opening time does not fit', () => {
    assert.equal(isWithinClinicHours('08:30'), false);
  });
});

describe('generateTimeSlots', () => {
  test('starts at clinic open and ends with the last slot that still fits before close', () => {
    const slots = generateTimeSlots();
    assert.equal(slots[0], '09:00');
    assert.equal(slots.at(-1), '18:00');
  });

  test('every slot is 30 minutes apart', () => {
    const slots = generateTimeSlots();
    assert.equal(slots.length, 19); // 09:00 to 18:00 inclusive, every 30 min
    assert.equal(slots[1], '09:30');
  });
});

describe('meetsLeadTime / hoursUntil', () => {
  test('a booking far enough in the future meets the lead-time rule', () => {
    const future = new Date(Date.now() + (MIN_LEAD_HOURS + 1) * 60 * 60 * 1000);
    const { date, time } = localDateTimeParts(future);
    assert.equal(meetsLeadTime(date, time), true);
  });

  test('a booking inside the lead-time window fails the rule', () => {
    const soon = new Date(Date.now() + (MIN_LEAD_HOURS - 1) * 60 * 60 * 1000);
    const { date, time } = localDateTimeParts(soon);
    assert.equal(meetsLeadTime(date, time), false);
  });

  test('hoursUntil is roughly correct for a known offset', () => {
    const target = new Date(Date.now() + 10 * 60 * 60 * 1000);
    const { date, time } = localDateTimeParts(target);
    const hours = hoursUntil(date, time);
    assert.ok(Math.abs(hours - 10) < 0.1, `expected ~10 hours, got ${hours}`);
  });
});

describe('constants', () => {
  test('rule constants match the documented policy', () => {
    assert.equal(MIN_LEAD_HOURS, 48);
    assert.equal(MAX_CONCURRENT_APPOINTMENTS, 3);
  });
});
