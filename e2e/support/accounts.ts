// The fake local accounts from supabase/seed.sql (never in the cloud).

export const ACCOUNTS = {
  admin: { email: "local-admin@example.test", password: "local-admin-pass-123" },
  lecturer: { email: "lecturer@example.test", password: "local-lecturer-pass-123" },
  student: { email: "chidi.student@example.test", password: "local-student-pass-123" },
} as const;

export type Role = keyof typeof ACCOUNTS;

/** Saved sign-in state per role, written by auth.setup.ts. */
export function authFile(role: Role): string {
  return `e2e/.auth/${role}.json`;
}
