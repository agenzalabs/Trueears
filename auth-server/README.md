# Auth Server

Standalone Rust authentication server for Trueears using Google OAuth.

## Tech Stack

- Axum 0.7.x (web framework)
- SQLx (PostgreSQL async driver)
- JWT (jsonwebtoken crate)
- PostgreSQL 14+ (Neon serverless)

## Structure

```
src/
├── main.rs             # Axum server entry point
├── config.rs           # Environment configuration
├── db.rs               # Database connection pool
├── handlers/           # HTTP route handlers
│   ├── auth.rs         # OAuth & token endpoints
│   └── user.rs         # User management endpoints
├── middleware/         # Request middleware
│   └── auth_middleware.rs  # JWT validation
├── models/             # Database models
│   └── user.rs         # User entity
└── utils/              # Utilities
    └── jwt.rs          # Token generation/validation

migrations/             # SQLx database migrations
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/auth/google` | Exchange Google OAuth code for app tokens |
| `POST` | `/auth/refresh` | Refresh access token |
| `POST` | `/auth/logout` | Revoke tokens |
| `GET` | `/auth/user` | Get current user info |
| `GET` | `/user/profile` | Protected endpoint example |

## OAuth Flow

1. Tauri app opens browser with Google OAuth URL
2. User authenticates with Google
3. Google redirects to `http://localhost:8080/callback`
4. Tauri extracts authorization code
5. Tauri sends code to auth server (`POST /auth/google`)
6. Auth server exchanges code with Google for tokens
7. Auth server extracts user info from Google ID token
8. Auth server creates/updates user in database
9. Auth server generates app JWT tokens
10. Tauri stores tokens in OS keychain

## Database Schema

```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    google_id VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255),
    picture TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    last_login TIMESTAMP DEFAULT NOW()
);

CREATE TABLE refresh_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    revoked BOOLEAN DEFAULT false
);
```

## Configuration

Environment variables (`.env`):

```bash
# Database
DATABASE_URL=postgresql://user:pass@host/db?sslmode=require

# Google OAuth
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxxx

# JWT
JWT_SECRET=your-256-bit-secret
JWT_ACCESS_EXPIRY=900           # 15 minutes
JWT_REFRESH_EXPIRY=2592000      # 30 days

# Server
API_HOST=0.0.0.0
API_PORT=8080
OAUTH_REDIRECT_URI=http://localhost:8080/callback
```

## Development

```bash
# Set up environment
cp .env.example .env
# Edit .env with your credentials

# Run migrations
sqlx database create
sqlx migrate run

# Run server
cargo run

# Run tests
cargo test
```

## Deploying to Vercel (Rust Runtime)

This service now includes a Vercel Rust function entrypoint at `api/auth.rs`.

### Required project settings in Vercel

- Root Directory: `auth-server`
- Build Command: `cargo build --release`
- Start Command: *(leave empty for Vercel serverless functions)*

`vercel.json` rewrites all incoming paths to `/api/auth`, so routes like:

- `/auth/google`
- `/auth/refresh`
- `/auth/logout`
- `/auth/user`
- `/health`

continue working through a single serverless function.

### Environment variables

Set these in the Vercel dashboard:

- `DATABASE_URL`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `JWT_SECRET`
- `JWT_ACCESS_EXPIRY_SECONDS`
- `JWT_REFRESH_EXPIRY_SECONDS`
- `OAUTH_REDIRECT_URI`
- `API_URL` (public URL of this deployed service)

## Dependencies

| Crate | Purpose |
|-------|---------|
| `axum` | Web framework |
| `sqlx` | Database (PostgreSQL) |
| `jsonwebtoken` | JWT generation/validation |
| `reqwest` | HTTP client (Google API calls) |
| `dotenvy` | Environment variable loading |
| `tokio` | Async runtime |

## Security Considerations

- **HTTPS required** in production (TLS termination at load balancer OK)
- **Client secret** never exposed to Tauri app
- **JWT secrets** from environment variables only
- **Google ID token** validated server-side
- **Passwords not used** - Google handles authentication

## Related Documentation

- [Auth System Architecture](../docs/architecture/auth-system.md) - Detailed OAuth flow
- [Architecture Overview](../docs/architecture/overview.md)
- [Development Guide](../docs/guides/development.md)
