// Legacy in-memory activity helpers no longer used; audit logs are stored in DB.
// Kept as no-ops for compatibility with any remaining imports.
export function addActivity(_db: unknown, _input: unknown) { void _db; void _input;
  return null;
}
export function notify(_db: unknown, _input: unknown) { void _db; void _input;
  return null;
}
