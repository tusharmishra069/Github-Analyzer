# Authentication & Authorization System

Complete authentication system with dual dashboards (Admin & User) supporting OAuth2 (Google, GitHub) and Email OTP verification.

## Features

### Authentication Methods

1. **Google OAuth2**
   - Automatic user creation on first login
   - Social login button with Google icon
   - Redirects to `/auth/callback` with authorization code

2. **GitHub OAuth2**
   - Automatic user creation on first login
   - Social login button with GitHub icon
   - Redirects to `/auth/callback` with authorization code

3. **Email OTP (One-Time Password)**
   - 6-digit OTP code sent to email
   - 10-minute expiry window
   - Two-step flow: Send OTP → Verify OTP
   - Fallback for users without social accounts

### Token Management

- **Access Token**: JWT with 1-hour expiry (short-lived, used for API requests)
- **Refresh Token**: Database-stored token with 7-day expiry (long-lived, used to get new access tokens)
- **Token Storage**: localStorage (access_token, refresh_token, user JSON)
- **Security**: Tokens include user ID and role in JWT claims

### User Roles

Two distinct roles with separate dashboards:

1. **Admin Role** (`/admin/dashboard`)
   - System overview with key statistics
   - User management (list, view, disable/enable)
   - Analysis history and monitoring
   - System-wide controls

2. **User Role** (`/user/dashboard`)
   - Profile information display
   - Submit new repository analyses
   - View personal analysis history
   - Track bugs and pattern findings

### Role-Based Access Control

- Automatic dashboard redirection based on user role
- Protected routes with `useAuth()` hook or `ProtectedRoute` component
- Admin endpoints require admin role verification
- Unauthorized access redirects to appropriate dashboard

## File Structure

### Backend

```
backend/
├── app/
│   ├── models/
│   │   └── auth.py              # User, UserRole, RefreshToken models
│   ├── services/
│   │   └── auth_service.py      # Authentication business logic
│   └── api/
│       ├── routes/
│       │   ├── auth.py          # Authentication endpoints
│       │   └── admin.py         # Admin endpoints
│       └── dependencies.py       # Auth dependencies & middleware
```

### Frontend

```
frontend/src/
├── app/
│   ├── auth/
│   │   ├── login/page.tsx       # Login/Signup page
│   │   └── callback/page.tsx    # OAuth callback handler
│   ├── admin/
│   │   └── dashboard/page.tsx   # Admin dashboard
│   └── user/
│       └── dashboard/page.tsx   # User dashboard
├── context/
│   └── AuthContext.tsx          # Auth state management
├── components/
│   └── ProtectedRoute.tsx       # Role-based route protection
└── lib/
    └── api-client.ts            # API request utilities
```

## Database Schema

### Users Table

```
id                 UUID PRIMARY KEY
email              VARCHAR UNIQUE NOT NULL
name               VARCHAR NOT NULL
avatar_url         VARCHAR
oauth_provider     VARCHAR (google, github, null)
oauth_id           VARCHAR UNIQUE
otp_code           VARCHAR (6-digit code)
otp_expires_at     TIMESTAMP
otp_verified       BOOLEAN DEFAULT FALSE
role               ENUM (ADMIN, USER) DEFAULT USER
is_active          BOOLEAN DEFAULT TRUE
is_verified        BOOLEAN DEFAULT FALSE
created_at         TIMESTAMP DEFAULT NOW()
updated_at         TIMESTAMP DEFAULT NOW()
last_login         TIMESTAMP
```

### RefreshTokens Table

```
id                 UUID PRIMARY KEY
user_id            UUID FOREIGN KEY → users(id)
token              VARCHAR UNIQUE NOT NULL
expires_at         TIMESTAMP NOT NULL
created_at         TIMESTAMP DEFAULT NOW()
is_revoked         BOOLEAN DEFAULT FALSE
```

## API Endpoints

### Authentication

#### Start OAuth Flow
```
GET /api/auth/oauth/google
GET /api/auth/oauth/github
```
Returns: OAuth authorization URL to redirect user to

#### Handle OAuth Callback
```
POST /api/auth/oauth/google/callback
POST /api/auth/oauth/github/callback
Body: { code: string }
Returns: { access_token, refresh_token, user }
```

