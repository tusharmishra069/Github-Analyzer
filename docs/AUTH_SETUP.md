# Authentication System Setup Guide

Quick start guide for setting up the complete authentication system locally.

## Prerequisites

- Python 3.9+ (Backend)
- Node.js 18+ (Frontend)
- PostgreSQL 12+ (Database)
- Google OAuth App created
- GitHub OAuth App created

## Step 1: Backend Setup

### 1.1 Install Dependencies

```bash
cd backend
pip install -r requirements.txt
```

Add to `requirements.txt` if not already present:
```
fastapi==0.104.1
sqlalchemy==2.0.23
python-dotenv==1.0.0
pydantic==2.5.0
PyJWT==2.8.1
httpx==0.25.2
python-multipart==0.0.6
psycopg2-binary==2.9.9  # For PostgreSQL
sendgrid==6.10.0  # For email (optional)
```

### 1.2 Configure Environment Variables

Create `.env` file in backend directory:

```bash
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/ai_code_analyzer

# JWT Configuration
JWT_SECRET_KEY=your-super-secret-key-change-this-in-production
JWT_ALGORITHM=HS256

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=http://localhost:3000/auth/callback

# GitHub OAuth
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret
GITHUB_REDIRECT_URI=http://localhost:3000/auth/callback

# Email Service (Optional - for production)
SENDGRID_API_KEY=your-sendgrid-api-key
SENDGRID_FROM_EMAIL=noreply@example.com

# Application
ENVIRONMENT=development
DEBUG=true
```

### 1.3 Set Up Database

```bash
# Create database
createdb ai_code_analyzer

# Run migrations (if using Alembic)
alembic upgrade head

# Or create tables directly
python -c "from app.database import Base, engine; Base.metadata.create_all(bind=engine)"
```

### 1.4 Update Main FastAPI App

Add to `backend/main.py`:

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.routes.auth import router as auth_router
from app.api.routes.admin import router as admin_router
from app.database import Base, engine

# Create tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="AI Code Analyzer")

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include auth routers
app.include_router(auth_router)
app.include_router(admin_router)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
```

### 1.5 Run Backend

```bash
# Development with auto-reload
uvicorn main:app --reload --port 8000

# Or using python
python -m uvicorn main:app --reload --port 8000
```

## Step 2: Frontend Setup

### 2.1 Install Dependencies

```bash
cd frontend
npm install
```

### 2.2 Configure Environment Variables

Create `.env.local` file in frontend directory:

```bash
# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:8000

# OAuth Redirect (usually same as frontend URL)
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 2.3 Run Frontend

```bash
npm run dev
```

Visit `http://localhost:3000` in your browser.

## Step 3: OAuth Provider Setup

### 3.1 Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create new project
3. Enable Google+ API
4. Create OAuth 2.0 credentials (Web application)
5. Add authorized redirect URIs:
   - `http://localhost:3000/auth/callback`
   - `http://localhost:8000/api/auth/oauth/google/callback` (backend)
6. Copy Client ID and Client Secret to `.env` files

### 3.2 GitHub OAuth

1. Go to GitHub Settings → Developer settings → OAuth Apps
2. Click "New OAuth App"
3. Fill in details:
   - Application name: AI Code Analyzer
   - Homepage URL: `http://localhost:3000`
   - Authorization callback URL: `http://localhost:3000/auth/callback`
4. Copy Client ID and Client Secret to `.env` files

## Step 4: Database Schema Verification

Check that the following tables were created:

```sql
-- Users table
\d users

-- Refresh tokens table
\d refresh_tokens

-- Verify columns exist
SELECT column_name, data_type FROM information_schema.columns 
WHERE table_name = 'users' 
ORDER BY ordinal_position;
```

## Step 5: Test Authentication

### Test Flow 1: Email OTP

1. Visit `http://localhost:3000/auth/login`
2. Enter any email address
3. Click "Send OTP"
4. Check backend console for OTP code (e.g., `123456`)
5. Enter OTP in the form
6. Click "Verify OTP"
7. Should redirect to user dashboard

### Test Flow 2: Google OAuth

1. Click "Sign in with Google"
2. Authenticate with your Google account
3. Should redirect to user dashboard
4. Check database for new user entry

