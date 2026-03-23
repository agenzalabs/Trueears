# Rust Google OAuth Authentication System - MVP Architecture
*Last Updated: December 2025*

## 🎯 Architecture Philosophy - MVP with Google Sign-In

**Goal**: Build a fast, secure authentication system for a Tauri desktop app using Google OAuth2.

**Why Google OAuth for MVP:**
- ✅ No password management needed
- ✅ Users trust Google security
- ✅ Faster implementation (no email verification, password reset, etc.)
- ✅ Better UX (one-click sign in)
- ✅ Google handles security compliance
- ✅ Free for most use cases

**Core Principle**: Trust Google for authentication, manage authorization yourself.

---

## 📐 System Architecture Overview - OAuth Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    TAURI DESKTOP APP                        │
│  ┌──────────────┐         ┌─────────────────────┐          │
│  │   Frontend   │ ←────→  │   Rust Backend      │          │
│  │  (HTML/JS)   │         │   (Tauri Commands)  │          │
│  └──────────────┘         └─────────────────────┘          │
│         │                           │                        │
│         │ Opens Browser             │                        │
│         │ for Google Login          │                        │
└─────────┼───────────────────────────┼────────────────────────┘
          │                           │
          ▼                           │
┌─────────────────────┐              │
│   GOOGLE OAUTH      │              │
│   Login Page        │              │
│ (User Authenticates)│              │
└─────────┬───────────┘              │
          │ Returns                   │
          │ Authorization Code        │
          ▼                           │
          └──────────────────────────►│
                                      │ Exchange code
                                      │ for tokens
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────┐
│                    RUST API SERVER                          │
│                    (Axum/Rocket)                            │
│  ┌──────────────────────────────────────────────┐          │
│  │  1. Receive auth code from Tauri             │          │
│  │  2. Exchange code for Google tokens          │          │
│  │  3. Get user info from Google                │          │
│  │  4. Create/update user in database           │          │
│  │  5. Generate OUR JWT tokens                  │          │
│  │  6. Return tokens to Tauri                   │          │
│  └──────────────────────────────────────────────┘          │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        │ SQLx Connection Pool
                        │
┌───────────────────────▼─────────────────────────────────────┐
│              NEON POSTGRESQL DATABASE                        │
│  ┌──────────────────────────────────────────────┐          │
│  │  users                                        │          │
│  │  - id, google_id, email, name, picture       │          │
│  │  - created_at, last_login                    │          │
│  │                                               │          │
│  │  sessions (or refresh_tokens)                │          │
│  │  - user_id, token, expires_at                │          │
│  └──────────────────────────────────────────────┘          │
└──────────────────────────────────────────────────────────────┘
```

---

## 🔐 OAuth2 Flow Explained (Step by Step)

### The Complete Google Sign-In Flow:

```
1. User clicks "Sign in with Google" in Tauri app
         ↓
2. Tauri opens system browser with Google OAuth URL
   URL includes: client_id, redirect_uri, scope
         ↓
3. User sees Google's login page (if not already logged in)
         ↓
4. User authenticates with Google and grants permissions
         ↓
5. Google redirects to: http://localhost:8080/callback?code=XXXXX
         ↓
6. Tauri app catches this redirect and extracts the code
         ↓
7. Tauri sends code to YOUR API server
         ↓
8. Your API server exchanges code for tokens with Google:
   - Sends: code + client_id + client_secret
   - Receives: access_token, id_token, refresh_token
         ↓
9. Your API decodes id_token to get user info:
   - google_id, email, name, picture
         ↓
10. Your API checks if user exists in database:
    - If new: create user record
    - If exists: update last_login
         ↓
11. Your API generates YOUR OWN JWT tokens:
    - access_token (for API calls)
    - refresh_token (to get new access tokens)
         ↓
12. Your API returns YOUR tokens to Tauri
         ↓
13. Tauri stores tokens in OS keychain
         ↓
14. Done! User is authenticated
```

---

## 🏗️ Simplified Component Breakdown

### 1. **Google Cloud Console Setup**

**What you need to create:**
- Google Cloud Project
- OAuth 2.0 Client ID
- Configure redirect URIs

**You'll get:**
- `CLIENT_ID` (public, goes in Tauri app)
- `CLIENT_SECRET` (private, goes in API server)

**Scopes needed:**
- `openid` - Basic authentication
- `email` - User's email address
- `profile` - User's name and picture

---

### 2. **Simplified Database Schema**

Much simpler than password auth!

```sql
-- Users table (simplified for OAuth)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    google_id VARCHAR(255) UNIQUE NOT NULL,  -- Google's user ID
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255),
    picture TEXT,                             -- Profile picture URL
    created_at TIMESTAMP DEFAULT NOW(),
    last_login TIMESTAMP DEFAULT NOW()
);

