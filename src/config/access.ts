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
export const EMAIL_ALLOWLIST = ['akrom4412@gmail.com', 'aileenppermana@gmail.com', 'johanessoe@gmail.com', 'farasidya@gmail.com']

// True if the email is on the company domain or in the explicit allowlist.
export function isAllowedEmail(email?: string | null): boolean {
  const e = email?.toLowerCase() ?? ''
  return e.endsWith(ALLOWED_DOMAIN) || EMAIL_ALLOWLIST.includes(e)
}

// ── Delegate ("PA") add-on ────────────────────────────────────────────────────
// Assistants may add agendas on behalf of the delegate target. Everyone else only
// ever adds for themselves (the "For:" toggle is hidden for non-assistants).
export const ASSISTANT_EMAILS = ['rafina@innovesia.co.id', 'admin@innovesia.co.id', 'farasidya@gmail.com']

export function isAssistant(email?: string | null): boolean {
  return ASSISTANT_EMAILS.includes((email ?? '').toLowerCase())
}

// The person an assistant can file agendas for. profiles has no email column and
// auth.users isn't client-readable, so the profile id is pinned here directly.
export const DELEGATE_TARGET = { id: 'dd1b3d95-c455-43ef-8f73-f1d4d0c5ae77', label: 'Pak Bagus' } // Bagus, bagus@innovesia.co.id
