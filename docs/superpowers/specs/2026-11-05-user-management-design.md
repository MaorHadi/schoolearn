# User management for SYSTEM_ADMIN — design

Date: 2026-11-05. Replaces the `/system-admin/users` stub. System settings stay deferred until the
forum defines what they hold.

## Goals

- A SYSTEM_ADMIN can find any account, see why it cannot log in, and fix it: lift a username
  lockout or an IP block, disable or re-enable the account, change its role.
- Nothing destructive: no account creation, deletion, or password reset in this version
  (a forced password reset is future work).
- The audit trail stays intact; clearing a lockout never deletes `AuthLog` rows.

## Model

- `User.lockoutClearedAt`: set when an admin lifts a lockout. Credential failures before it no
  longer count toward the username lockout (`countRecentFailures` takes it as a floor;
  `lockoutStateFor()` in `app/server/auth/auth-log.server.ts` is the single lockout rule, used by
  `login()` and the admin page).
- Clearing an IP block deletes the `IpBlock` row (`clearIpBlock()`), which also resets its
  escalation history; an explicit unblock is a fresh start.
- Index on `User.createdAt` for the newest-first list.

## Server

`app/server/users/user.server.ts` is the only writer of `role`, `isDisabled` and
`lockoutClearedAt`:

- `listUsers({ query, page })`: username or email `contains`, 50 per page, newest first, total.
- `getUserForAdmin(id, { since, until })`: the user, `lockoutStateFor()`, up to 100 auth log rows
  in the window, and active `IpBlock`s for the addresses seen in them.
- `setUserRole`, `setUserDisabled` (also deletes the user's sessions), `clearUserLockout`.
  Guards return `SELF` (own account) or `LAST_SYSTEM_ADMIN` (would leave no active one).

## Routes (`/system-admin`, every loader and action calls `requireRole` itself)

| Route                     | Purpose                                                                                                                                                     |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/system-admin/users`     | Search form (`?q=`), paged table (`?page=`), role/disabled pills, link to each user.                                                                        |
| `/system-admin/users/:id` | Account card (role select, disable/enable with confirm); security card (lockout state and clear, active IP blocks and unblock); login log for a date range. |

Forms are React Router `<Form>` + zod (`app/schemas/user-admin.ts`). Guard failures come back as
an inline `formError`; successes toast. The login log's range is a `DateRangeFields` GET form
parsed by `DateRangeQuerySchema` and resolved with `resolveDateRange()` (default: last 7 days).

## UI stack decision

This feature introduced Tailwind v4 + shadcn, adopted incrementally: new UI uses Tailwind classes
and `app/components/ui/`; existing pages keep their CSS until touched; preflight is not imported
and a `data-slot`-scoped reset covers shadcn elements; shadcn theme variables alias the tokens.
Forms keep React Router + zod (no react-hook-form). `DateRangeFields` is the first shared piece.

## Testing

Unit: `DateRangeQuerySchema`, `resolveDateRange`. DB: list/search/paging, guards, session purge,
lockout state before and after a clear, `clearIpBlock`, login after a clear. Routes: 403 below
SYSTEM_ADMIN (including the suggestions action, which previously relied on the layout loader),
list query parsing, each intent. UI (jsdom): `DateRangeFields` hidden values and picking a day.
