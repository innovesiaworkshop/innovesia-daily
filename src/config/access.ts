// Who's allowed to hold a session. The PRIMARY gate is the Google OAuth consent screen,
// which is kept in "Testing" mode with explicit test users — so only listed Google accounts
// can complete sign-in at all. This client-side allowlist is a second, in-app check that
// signs out anyone who slips through (e.g. a future config change) and isn't on the list.
//
// NOTE: this is a UX gate, not a security boundary — RLS still grants every authenticated
// user access. If the consent screen is ever PUBLISHED (out of Testing mode), add a
// Supabase "Before-User-Created" auth hook to reject non-allowed emails at signup server-side.

export const ALLOWED_DOMAIN = '@innovesia.co.id'

// Explicit external exceptions (outside the company domain) that are still allowed in.
export const EMAIL_ALLOWLIST = ['akrom4412@gmail.com', 'aileenppermana@gmail.com']

// True if the email is on the company domain or in the explicit allowlist.
export function isAllowedEmail(email?: string | null): boolean {
  const e = email?.toLowerCase() ?? ''
  return e.endsWith(ALLOWED_DOMAIN) || EMAIL_ALLOWLIST.includes(e)
}
