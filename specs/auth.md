# Auth Spec — Signup and Login

## Feature Name
Signup and Login — custom email/password authentication using a `users` table in Supabase (no Supabase Auth).

---

## Description

Users authenticate via email and password. Authentication is fully custom:
- No Supabase Auth is used — a plain `users` table stores credentials
- Passwords are hashed with `bcryptjs` at 10 rounds before storage
- On successful signup or login, `userId` and `userEmail` are stored in `localStorage`
- The user is immediately redirected to `/dashboard`
- Auth pages use light mode (`data-theme="light"`) while the rest of the app uses dark mode

---

## User Flow — Signup

1. User visits `/signup`
2. Page renders a centered card (max-width 400px, light mode)
3. User fills in: **Email** (type=email, required) and **Password** (type=password, required, minLength=8)
4. Client validates: both fields non-empty, password ≥ 8 characters
5. On submit: `POST /api/auth/signup` with `{ email, password }`
6. Server checks: if email already exists in `users` table → return 409
7. Server hashes password: `bcrypt.hash(password, 10)`
8. Server inserts row into `users` table → returns `{ userId: user.id }`
9. Client stores `localStorage.setItem('userId', data.userId)` and `localStorage.setItem('userEmail', email)`
10. Client redirects to `/dashboard`

---

## User Flow — Login

1. User visits `/login`
2. Page renders same card layout as signup
3. User fills in: **Email** and **Password**
4. Client validates: both fields non-empty
5. On submit: `POST /api/auth/login` with `{ email, password }`
6. Server queries `users` table by email — if no row → return 401
7. Server calls `bcrypt.compare(password, user.password_hash)` — if false → return 401
8. Server returns `{ userId: user.id }`
9. Client stores `userId` and `userEmail` in `localStorage`
10. Client redirects to `/dashboard`

---

## DB Schema

Table: `users`

| Column | Type | Constraints |
|---|---|---|
| `id` | UUID | PRIMARY KEY, DEFAULT `gen_random_uuid()` |
| `email` | TEXT | UNIQUE, NOT NULL |
| `password_hash` | TEXT | NOT NULL |
| `created_at` | TIMESTAMPTZ | DEFAULT `now()` |

---

## API Routes

### `POST /api/auth/signup`
**File:** `app/api/auth/signup/route.ts`

Request body:
```json
{ "email": "string", "password": "string" }
```

| Status | Condition | Response |
|---|---|---|
| 201 | Success | `{ "userId": "uuid" }` |
| 400 | Email or password missing / password < 8 chars | `{ "error": "Email and password are required." }` |
| 409 | Email already exists | `{ "error": "An account with this email already exists." }` |
| 500 | DB error | `{ "error": "Something went wrong." }` |

### `POST /api/auth/login`
**File:** `app/api/auth/login/route.ts`

Request body:
```json
{ "email": "string", "password": "string" }
```

| Status | Condition | Response |
|---|---|---|
| 200 | Success | `{ "userId": "uuid" }` |
| 400 | Missing fields | `{ "error": "Email and password are required." }` |
| 401 | User not found or wrong password | `{ "error": "Invalid email or password." }` |

Note: login errors are always generic — never reveal which field is wrong.

---

## Components

### `/signup` — Signup Page
**File:** `app/signup/page.tsx`
- Light mode wrapper: `<div data-theme="light">`
- Full-screen centered layout: `min-h-screen flex items-center justify-center`
- Card: `max-w-[400px] w-full border border-an-border rounded-md p-8`
- Logo at top (DocAI icon + name)
- Serif heading: "Create your account"
- Sub-heading: "Start analysing documents in seconds."
- Email and password inputs with labels
- Primary CTA button: "Create account" (full-width, coral)
- Link to `/login`: "Already have an account? Sign in"
- Error text shown below inputs on failure

### `/login` — Login Page
**File:** `app/login/page.tsx`
- Same layout as signup
- Heading: "Welcome back"
- Sub-heading: "Sign in to continue your work."
- CTA: "Sign in"
- Link to `/signup`: "Don't have an account? Sign up"

---

## Auth Guard

**File:** `app/dashboard/layout.tsx`

- Check runs on mount via `useEffect`
- Checks: `localStorage.getItem('userId')`
- If absent → immediately `router.push('/login')`
- All `/dashboard/*` routes are protected by this layout

---

## Important Implementation Notes

- **localStorage keys:** `userId` (UUID string) and `userEmail` (email string)
- **Column naming:** `password_hash` (snake_case, not `passwordHash`)
- **bcryptjs rounds:** 10 — never lower for production
- **No Supabase Auth:** do not import or use `supabase.auth.*` anywhere
- **Server-only hashing:** bcrypt runs only in API routes, never in client components
- **Redirect timing:** redirect happens client-side after storing localStorage values

---

## Design

- **Background:** `bg-an-bg-base` with `data-theme="light"` (light cream `#FAF9F7`)
- **Card:** `bg-an-bg-base border border-an-border rounded-md p-8`
- **Heading:** `font-serif text-display font-medium text-an-fg-base`
- **Labels:** `text-body-sm font-medium text-an-fg-base`
- **Inputs:** `h-9 px-3 bg-an-bg-subtle border border-an-border rounded` / focus: `border-an-border-strong`
- **Button:** `h-9 w-full bg-an-accent hover:bg-an-accent-hover text-white text-label rounded`
- **Error text:** `text-caption text-an-error` below the affected field
- **Link:** `text-an-accent hover:underline`

---

## Edge Cases

| Scenario | Validation type | Error shown | Location |
|---|---|---|---|
| Empty email field | Client-side (HTML required) | Browser native | Input |
| Empty password field | Client-side (HTML required) | Browser native | Input |
| Password < 8 chars | Server-side | "Password must be at least 8 characters." | Below form |
| Email already registered | Server-side | "An account with this email already exists." | Below form |
| Login with unregistered email | Server-side | "Invalid email or password." | Below form |
| Login with wrong password | Server-side | "Invalid email or password." | Below form |
| Network error | Client catch block | "Something went wrong. Please try again." | Below form |
| User revisits signup while logged in | — | Redirect to `/dashboard` (via landing page check) | — |
