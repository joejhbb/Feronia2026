/**
 * Utility functions for parsing time strings and sorting tasks & appointments
 * chronologically from earliest to latest.
 */

/**
 * Converts a time string (e.g., '06:00 AM', '8:30 AM', '11:00 AM', '02:30 PM', '14:00', 'URGENT', 'End of Day')
 * into minutes from midnight (0 to 1439) for precise chronological sorting.
 */
export function parseTimeToMinutes(timeStr?: string): number {
  if (!timeStr) return 9999;
  const str = String(timeStr).trim().toUpperCase();

  // High priority / Urgent indicators go to the very top
  if (
    str === 'URGENT' ||
    str.includes('EMERGENCY') ||
    str.includes('IMMEDIATE') ||
    str === 'NOW'
  ) {
    return -1;
  }

  // End of day / Night tasks go at the end
  if (
    str.includes('END OF DAY') ||
    str.includes('EOD') ||
    str.includes('NIGHT') ||
    str.includes('CLOSING')
  ) {
    return 1430; // 11:50 PM
  }

  // Check 12-hour or 24-hour format with hours:minutes and optional AM/PM
  // Examples: "08:30 AM", "09:00 PM", "8:15am", "14:30", "6:00"
  const timeMatch = str.match(/(\d{1,2}):(\d{2})(?:\s*(AM|PM))?/i);
  if (timeMatch) {
    let hours = parseInt(timeMatch[1], 10);
    const minutes = parseInt(timeMatch[2], 10);
    const period = timeMatch[3]?.toUpperCase();

    if (period === 'PM' && hours < 12) {
      hours += 12;
    } else if (period === 'AM' && hours === 12) {
      hours = 0;
    }
    return hours * 60 + minutes;
  }

  // Check simple hour with AM/PM (e.g. "8 AM", "2 PM", "11am")
  const simpleMatch = str.match(/(\d{1,2})\s*(AM|PM)/i);
  if (simpleMatch) {
    let hours = parseInt(simpleMatch[1], 10);
    const period = simpleMatch[2].toUpperCase();
    if (period === 'PM' && hours < 12) {
      hours += 12;
    } else if (period === 'AM' && hours === 12) {
      hours = 0;
    }
    return hours * 60;
  }

  return 9999;
}

/**
 * Sorts tasks chronologically:
 * 1. By Date (earliest date first) if both have dates
 * 2. By Time (earliest time first: e.g. 06:00 AM -> 08:30 AM -> 09:00 AM -> 02:00 PM)
 * 3. Urgent tasks are always prioritized at the top
 */
export function sortTasksByTime<T extends Record<string, any>>(tasks: T[]): T[] {
  return [...tasks].sort((a, b) => {
    // If both have different dates, sort by date first
    if (a.date && b.date && a.date !== b.date) {
      return String(a.date).localeCompare(String(b.date));
    }

    const timeA = parseTimeToMinutes(a.time || a.dueTime);
    const timeB = parseTimeToMinutes(b.time || b.dueTime);

    if (timeA !== timeB) {
      return timeA - timeB;
    }

    return 0;
  });
}

/**
 * Sorts keeper tasks by priority and urgency:
 * 1. High/Emergency/Critical Priority & Overdue tasks first (Action required immediately)
 * 2. Pending tasks (Sorted by earliest due time, priority routines first)
 * 3. Completed tasks last
 */