-- Sessions/Refresh tokens (same as before)
CREATE TABLE refresh_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    revoked BOOLEAN DEFAULT false
);

-- Indexes
CREATE INDEX idx_users_google_id ON users(google_id);
CREATE INDEX idx_users_email ON users(email);
```

**Notice what's GONE:**
- ❌ No `password_hash` field
- ❌ No `email_verified` field (Google handles this)
- ❌ No password reset logic needed
- ❌ No email verification needed

---

### 3. **Tauri Desktop App**

**Key Libraries**:
```toml
[dependencies]
tauri = "1.5"
serde = "1.0"
reqwest = "0.11"           # HTTP client
keyring = "2.0"            # OS keychain
tokio = "1"                # Async runtime
oauth2 = "4.4"             # OAuth2 helper
url = "2.5"                # URL parsing
```

**What Tauri Does:**
1. Opens browser with Google OAuth URL
2. Listens for redirect callback
3. Extracts authorization code
4. Sends code to your API
5. Stores tokens in OS keychain

---

### 4. **Rust API Server**

**Simplified Dependencies** (NO password hashing needed!):
```toml
[dependencies]
axum = "0.7"
sqlx = { version = "0.7", features = ["postgres", "uuid", "chrono"] }
tokio = "1"
serde = "1.0"
jsonwebtoken = "9"         # For YOUR JWT tokens
reqwest = "0.11"           # To call Google APIs
tower = "0.4"
tower-http = "0.5"
uuid = "1.6"
chrono = "0.4"
dotenv = "0.15"

# NO ARGON2 NEEDED! 🎉
```

**API Endpoints** (Much simpler!):
```
POST   /auth/google          → Exchange Google code for OUR tokens
POST   /auth/refresh         → Refresh access token
POST   /auth/logout          → Revoke tokens
GET    /auth/user            → Get current user info
GET    /user/profile         → Protected endpoint example
```

---

## 🔑 Key Concepts for OAuth

### 1. **Two Sets of Tokens**

**Google's Tokens** (used internally by your API):
- Google Access Token - to call Google APIs
- Google ID Token - contains user info (email, name, etc.)
- Google Refresh Token - to get new Google access tokens

**Your Tokens** (used by Tauri app):
- Your Access Token - for API authentication
- Your Refresh Token - to get new access tokens

**Why two sets?**
- Google's tokens: Prove user authenticated with Google
- Your tokens: Control access to YOUR API
- You don't want Tauri app calling Google directly

### 2. **ID Token vs Access Token**

**Google ID Token:**
- JWT containing user info
- Structure: `header.payload.signature`
- Payload includes: `sub` (google_id), `email`, `name`, `picture`
- You decode this to get user info

**Google Access Token:**
- Opaque string (not JWT)
- Used to call Google APIs
- You rarely need this for basic auth

### 3. **Redirect URI**

For desktop apps, you have two options:

**Option A: Localhost redirect** (Simpler, recommended for MVP)
```
http://localhost:8080/callback
```
Your Tauri app starts a temporary local server to catch the redirect.

**Option B: Custom URI scheme** (More polished)
```
myapp://callback
```
Requires OS registration but feels more native.

**Recommendation for MVP:** Use localhost (Option A)

---

## 🔄 Complete OAuth Flow Diagram

```
┌─────────┐
│  USER   │
└────┬────┘
     │ 1. Clicks "Sign in with Google"
     ▼
