# Authentication System — As-Built

*Last verified against code: 2026-06-23*

> This document describes how authentication **actually works in the current code**.
> Source of truth: `backend/src/auth.rs`, `frontend/src/services/authService.ts`,
> `frontend/src/hooks/useAuth.ts`, and the `auth-server/` crate.

## Philosophy

Trueears uses **Google OAuth 2.0 (Authorization Code flow) for an installed/desktop app**.
The desktop app never holds Google's client *secret*. A small hosted Rust service
(`auth-server`) performs the secret-bearing token exchange with Google and issues the
app its **own** JWTs.

**Trust model:** trust Google for *authentication* (who the user is); the auth-server
handles *authorization* (issuing and validating our tokens).

The Google **client ID is not a secret** — it is embedded in the authorization URL and
baked into the desktop binary as a public default (`DEFAULT_GOOGLE_CLIENT_ID` in
`backend/src/auth.rs`) so shipped installers work with no local config. Only the client
**secret** is confidential, and it lives exclusively on the auth-server.

---

## Components

| Component | Tech (verified) | Role |
|-----------|-----------------|------|
| Desktop app (frontend) | React 19, TypeScript 5.9, Vite 8 | "Sign in with Google" UI, reads auth state via Tauri commands |
| Desktop app (backend) | Tauri 2.9, Rust (edition 2021, rust-version 1.77.2) | Runs the OAuth flow, local callback server, stores tokens |
| Auth server | Axum 0.8, sqlx 0.7 (Postgres), jsonwebtoken 9, reqwest 0.12 | Google code exchange, JWT minting/validation, user storage |
| Database | PostgreSQL (Neon) | `users` + `refresh_tokens` tables |

---

## Architecture

```
┌───────────────────────────────────────────────┐
│              TAURI DESKTOP APP                  │
│  ┌────────────┐         ┌───────────────────┐  │
│  │  Frontend  │ ←IPC→   │  Rust backend     │  │
│  │  (React)   │         │  (auth.rs)        │  │
│  └────────────┘         └───────────────────┘  │
│       │ opens browser           │ local server  │
│       │                         │ 127.0.0.1:8585│
└───────┼─────────────────────────┼──────────────┘
        ▼                         │ POST code
  ┌───────────┐                   ▼
  │  GOOGLE   │            ┌──────────────────┐
  │  OAuth    │ ──code──►  │   AUTH-SERVER    │
  └───────────┘            │   (Axum/Rust)    │
        ▲   exchange code  └────────┬─────────┘
        └──────────────────────────┤ JWTs back to app
                                    │ SQLx
                          ┌─────────▼─────────┐
                          │  PostgreSQL (Neon)│
                          │  users,           │
                          │  refresh_tokens   │
                          └───────────────────┘
```

---

## Sign-in flow (step by step)

1. User clicks "Sign in with Google". The frontend calls the Tauri command
   `start_google_login` (`authService.startGoogleLogin`).
2. `backend/src/auth.rs` starts a local HTTP server (`tiny_http`) on
   **`127.0.0.1:8585`** with a **5-minute timeout**, then opens the system browser
   (`tauri-plugin-opener`) to:
   ```
   https://accounts.google.com/o/oauth2/v2/auth
     ?client_id=<public client id>
     &redirect_uri=http://localhost:8585/callback
     &response_type=code
     &scope=openid email profile
     &access_type=offline
     &prompt=consent
   ```
3. The user authenticates with Google and approves the scopes.
4. Google redirects to `http://localhost:8585/callback?code=…`. The local server
   catches it, extracts `code`, and serves a branded "Authentication Complete" HTML
   page (inline in `auth.rs`).
5. The backend POSTs `{ "code": "…" }` to the auth-server at **`<API_URL>/auth/google`**.
   - `API_URL` default: **`https://trueears-1.onrender.com`** (override via `API_URL` env).
   - In **debug builds only**, it also retries `http://127.0.0.1:3001` and
     `http://localhost:3001` as fallbacks.
6. The auth-server (`auth-server/src/handlers/auth.rs::google_auth`):
   1. Exchanges the code with Google (`https://oauth2.googleapis.com/token`) using the
      confidential `client_secret` and `oauth_redirect_uri`.
   2. Decodes the Google **ID token** payload and reads `sub`, `email`, `name`, `picture`.
      Validates **issuer, audience, and expiry**. *(Note: the JWT signature is **not**
      cryptographically verified — see "Known gaps".)*
   3. If `name`/`picture` are missing, falls back to Google's userinfo endpoint
      (`https://openidconnect.googleapis.com/v1/userinfo`).
   4. Upserts the user into Postgres (`users`).
   5. Mints **our** JWTs: a short-lived access token and a refresh token.
   6. Stores a **SHA-256 hash** of the refresh token in `refresh_tokens`.
   7. Returns `{ access_token, refresh_token, expires_in, user }`.
7. The backend stores the tokens in a **file** (see "Token storage") and emits an
   `auth-success` Tauri event with the user info.
8. The frontend `useAuth` hook listens for `auth-success`, refreshes auth state, and
   passes the access token to `paymentService` for license/checkout calls.

---

## Token model

Two distinct sets of tokens:

- **Google's tokens** — used only *inside* the auth-server during code exchange. Never
  reach the desktop app.
- **Our tokens** — minted by the auth-server, sent to and stored by the desktop app:
  - **Access token** — JWT, default expiry **900 s (15 min)**. Sent as
    `Authorization: Bearer <token>` to the payment-service.
  - **Refresh token** — JWT, default expiry **2,592,000 s (30 days)**. Its hash is
    stored server-side so it can be revoked.

