// Convert a datetime-local value ("2026-11-25T18:00") to a UTC ISO string.
export const toUtcIso = (local: string): string => new Date(local).toISOString()