### Test Flow 3: GitHub OAuth

1. Click "Sign in with GitHub"
2. Authenticate with your GitHub account
3. Should redirect to user dashboard
4. Check database for new user entry

## Step 6: Create Admin User (for testing)

### Option 1: Database Query

```sql
INSERT INTO users (id, email, name, role, is_active, is_verified, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'admin@example.com',
  'Admin User',
  'admin',
  true,
  true,
  NOW(),
  NOW()
);
```

### Option 2: Signup then Update

1. Signup normally (OAuth or Email OTP)
2. Update role in database:
```sql
UPDATE users SET role = 'admin' WHERE email = 'your@email.com';
```

## Step 7: Test Admin Dashboard

1. Login with admin account
2. Visit `http://localhost:3000/admin/dashboard`
3. Should see admin statistics and user management
4. Visit admin dashboard with `?tab=users` to see user list
5. Visit admin dashboard with `?tab=analyses` to see analysis history

## Troubleshooting

### Backend won't start
```bash
# Check if port 8000 is already in use
lsof -i :8000

# Try different port
uvicorn main:app --reload --port 8001
```

### Frontend won't connect to backend
- Check `NEXT_PUBLIC_API_URL` in `.env.local`
- Verify backend is running on the correct port
- Check CORS configuration in backend
- Check browser console for network errors

### OAuth redirect fails
- Verify redirect URI exactly matches OAuth app configuration
- Check that localhost:3000 resolves correctly
- Try in incognito/private window
- Clear browser cache and cookies

### Database connection error
```bash
# Test database connection
psql postgresql://user:password@localhost:5432/ai_code_analyzer

# Check if PostgreSQL is running
pg_isready -h localhost
```

### Email OTP not appearing
- In development, check backend console (print statement)
- Implement SendGrid in `auth_service.py` for production
- Check email service logs

## Development Workflow

### 1. Make Authentication Changes

Backend:
```bash
# Edit auth_service.py or routes/auth.py
# Changes auto-reload with uvicorn
```

Frontend:
```bash
# Edit login page or dashboard
# Changes auto-reload with next dev
```

### 2. Test Changes

```bash
# Test in browser
# Check console for errors
# Check backend logs
```

### 3. Database Changes

```bash
# If you modify models, recreate tables:
# 1. Drop existing tables (in development only!)
# 2. Restart backend to recreate tables
```

### 4. Commit Changes

```bash
git add .
git commit -m "feat: [auth system changes]"
git push
```

## Production Checklist

- [ ] Change `JWT_SECRET_KEY` to a long random string
- [ ] Set `ENVIRONMENT=production`
- [ ] Set `DEBUG=false`
- [ ] Use environment-specific database URL
- [ ] Enable HTTPS/TLS
- [ ] Update CORS to allow production domains
- [ ] Configure SendGrid for email
- [ ] Set up logging and monitoring
- [ ] Enable rate limiting on auth endpoints
- [ ] Use HttpOnly cookies for token storage
- [ ] Set up database backups
- [ ] Configure environment variables in deployment platform
- [ ] Test OAuth with production URLs
- [ ] Set up SSL certificates
- [ ] Enable database encryption
- [ ] Set up automated deployments

## Next Steps

1. **Implement User Endpoints**
   - GET `/api/user/profile`
   - PUT `/api/user/profile`
   - GET `/api/user/analyses`
   - POST `/api/user/analyses`

2. **Integrate with Analysis Engine**
   - Connect dashboard to actual analysis system
   - Replace mock data with real database queries
   - Implement analysis status tracking

3. **Add More Features**
   - Password reset for email signups
   - Profile picture upload
   - Email verification
   - Account deletion
   - Session management

4. **Improve Security**
   - Implement refresh token rotation
   - Add rate limiting
   - Add CSRF protection
   - Implement account lockout
   - Add audit logging

## References

- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [Next.js Documentation](https://nextjs.org/docs)
- [SQLAlchemy Documentation](https://docs.sqlalchemy.org/)
- [JWT Best Practices](https://tools.ietf.org/html/rfc8725)
- [OAuth 2.0 Security](https://datatracker.ietf.org/doc/html/rfc6749)