#### Email OTP Authentication
```
POST /api/auth/email/send-otp
Body: { email: string }
Returns: { message: "OTP sent" }

POST /api/auth/email/verify-otp
Body: { email: string, otp: string }
Returns: { access_token, refresh_token, user }
```

#### Token Management
```
POST /api/auth/refresh
Body: { refresh_token: string }
Returns: { access_token, refresh_token }

POST /api/auth/logout
Returns: { message: "Logged out" }

GET /api/auth/me
Returns: { user }
```

### Admin Operations

#### Statistics
```
GET /api/admin/stats
Returns: { total_users, total_analyses, active_jobs, completed_analyses, failed_analyses }

GET /api/admin/dashboard-summary
Returns: { stats, recent_users, recent_analyses }
```

#### User Management
```
GET /api/admin/users?skip=0&limit=10
Returns: List of users

GET /api/admin/users/{user_id}
Returns: User details

PUT /api/admin/users/{user_id}
Body: { role?: string, is_active?: boolean }
Returns: { message }

DELETE /api/admin/users/{user_id}
Returns: { message }

POST /api/admin/users/{user_id}/toggle-role
Returns: { message }
```

#### Analysis Management
```
GET /api/admin/analyses?skip=0&limit=10&status=completed
Returns: List of all analyses

GET /api/admin/analyses/user/{user_id}
Returns: Analyses for specific user

POST /api/admin/analyses/{analysis_id}/retry
Returns: { message }
```

#### System Monitoring
```
GET /api/admin/system-logs?limit=100
Returns: { logs, total }
```

## Frontend Authentication Flow

### Login Page (`/auth/login`)

1. User arrives at login page
2. Three authentication options:
   - **Google Login**: Redirects to Google OAuth, returns to `/auth/callback?code=...&provider=google`
   - **GitHub Login**: Redirects to GitHub OAuth, returns to `/auth/callback?code=...&provider=github`
   - **Email OTP**: 
     - User enters email
     - System sends 6-digit OTP
     - User enters OTP code
     - System creates account and session

### OAuth Callback Handler (`/auth/callback`)

1. Extract `code` and `provider` from URL
2. POST to backend callback endpoint
3. Backend exchanges code for tokens
4. Stores tokens in localStorage
5. Redirects to dashboard (admin or user based on role)

### Dashboard Routing

- **Admin User**: Redirected to `/admin/dashboard`
- **Regular User**: Redirected to `/user/dashboard`
- **Not Authenticated**: Redirected to `/auth/login`
- **Wrong Role**: Auto-redirected to correct dashboard

## Frontend Usage

### Using Auth Context

```typescript
import { useAuth } from '@/context/AuthContext';

export function MyComponent() {
  const { user, isAuthenticated, isAdmin, logout } = useAuth();

  if (!isAuthenticated) return <div>Please login</div>;

  return (
    <div>
      <p>Welcome, {user?.name}!</p>
      {isAdmin && <p>You are an admin</p>}
      <button onClick={logout}>Logout</button>
    </div>
  );
}
```

### Using Protected Routes

```typescript
import { ProtectedRoute } from '@/components/ProtectedRoute';

export function AdminPageWrapper() {
  return (
    <ProtectedRoute requiredRole="admin">
      <AdminDashboard />
    </ProtectedRoute>
  );
}
```

### Using API Client

```typescript
import { adminApi, userApi, authApi } from '@/lib/api-client';

// Get admin stats
const stats = await adminApi.getStats();

// Get user analyses
const analyses = await userApi.getAnalyses(0, 10);

// Submit analysis
const result = await userApi.submitAnalysis('https://github.com/user/repo');

// Logout
await authApi.logout();
```

## Backend Implementation Guide

### Setting Up Authentication in FastAPI

1. **Import Models and Services**
```python
from app.models.auth import User, UserRole, RefreshToken
from app.services.auth_service import AuthService
from app.api.routes.auth import router as auth_router
from app.api.routes.admin import router as admin_router
```

2. **Include Routers in Main App**
```python
from fastapi import FastAPI

app = FastAPI()
app.include_router(auth_router)
app.include_router(admin_router)
```

