# InfoLog Mobile — Secure Field Search PWA

A mobile-first **Progressive Web App** for the InfoLog platform. Field officers
log in securely, start a **File Session**, and run **Vehicle / Property / Company**
searches — every action written to an audit trail. Built with **Next.js
(full-stack) + MongoDB**.

> This is a self-contained implementation: it ships its own APIs and a seeded
> MongoDB so every screen works end-to-end today. In production the search
> routes would proxy the existing InfoLog REST APIs instead of the local DB.

## Stack

- **Next.js 16 (App Router)** — UI + Route Handlers (the "backend")
- **MongoDB + Mongoose** — users, sessions, search records, audit log
- **jose** — JWT session cookies (HTTP-only), session timeout
- **otplib + qrcode** — authenticator-app MFA (TOTP)
- **@simplewebauthn** — biometric unlock (Face ID / fingerprint / passkey)
- **bcryptjs** — password hashing
- **Tailwind CSS v4** — mobile-first, dark UI
- Service worker + web manifest — installable PWA

## Getting started

```bash
# 1. MongoDB must be running locally (mongodb://127.0.0.1:27017)
# 2. Install deps (already done if you scaffolded here)
npm install

# 3. Seed demo users + search data
npm run seed

# 4. Run
npm run dev        # http://localhost:3000
```

### Demo accounts (password: `Password123!`)

| User         | Role       | Can search | Sees audit of |
| ------------ | ---------- | ---------- | ------------- |
| `officer`    | officer    | all 3      | self          |
| `supervisor` | supervisor | all 3      | everyone      |
| `admin`      | admin      | all 3      | everyone      |

On first login you'll be asked to **set up an authenticator** (scan the QR with
Google Authenticator / Authy), then enter the 6-digit code. After that you can
optionally **enable biometrics** from the dashboard for faster sign-in.

## How it maps to the requirements

| Requirement                          | Where                                                                 |
| ------------------------------------ | --------------------------------------------------------------------- |
| Responsive PWA (phones/tablets)      | `manifest.webmanifest`, `public/sw.js`, mobile-first Tailwind         |
| Secure login (existing auth)         | `POST /api/auth/login` — bcrypt + JWT session cookie                  |
| Authenticator (TOTP) validation      | `POST /api/auth/mfa/setup` + `/mfa/verify` (`src/lib/totp.ts`)        |
| Optional biometric unlock            | `/api/auth/webauthn/*` (`src/lib/webauthn.ts`, `@simplewebauthn`)     |
| Start / continue File Sessions       | `/api/sessions`, `/api/sessions/[id]`, `src/app/session/[id]`         |
| 3 searches (Vehicle/Property/Company)| `POST /api/search/[type]` (`src/lib/search.ts`)                       |
| Consume APIs only, no new UI DB      | Mongoose collections stand in for InfoLog APIs; swap in `src/lib/search.ts` |
| Every search updates the audit trail | `writeAudit()` in every search / access route (`src/lib/audit.ts`)    |
| Role-based permissions               | `hasPermission()` + `requireSession(perm)` (`src/lib/auth.ts`, `api.ts`) |
| Search history within a session      | `GET /api/history?sessionId=` (derived from the audit trail)          |
| Session timeout                      | JWT `exp` = `SESSION_TIMEOUT_MINUTES`; auto-logout in `AppShell`      |
| Audit fields (user/time/device/IP…)  | `AuditLog` model + `requestMeta()`                                    |
| No local sensitive storage           | SW never caches `/api`; only non-sensitive session metadata cached    |
| 48h offline file sessions            | `src/lib/sessionCache.ts` (48h TTL) + `/offline` page                 |
| Add to Home Screen                   | `src/components/InstallPrompt.tsx`                                     |

## Security notes

- Session token is an HTTP-only, SameSite=Lax cookie; `Secure` in production.
- MFA is enforced: password alone never yields a full session (a short-lived
  pre-auth token gates the authenticator step).
- The service worker **never** caches API responses or PII.
- WebAuthn uses `userVerification: "required"` and replay-protected counters.

## Project layout

```
src/
  app/
    api/            # Route Handlers (the backend)
      auth/         #   login, mfa (TOTP), webauthn (biometric), me, logout
      sessions/     #   file sessions
      search/[type] #   vehicle | property | company (+ audit)
      history/      #   per-session search history
      audit/        #   audit trail (RBAC-scoped)
    login/          # multi-step login (credentials -> MFA -> biometric)
    dashboard/      # sessions list + create + install/biometric prompts
    session/[id]/   # search screen: tabs, results, session history
    history/        # audit trail viewer
    offline/        # offline fallback (cached sessions)
  lib/              # db, auth, totp, webauthn, search, audit, client
  components/       # UI kit, AppShell, prompts, results renderer
scripts/seed.ts     # demo data
```

## Configuration (`.env.local`)

| Var                        | Purpose                                    |
| -------------------------- | ------------------------------------------ |
| `MONGODB_URI`              | MongoDB connection string                  |
| `JWT_SECRET`               | Signs session tokens (**change in prod**)  |
| `SESSION_TIMEOUT_MINUTES`  | Inactivity/session lifetime (default 15)   |
| `NEXT_PUBLIC_RP_ID`        | WebAuthn RP id (`localhost` in dev)        |
| `NEXT_PUBLIC_ORIGIN`       | WebAuthn expected origin                   |
| `TOTP_ISSUER`              | Label shown in authenticator apps          |

## Notes

- **Biometrics require HTTPS or `localhost`.** They also need a real/virtual
  authenticator, so test them in a browser (Chrome DevTools has a virtual
  authenticator under *Application → WebAuthn*), not via curl.
- If port 3000 is busy, Next falls back to another port. WebAuthn accepts the
  live `localhost` origin automatically, but for a stable URL free port 3000.

## Future (out of MVP scope)

Native apps, GPS tagging, richer offline search, additional search types,
report redesign — as listed in the project requirements.