Expiries are configurable on the auth-server via `JWT_ACCESS_EXPIRY_SECONDS` /
`JWT_REFRESH_EXPIRY_SECONDS` (`auth-server/src/config.rs`).

---

## Token storage (desktop)

Tokens are stored as a **plaintext JSON file** named **`auth.json`** in the app data
directory (resolved via Tauri's `app_data_dir()`), holding `access_token`,
`refresh_token`, and `user`.

> **Note:** the `keyring` crate is listed in `backend/Cargo.toml`, but it is **not used**.
> `auth.rs` deliberately uses file storage (code comment: *"more reliable than keyring on
> Windows"*). On Windows there is also a one-time migration that moves a legacy
> `Trueears/auth.json` into the current `com.Trueears/` app-data folder.

`get_auth_state` reports `is_authenticated: true` when **both** stored user info and an
access token string are present. It does **not** check whether the access token has
expired.

---

## Tauri commands (frontend ↔ backend)

Defined in `backend/src/lib.rs`, called via `frontend/src/services/authService.ts`:

| Command | Purpose |
|---------|---------|
| `start_google_login` | Begin the OAuth flow (opens browser + local callback server) |
| `get_auth_state` | `{ is_authenticated, user }` from the stored file |
| `get_user_info` | Stored `UserInfo` or `null` |
| `get_access_token` | Stored access token or `null` |
| `logout` | Revoke refresh token server-side (best effort) + delete `auth.json` |

Frontend events: `auth-success` (payload = user) and `auth-error` (payload = message).

---

## Auth-server HTTP API

Routes are registered in `auth-server/src/lib.rs`:

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| POST | `/auth/google` | none | Exchange Google code → our JWTs |
| POST | `/auth/refresh` | refresh token | Rotate tokens (revokes old, issues new) |
| POST | `/auth/logout` | refresh token | Mark the refresh token revoked |
| GET | `/auth/user` | access token (Bearer) | Return current user |
| GET | `/health` | none | Liveness check (`"OK"`) |

CORS allows any origin for `GET/POST/OPTIONS` with `Content-Type` + `Authorization`
headers.

---

## Database schema

From `auth-server/migrations/001_create_users.sql`:

```sql
CREATE TABLE users (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    google_id   VARCHAR(255) UNIQUE NOT NULL,
    email       VARCHAR(255) UNIQUE NOT NULL,
    name        VARCHAR(255),
    picture     TEXT,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    last_login  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE refresh_tokens (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash  TEXT NOT NULL,          -- SHA-256 of the refresh token
    expires_at  TIMESTAMPTZ NOT NULL,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    revoked     BOOLEAN DEFAULT false
);
```

Indexes exist on `users.google_id`, `users.email`, `refresh_tokens.user_id`, and
`refresh_tokens.token_hash`.

---

## Configuration

### Auth-server (`auth-server/src/config.rs`)

| Variable | Default | Notes |
|----------|---------|-------|
| `DATABASE_URL` | *(required)* | Neon Postgres connection string |
| `GOOGLE_CLIENT_ID` | *(required)* | Must match the desktop client ID |
| `GOOGLE_CLIENT_SECRET` | *(required)* | **Secret — server only** |
| `OAUTH_REDIRECT_URI` | `http://localhost:8585/callback` | Must match the desktop redirect + Google console |
| `JWT_SECRET` | *(required)* | Must match the payment-service for cross-service tokens |
| `JWT_ACCESS_EXPIRY_SECONDS` | `900` | 15 minutes |
| `JWT_REFRESH_EXPIRY_SECONDS` | `2592000` | 30 days |
| `API_HOST` | `0.0.0.0` | |
| `PORT` / `API_PORT` | `3001` | `PORT` takes precedence |
| `RUST_ENV` | `development` | `production` toggles `is_production` |

Deployment configs are present for **Render** (`render.yaml`, `fly.toml`) and **Vercel**
(`vercel.json` + the `api/auth.rs` `auth-vercel` binary). The desktop default points at
the Render deployment.

### Desktop (`backend/src/auth.rs`)

| Variable | Default | Notes |
|----------|---------|-------|
| `GOOGLE_CLIENT_ID` | baked-in public default | env / compile-time override wins |
| `API_URL` | `https://trueears-1.onrender.com` | auth-server base URL |
| callback port | `8585` (hardcoded) | local OAuth callback server |

---

## Security considerations

- Client **secret** never ships in the desktop binary — only on the auth-server.
- Refresh tokens are stored server-side as **SHA-256 hashes**, not plaintext, and can be
  revoked (logout, rotation).
- Code exchange with Google is server-to-server over HTTPS.

### Known gaps (not yet implemented)

These are accurate as of the last verification date and are tracked as improvements:

1. **ID-token signature is not verified.** `decode_id_token` checks issuer, audience, and
   expiry but does not validate the signature against Google's public keys (JWKS). Risk
   is currently limited because the token is fetched server-to-server directly from
   Google, but it should be hardened.
2. **Token refresh is not wired up.** `refresh_tokens()` in `backend/src/auth.rs` exists
   but is `#[allow(dead_code)]` and is never called; the frontend never refreshes. When
   the 15-minute access token expires, payment-service calls return `401` until the user
   signs out and back in. The `/auth/refresh` endpoint itself is fully implemented.
3. **`get_auth_state` ignores token expiry**, so the app can report "authenticated" with
   an already-expired access token.
4. **Tokens are stored as plaintext JSON** (`auth.json`), not in the OS keychain.

---

## Related documentation

- [Architecture Overview](./overview.md)
- [Development Guide](../guides/development.md)
- [Deployment Guide](../guides/deployment.md)
