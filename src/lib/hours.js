const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function dayName(dow) {
  return DAYS[dow];
}

// Total minutes since midnight for a "H:MM AM/PM" string, or null if unparseable.
export function parseTimeToMinutes(s) {
  const m = String(s).match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (!m) return null;
  let hh = parseInt(m[1], 10);
  const mm = parseInt(m[2], 10);
  const ampm = m[3].toUpperCase();
  if (ampm === 'PM' && hh !== 12) hh += 12;
  if (ampm === 'AM' && hh === 12) hh = 0;
  return hh * 60 + mm;
}

// Whole-hour accessor (kept for schema formatting of whole-hour data).
export function parseHourTo24(s) {
  const mins = parseTimeToMinutes(s);
  return mins === null ? 0 : Math.floor(mins / 60);
}

export function isOpenAt(date, hours) {
  const row = hours.find((h) => h.dow === date.getDay());
  if (!row) return false;
  const [openPart, closePart] = row.hrs.split(' – ');
  const open = parseTimeToMinutes(openPart);
  const close = parseTimeToMinutes(closePart);
  if (open === null || close === null) return false;
  const now = date.getHours() * 60 + date.getMinutes();
  return now >= open && now < close;
}

export function isOpenNow(hours) {
  return isOpenAt(new Date(), hours);
}
