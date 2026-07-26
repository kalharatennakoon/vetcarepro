# Pet Owner Login + AI Assistant

Adds a separate pet-owner portal (email or phone as username, default
password, forced change on first login) with its own AI Assistant window,
scoped to the customer's own pets only. Fully independent from staff auth.

## Setup

1. **Run the migration** against your Postgres DB:
   `database/migrations/add_customer_auth.sql`
   This adds `password_hash`, `password_must_change`, `last_login` to
   `customers`, and backfills every existing customer with the default
   password below.

2. **Default password for all customers:** `VetCare@123`
   Defined once in `server/src/utils/authUtils.js` as `DEFAULT_CUSTOMER_PASSWORD`
   — change it there if you want a different default before running the
   migration or creating new customers.

3. Restart the server so the new routes/middleware load, and rebuild the client.

## How it connects

- `POST /api/customer-auth/login` — `{ identifier, password }`, identifier
  matches `customers.email` OR `customers.phone`.
- New customers created via `createCustomer()` automatically get the default
  password + `password_must_change = true` — no manual step needed for staff.
- `POST /api/ai/customer-chat` — pet-owner-scoped chat, `role: 'pet_owner'`
  and `customerId` are set server-side from the authenticated session, never
  trusted from the client.
- Customer sessions use a separate JWT shape (`type: 'customer'`) and a
  separate localStorage key (`customerToken`), so staff and pet-owner logins
  can never collide, even in the same browser.

## Flow

`Welcome.jsx` → "Sign In — Pet Owner" → `PetOwnerLogin.jsx` →
(if first login) `PetOwnerChangePassword.jsx` → `PetOwnerAIAssistant.jsx`

## Verified before delivery

- Real bcrypt hash/compare and JWT sign/verify round-tripped successfully
  (not just code review) - confirmed a staff token is rejected by the
  customer middleware and vice versa.
- All new/edited files pass a syntax check individually.
- Full `vite build` of the whole client succeeded (805 modules, 0 errors) -
  catches any broken imports across files, not just per-file syntax.
- ESLint clean except one finding also present on the existing
  `AuthContext.jsx` (an accepted pattern in this codebase, not a new issue).

## Not yet tested

No live Postgres instance was available in this environment, so the actual
SQL queries (though modeled directly on your existing, working
`customerModel.js` functions) have not been run against a real database.
Run the migration and try one login end-to-end before relying on this in
production.

## Out of scope (flagging, not building)

- A general "change password" settings page for pet owners (only the forced
  first-login flow exists) - existing pet owners can't set a new password
  outside first login.

- A fuller pet-owner portal (My Pets list, Appointments, Profile) - this
  delivery is scoped to what was asked: login + the AI Assistant window.