3. **Create Database Tables**
```python
from app.database import Base, engine

# On startup:
Base.metadata.create_all(bind=engine)
```

4. **Environment Variables**
```
# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=http://localhost:3000/auth/callback

# GitHub OAuth
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
GITHUB_REDIRECT_URI=http://localhost:3000/auth/callback

# JWT
JWT_SECRET_KEY=your_secret_key_for_signing_tokens
JWT_ALGORITHM=HS256

# Email Service (SendGrid)
SENDGRID_API_KEY=your_sendgrid_api_key
SENDGRID_FROM_EMAIL=noreply@example.com
```

## Email Service Integration

Currently, OTP is printed to console in development. To enable email sending:

1. **Install SendGrid**
```bash
pip install sendgrid
```

2. **Update auth_service.py**
```python
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail

async def send_email_otp(email: str, otp: str):
    sg = SendGridAPIClient(os.getenv("SENDGRID_API_KEY"))
    message = Mail(
        from_email=os.getenv("SENDGRID_FROM_EMAIL"),
        to_emails=email,
        subject="Your OTP Code",
        html_content=f"<p>Your OTP code is: <strong>{otp}</strong></p>",
    )
    sg.send(message)
```

## Security Considerations

1. **Token Storage**: Currently using localStorage. For production, consider:
   - HttpOnly cookies for access tokens
   - Secure, SameSite cookie flags
   - CSRF protection for state-changing operations

2. **Token Refresh**: Implement token refresh endpoint to maintain security
   - Access token expires quickly (1 hour)
   - Refresh token has longer expiry (7 days)
   - Only refresh token can be used to get new access token

3. **Password Hashing**: When adding password-based authentication:
   - Use bcrypt for password hashing
   - Never store plain passwords
   - Implement password reset flow

4. **API Security**:
   - Enable CORS appropriately
   - Rate limit authentication endpoints
   - Log suspicious activities
   - Monitor token usage patterns

5. **OAuth Security**:
   - Validate redirect URIs
   - Store OAuth provider IDs securely
   - Prevent account takeover via OAuth

## Testing Checklist

- [ ] Google OAuth login works
- [ ] GitHub OAuth login works
- [ ] Email OTP send/verify works
- [ ] User automatically created on first login
- [ ] Admin gets admin dashboard
- [ ] Regular user gets user dashboard
- [ ] Wrong role redirects to correct dashboard
- [ ] Access token expires (test with old token)
- [ ] Refresh token refreshes access token
- [ ] Logout clears tokens and redirects
- [ ] Protected routes work correctly
- [ ] Admin can see all users and analyses
- [ ] User can only see their own data

## Troubleshooting

### "Invalid authentication credentials"
- Check JWT secret key matches between frontend and backend
- Verify token hasn't expired
- Check Authorization header format (should be "Bearer <token>")

### "Admin access required"
- Verify user's role is "admin" in database
- Check `requiredRole` prop on ProtectedRoute
- Use admin account created during seeding

### OAuth callback fails
- Verify redirect URI matches exactly (including protocol, domain, path)
- Check client ID and secret are correct
- Confirm OAuth apps are created on Google/GitHub

### Email OTP not sent
- In development, check backend console for OTP code
- For production, configure SendGrid API key
- Verify email address is correct

### Token not persisting
- Check localStorage is enabled in browser
- Verify tokens are being saved after login
- Check browser's private/incognito mode doesn't block localStorage

## Future Enhancements

1. **Multi-Factor Authentication (MFA)**
   - TOTP authentication
   - SMS/Email second factor

2. **Advanced Admin Features**
   - User role management with granular permissions
   - System logs and audit trail
   - Rate limiting and DDoS protection
   - API key management for programmatic access

3. **User Features**
   - Profile customization
   - Email preferences
   - API key generation for personal use
   - Analysis scheduling and webhooks

4. **Security**
   - IP whitelisting for admin accounts
   - Session management and device tracking
   - Passwordless authentication improvements
   - Compliance features (GDPR, SOC2)

5. **Monitoring**
   - Usage analytics and reporting
   - Performance metrics
   - Error tracking and debugging
   - Health checks and uptime monitoring