┌─────────────────┐
│  TAURI APP      │
│  Opens browser  │──────┐
└─────────────────┘      │
                         │ 2. Browser navigates to:
                         │    https://accounts.google.com/o/oauth2/v2/auth?
                         │    client_id=XXX
                         │    &redirect_uri=http://localhost:8080/callback
                         │    &response_type=code
                         │    &scope=openid email profile
                         ▼
                    ┌──────────┐
                    │  GOOGLE  │
                    │  LOGIN   │
                    └────┬─────┘
                         │ 3. User authenticates
                         │
                         │ 4. Google redirects to:
                         │    http://localhost:8080/callback?code=4/0AbCD...
                         ▼
                    ┌─────────────────┐
                    │  TAURI APP      │
                    │  (catches       │
                    │   redirect)     │
                    └────┬────────────┘
                         │ 5. Extracts code: "4/0AbCD..."
                         │
                         │ 6. POST /auth/google
                         │    {code: "4/0AbCD..."}
                         ▼
                    ┌─────────────────────┐
                    │  YOUR API SERVER    │
                    └────┬────────────────┘
                         │ 7. Exchange code with Google:
                         │    POST https://oauth2.googleapis.com/token
                         │    {
                         │      code: "4/0AbCD...",
                         │      client_id: "...",
                         │      client_secret: "...",
                         │      redirect_uri: "http://localhost:8080/callback",
                         │      grant_type: "authorization_code"
                         │    }
                         ▼
                    ┌──────────┐
                    │  GOOGLE  │
                    │  OAUTH   │
                    └────┬─────┘
                         │ 8. Returns:
                         │    {
                         │      access_token: "ya29.a0...",
                         │      id_token: "eyJhbG...",  ← Contains user info!
                         │      refresh_token: "1//0e...",
                         │      expires_in: 3600
                         │    }
                         ▼
                    ┌─────────────────────┐
                    │  YOUR API SERVER    │
                    └────┬────────────────┘
                         │ 9. Decode id_token (JWT):
                         │    {
                         │      sub: "108123456789",      ← Google ID
                         │      email: "user@gmail.com",
                         │      name: "John Doe",
                         │      picture: "https://..."
                         │    }
                         │
                         │ 10. Check database:
                         │     SELECT * FROM users WHERE google_id = "108..."
                         │
                         │ 11. If new user:
                         │     INSERT INTO users (google_id, email, name, picture)
                         │     If existing:
                         │     UPDATE users SET last_login = NOW()
                         │
                         │ 12. Generate YOUR JWT tokens:
                         │     access_token (15 min)
                         │     refresh_token (30 days)
                         │
                         │ 13. Store refresh token in DB
                         │
                         │ 14. Return YOUR tokens
                         ▼
                    ┌─────────────────┐
                    │  TAURI APP      │
                    └────┬────────────┘
                         │ 15. Store tokens in OS keychain
                         │
                         │ 16. Navigate to app dashboard
                         ▼
                    ┌─────────┐
                    │  USER   │
                    │ LOGGED  │
                    │   IN!   │
                    └─────────┘
```

---

## 🛠️ Tech Stack Summary - MVP

### Tauri Desktop App
```toml
tauri = "1.5"
oauth2 = "4.4"              # OAuth helpers
reqwest = "0.11"            # HTTP client
keyring = "2.0"             # Token storage
serde = "1.0"
tokio = "1"
```

### API Server
```toml
axum = "0.7"                # Web framework
sqlx = "0.7"                # Database (Postgres)
jsonwebtoken = "9"          # JWT for YOUR tokens
reqwest = "0.11"            # Call Google APIs
serde = "1.0"
tower-http = "0.5"          # Middleware (CORS)
tokio = "1"
```

### Database
- **Neon PostgreSQL** (serverless)
- Much simpler schema (no password fields!)

---

## 🎯 What's EASIER with OAuth

### You DON'T Need:
- ❌ Password hashing (Argon2)
- ❌ Password strength validation
- ❌ Password reset flow
- ❌ Email verification
- ❌ "Forgot password" feature
- ❌ Password security management
- ❌ GDPR password handling

### You ONLY Need:
- ✅ Google Cloud Console setup (5 minutes)
- ✅ OAuth flow implementation
- ✅ JWT token generation (for YOUR API)
- ✅ Basic user profile storage
- ✅ Session management

**Result:** 50% less code, 70% less security concerns!

---

## 🔐 Security Considerations

### What Google Handles:
- ✅ User authentication
- ✅ Password security
- ✅ Account recovery
- ✅ 2FA (if user enabled)
- ✅ Breach detection
- ✅ GDPR compliance (for auth)

### What You Handle:
- ✅ Validating Google's tokens
- ✅ Storing user data securely
- ✅ Managing YOUR JWT tokens
- ✅ Authorization (what users can do)
- ✅ Session management
- ✅ API rate limiting

### Critical Security Rules:

1. **NEVER expose client_secret** in Tauri app
   - Only in API server (server-side)
   - Use environment variables

2. **Validate Google's ID token**
   - Verify signature
   - Check issuer (accounts.google.com)
   - Check audience (your client_id)
   - Check expiration

3. **Use HTTPS** for API calls
   - Localhost OK for development
   - Production: must use HTTPS

4. **Store tokens in OS keychain**
   - Never in plain text files
   - Use `keyring` crate

5. **Implement token refresh**
   - Short-lived access tokens (15 min)
   - Longer refresh tokens (30 days)

---

## 📋 Environment Variables

### API Server (.env)
```bash
# Database
DATABASE_URL=postgresql://user:pass@ep-xxx.neon.tech/db?sslmode=require

# Google OAuth
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxxxxxxxxxxx

# JWT (for YOUR tokens)
JWT_SECRET=your-256-bit-secret
JWT_ACCESS_EXPIRY=900           # 15 minutes
JWT_REFRESH_EXPIRY=2592000      # 30 days

# Server
API_HOST=0.0.0.0
API_PORT=8080
API_URL=http://localhost:8080   # For development