export function sortTasksByPriorityAndDue<T extends Record<string, any>>(tasks: T[], currentSystemDate?: string): T[] {
  return [...tasks].sort((a, b) => {
    // 1. Completed tasks always go to the bottom
    const isCompletedA = a.status === 'Completed';
    const isCompletedB = b.status === 'Completed';
    if (isCompletedA !== isCompletedB) {
      return isCompletedA ? 1 : -1;
    }

    // Helper to evaluate priority level (lower number = higher priority)
    const getPriorityWeight = (t: Record<string, any>) => {
      const p = (t.priority || '').toString().toLowerCase();
      const title = (t.title || '').toString().toLowerCase();
      const details = (t.details || '').toString().toLowerCase();

      const isOverdue = t.status === 'Overdue' || (t.date && currentSystemDate && t.date < currentSystemDate);
      if (isOverdue) return 0; // Overdue tasks MUST come first so keeper addresses them immediately

      if (p === 'emergency' || p === 'critical' || title.includes('emergency') || details.includes('emergency')) return 1;
      if (p === 'urgent' || p === 'high' || title.includes('urgent') || details.includes('urgent') || title.includes('deworm') || title.includes('treatment') || details.includes('prescription')) return 2;

      if (p === 'medium' || title.includes('medication') || title.includes('climate') || details.includes('medication')) return 3;
      return 4; // Default pending routine
    };

    const priorityA = getPriorityWeight(a);
    const priorityB = getPriorityWeight(b);

    if (priorityA !== priorityB) {
      return priorityA - priorityB;
    }

    // Earliest date first
    if (a.date && b.date && a.date !== b.date) {
      return String(a.date).localeCompare(String(b.date));
    }

    // Earliest due time first (e.g. 07:00 AM before 08:00 AM before 09:00 AM)
    const timeA = parseTimeToMinutes(a.time || a.dueTime);
    const timeB = parseTimeToMinutes(b.time || b.dueTime);

    if (timeA !== timeB) {
      return timeA - timeB;
    }

    return 0;
  });
}

/**
 * Sorts appointments chronologically:
 * 1. By Date (earliest first)
 * 2. By Time (earliest time first)
 */
export function sortAppointmentsByTime<T extends Record<string, any>>(appointments: T[]): T[] {
  return [...appointments].sort((a, b) => {
    if (a.date && b.date && a.date !== b.date) {
      return String(a.date).localeCompare(String(b.date));
    }
    const timeA = parseTimeToMinutes(a.time);
    const timeB = parseTimeToMinutes(b.time);
    return timeA - timeB;
  });
}

/**
 * Formats a YYYY-MM-DD date string into a structured object with formatted date and full day of week.
 * Example: '2026-09-19' -> { dateFormatted: 'Sep 19, 2026', dayOfWeek: 'Saturday' }
 */
export function getFormattedDateWithDay(dateStr?: string): { dateFormatted: string; dayOfWeek: string } {
  if (!dateStr) return { dateFormatted: 'Sep 19, 2026', dayOfWeek: 'Saturday' };
  try {
    const clean = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
    const parts = clean.split('-').map(Number);
    if (parts.length === 3 && parts[0] && parts[1] && parts[2]) {
      const d = new Date(parts[0], parts[1] - 1, parts[2]);
      const dateFormatted = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      const dayOfWeek = d.toLocaleDateString('en-US', { weekday: 'long' });
      return { dateFormatted, dayOfWeek };
    }
  } catch {
    // fallback
  }
  return { dateFormatted: dateStr, dayOfWeek: 'Saturday' };
}

/**
 * Returns the effective active system date (YYYY-MM-DD) from localStorage,
 * falling back to the current local calendar date.
 */
export function getEffectiveSystemDate(): string {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const realToday = `${yyyy}-${mm}-${dd}`;

  try {
    const saved = localStorage.getItem('feronia_system_date');
    if (saved && /^\d{4}-\d{2}-\d{2}$/.test(saved)) {
      if (saved < realToday) {
        localStorage.setItem('feronia_system_date', realToday);
        return realToday;
      }
      return saved;
    }
  } catch {}
  localStorage.setItem('feronia_system_date', realToday);
  return realToday;
}

export interface PreciseAgeResult {
  years: number;
  months: number;
  days: number;
  totalMonths: number;
  totalDays: number;
  isFuture: boolean;
  text: string;
  shortText: string;
  stage: 'Hatchling / Baby' | 'Juvenile / Sub-Adult' | 'Adult' | 'N/A';
}

/**
 * Calculates calendar-exact age based on date of birth and reference target date (e.g. facility system date).
 * Perfectly handles month boundaries, varying days per month, and leap years.
 */
