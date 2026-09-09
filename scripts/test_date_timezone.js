import { parseISO, isPast, isToday, isTomorrow, isThisWeek, format, startOfDay } from 'date-fns';

console.log("==================================================");
console.log("PHASE 7: DATE & TIMEZONE ADVERSARIAL TEST");
console.log("==================================================");

const localNow = new Date();
console.log("Current System Date/Time:", localNow.toString());
console.log("System Timezone Offset (minutes):", localNow.getTimezoneOffset()); // -330 for IST

// Test task dates
const testDates = [
  '2026-09-08', // Yesterday or today depending on timezone
  '2026-09-09', // Today in IST
  '2026-09-10', // Tomorrow in IST
  '2026-09-15', // Next week
  '2026-09-08T18:29:36.000Z',
  '2026-09-08T23:59:59.000Z',
  '2026-09-09T00:00:00.000Z',
  '2026-09-09T00:01:00.000Z',
];

testDates.forEach(d => {
  const parsed = parseISO(d);
  console.log(`\nInput: "${d}"`);
  console.log(` - parseISO Result:`, parsed.toString());
  console.log(` - isToday:`, isToday(parsed));
  console.log(` - isTomorrow:`, isTomorrow(parsed));
  console.log(` - isPast:`, isPast(parsed));
  console.log(` - isThisWeek:`, isThisWeek(parsed));
});