# Redirect
OAUTH_REDIRECT_URI=http://localhost:8080/callback
```

### Tauri App (.env or config)
```bash
# Google OAuth (public - OK to include)
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com

# Your API
API_URL=http://localhost:8080   # Development
# API_URL=https://api.yourapp.com  # Production
```

---

## 🚀 Implementation Complexity Comparison

### Email/Password Auth:
```
Database Schema:      ████████░░ 80% complex
API Endpoints:        ████████░░ 80% complex
Security Code:        ██████████ 100% complex
User Experience:      ████░░░░░░ 40% good
Time to Implement:    ████████░░ 8-12 hours
Maintenance:          ████████░░ High
```

### Google OAuth:
```
Database Schema:      ███░░░░░░░ 30% complex
API Endpoints:        ████░░░░░░ 40% complex
Security Code:        ████░░░░░░ 40% complex
User Experience:      ██████████ 100% excellent!
Time to Implement:    ███░░░░░░░ 3-5 hours
Maintenance:          ██░░░░░░░░ Low
```

**Winner for MVP: Google OAuth! 🏆**

---

## 📱 User Experience Flow

### From User's Perspective:

1. **Open your app** → See "Sign in with Google" button
2. **Click button** → Browser opens with Google login
3. **Sign in to Google** → (or already signed in)
4. **Click "Allow"** → Grant permissions
5. **Browser closes** → Automatically returns to app
6. **You're in!** → App shows dashboard

**Total time:** 5-10 seconds (if already signed into Google)

**Compare to email/password:**
- Create account
- Enter email, password
- Verify email (check inbox)
- Click verification link
- Come back, log in
- **Total time:** 2-5 minutes

---

## 🎓 Learning Resources for OAuth

### Official Documentation:
- **Google OAuth Guide**: https://developers.google.com/identity/protocols/oauth2
- **Google Sign-In**: https://developers.google.com/identity/sign-in/web
- **OAuth2 RFC**: https://datatracker.ietf.org/doc/html/rfc6749

### Rust Libraries:
- **oauth2 crate**: https://docs.rs/oauth2
- **jsonwebtoken**: https://docs.rs/jsonwebtoken

### Concepts to Learn:
1. What is OAuth2?
2. Authorization Code Flow
3. ID Tokens vs Access Tokens
4. Token exchange
5. Redirect URIs

---

## 🎯 MVP Success Criteria

Your OAuth system is complete when:

- [ ] User can click "Sign in with Google"
- [ ] Browser opens with Google login
- [ ] After Google auth, user returns to app
- [ ] User info (name, email, picture) stored in database
- [ ] JWT tokens generated and stored in OS keychain
- [ ] Protected API endpoints work with tokens
- [ ] User can logout (tokens revoked)
- [ ] Token refresh works automatically
- [ ] App remembers user between launches
- [ ] Clean error handling (no crashes)

---

## 🔄 Migration Path (Future)

**If you later want to add email/password:**

You can! Keep the same architecture:

```sql
ALTER TABLE users 
ADD COLUMN password_hash TEXT,
ADD COLUMN auth_provider VARCHAR(50) DEFAULT 'google';

-- Now you support both:
-- auth_provider = 'google' → OAuth users
-- auth_provider = 'email' → Email/password users
```

Just add email/password endpoints alongside Google OAuth.

**But for MVP: Keep it simple with Google only! 🎯**

---

## 💡 Common Questions

### Q: What if user doesn't have Google account?
**A:** 99% of your target users likely have Gmail. For MVP, this is acceptable. You can add other providers (GitHub, Microsoft) later.

### Q: Can I use this offline?
**A:** Initial login requires internet. After that, your JWT tokens work offline until they expire. Then user needs to refresh (requires internet).

### Q: Is this secure?
**A:** Yes! You're leveraging Google's security infrastructure which is battle-tested and used by millions of apps.

### Q: What about privacy?
**A:** You only request: email, name, and profile picture. User sees what you're requesting. Google doesn't share other data.

### Q: Does this cost money?
**A:** Google OAuth is FREE for most use cases. Only costs if you exceed quotas (unlikely for MVP).

---

## 🎨 Next Steps

Ready to build? Here's your path:

1. **Set up Google Cloud Console** (15 min)
   - Create project
   - Enable OAuth
   - Get credentials

2. **Build API server** (2 hours)
   - Set up Axum
   - Database schema
   - OAuth exchange endpoint

3. **Build Tauri app** (2 hours)
   - OAuth button
   - Browser redirect handling
   - Token storage

4. **Test & polish** (1 hour)
   - Error handling
   - UI polish
   - Token refresh

**Total MVP time: ~5-6 hours vs 12+ hours for email/password!**

Ready to build? Let's create the step-by-step implementation guide! 🚀