export function calculatePreciseAge(birthDateStr?: string, refDateInput?: string | Date): PreciseAgeResult | null {
  if (!birthDateStr) return null;
  const cleanBirth = birthDateStr.includes('T') ? birthDateStr.split('T')[0] : birthDateStr;
  const bParts = cleanBirth.split('-').map(Number);
  if (bParts.length !== 3 || isNaN(bParts[0]) || isNaN(bParts[1]) || isNaN(bParts[2])) return null;

  const [by, bm, bd] = bParts;
  const birthObj = new Date(by, bm - 1, bd);
  if (isNaN(birthObj.getTime())) return null;

  let refDate = new Date();
  if (refDateInput) {
    if (typeof refDateInput === 'string') {
      const cleanRef = refDateInput.includes('T') ? refDateInput.split('T')[0] : refDateInput;
      const rParts = cleanRef.split('-').map(Number);
      if (rParts.length === 3 && !isNaN(rParts[0]) && !isNaN(rParts[1]) && !isNaN(rParts[2])) {
        refDate = new Date(rParts[0], rParts[1] - 1, rParts[2]);
      } else {
        const parsed = new Date(refDateInput);
        if (!isNaN(parsed.getTime())) refDate = parsed;
      }
    } else if (refDateInput instanceof Date) {
      refDate = refDateInput;
    }
  }

  const ty = refDate.getFullYear();
  const tm = refDate.getMonth() + 1; // 1-12
  const td = refDate.getDate();

  const pureRef = new Date(ty, tm - 1, td);
  const diffMs = pureRef.getTime() - birthObj.getTime();
  const totalDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMs < 0 || totalDays < 0) {
    return {
      years: 0,
      months: 0,
      days: 0,
      totalMonths: 0,
      totalDays: 0,
      isFuture: true,
      text: 'Future Date (Not yet born)',
      shortText: 'Future Date',
      stage: 'N/A'
    };
  }

  let years = ty - by;
  let months = tm - bm;
  let days = td - bd;

  if (days < 0) {
    months--;
    // Days in previous month of target/ref date
    const prevMonthDays = new Date(ty, tm - 1, 0).getDate();
    days += prevMonthDays;
  }

  if (months < 0) {
    years--;
    months += 12;
  }

  const totalMonths = years * 12 + months;

  let text = '';
  let shortText = '';

  if (years === 0 && months === 0) {
    if (days === 0) {
      text = 'Newborn (0 days)';
      shortText = '0 days';
    } else if (days < 7) {
      text = `${days} day${days > 1 ? 's' : ''} old`;
      shortText = `${days}d old`;
    } else {
      const weeks = Math.floor(days / 7);
      const remDays = days % 7;
      text = `${weeks} wk${weeks > 1 ? 's' : ''}${remDays > 0 ? `, ${remDays} d` : ''} old`;
      shortText = `${weeks}w${remDays > 0 ? ` ${remDays}d` : ''}`;
    }
  } else if (years === 0) {
    if (days === 0) {
      text = `${months} month${months > 1 ? 's' : ''} old`;
      shortText = `${months} mos`;
    } else {
      text = `${months} mo${months > 1 ? 's' : ''}, ${days} d old`;
      shortText = `${months}m ${days}d`;
    }
  } else {
    if (months === 0 && days === 0) {
      text = `${years} year${years > 1 ? 's' : ''} old`;
      shortText = `${years} yr old`;
    } else if (months === 0) {
      text = `${years} yr${years > 1 ? 's' : ''}, ${days} d old`;
      shortText = `${years}y ${days}d`;
    } else {
      text = `${years} yr${years > 1 ? 's' : ''}, ${months} mo${months > 1 ? 's' : ''} old`;
      shortText = `${years}y ${months}m`;
    }
  }

  let stage: 'Hatchling / Baby' | 'Juvenile / Sub-Adult' | 'Adult' = 'Adult';
  if (totalMonths < 6) stage = 'Hatchling / Baby';
  else if (totalMonths < 18) stage = 'Juvenile / Sub-Adult';

  return {
    years,
    months,
    days,
    totalMonths,
    totalDays,
    isFuture: false,
    text,
    shortText,
    stage
  };
}


