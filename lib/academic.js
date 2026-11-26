export const SEMESTERS = ['1st Semester', '2nd Semester', 'Midyear'];

/** Philippine academic year typically starts in June. */
export function currentSchoolYear(date = new Date()) {
  const y = date.getFullYear();
  const m = date.getMonth() + 1;
  if (m >= 6) return `${y}-${y + 1}`;
  return `${y - 1}-${y}`;
}

export function currentSemester(date = new Date()) {
  const m = date.getMonth() + 1;
  if (m >= 6 && m <= 10) return '1st Semester';
  if (m === 11 || m === 12 || m <= 3) return '2nd Semester';
  return 'Midyear';
}

export function schoolYearOptions(span = 6) {
  const start = Number(currentSchoolYear().split('-')[0]);
  const opts = [];
  for (let i = -1; i < span; i += 1) {
    const a = start - i;
    opts.push(`${a}-${a + 1}`);
  }
  return opts;
}

export function normalizeSchoolYear(value) {
  const v = String(value || '').trim();
  return /^\d{4}-\d{4}$/.test(v) ? v : '';
}

export function normalizeSemester(value) {
  const v = String(value || '').trim();
  return SEMESTERS.includes(v) ? v : '';
}

export function formatPeriod(schoolYear, semester) {
  const sy = normalizeSchoolYear(schoolYear) || String(schoolYear || '').trim();
  const sem = normalizeSemester(semester) || String(semester || '').trim();
  if (!sy && !sem) return 'No SY / term set';
  if (sy && sem) return `SY ${sy} · ${sem}`;
  if (sy) return `SY ${sy}`;
  return sem;
}

export function periodSortKey(schoolYear, semester) {
  const sy = normalizeSchoolYear(schoolYear) || '0000-0000';
  const sem = normalizeSemester(semester);
  const semOrder = { '1st Semester': 1, '2nd Semester': 2, Midyear: 3 }[sem] || 9;
  return `${sy}|${semOrder}|${sem || 'zzz'}`;
}
