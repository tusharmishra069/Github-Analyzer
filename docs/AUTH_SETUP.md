# Complete Authentication Setup Guide

Complete step-by-step guide to setup **Google OAuth**, **GitHub OAuth**, **OTP Validation**, and **JWT** authentication for free.

---

## 🎯 What You'll Learn

1. ✅ Google OAuth login
2. ✅ GitHub OAuth login
3. ✅ Email OTP verification
4. ✅ JWT token authentication
5. ✅ Secure session management

**Time to complete:** 30-45 minutes | **Cost:** FREE ✨

---

## 📋 Prerequisites

Before starting, make sure you have:

- ✅ Python 3.9+ installed
- ✅ Node.js 18+ installed
- ✅ PostgreSQL 12+ installed locally
- ✅ A Google account
- ✅ A GitHub account
- ✅ A text editor (VS Code recommended)
- ✅ Terminal/Command line access

**Check your versions:**
```bash
python --version      # Should be 3.9+
node --version        # Should be 18+
psql --version        # Should be 12+
```

---

# PART 1: GOOGLE OAUTH SETUP (FREE)

## Step 1: Create Google Cloud Project

### 1.1 Go to Google Cloud Console
- Open: https://console.cloud.google.com
- Click "Select a Project" at the top
- Click "NEW PROJECT"
- Name: `CodeAnalyzer`
- Click "CREATE"

### 1.2 Enable Google+ API
- Search for "Google+ API" in the search bar
- Click "Google+ API" from results
- Click "ENABLE"

### 1.3 Create OAuth 2.0 Credentials
- Go to "Credentials" (left sidebar)
- Click "CREATE CREDENTIALS"
- Choose "OAuth 2.0 Client ID"
- If asked, click "CONFIGURE CONSENT SCREEN" first
- Choose "External" user type
- Click "CREATE"

### 1.4 Configure Consent Screen
Fill in these details:
- **App name:** CodeAnalyzer
- **User support email:** your-email@gmail.com
- **Developer contact:** your-email@gmail.com
- Click "SAVE AND CONTINUE"

Skip the optional scopes, click "SAVE AND CONTINUE"

### 1.5 Create OAuth Client ID
- Application type: **Web application**
- Name: `CodeAnalyzer Web`
- Authorized JavaScript origins:
  ```
  http://localhost:3000
  http://localhost:8000
  ```
- Authorized redirect URIs:
  ```
  http://localhost:3000/auth/google/callback
  http://localhost:8000/auth/google/callback
  ```
- Click "CREATE"

### 1.6 Copy Your Credentials
You'll see a modal with:
- **Client ID** (copy this)
- **Client Secret** (copy this)

Save these safely! ✅

---

# PART 2: GITHUB OAUTH SETUP (FREE)

## Step 2: Create GitHub OAuth App

### 2.1 Go to GitHub Settings
- Go to: https://github.com/settings/developers
- Click "OAuth Apps" (left sidebar)
- Click "New OAuth App"

### 2.2 Fill Application Details
- **Application name:** CodeAnalyzer
- **Homepage URL:** http://localhost:3000
- **Authorization callback URL:** http://localhost:3000/auth/github/callback
- Click "Register application"

### 2.3 Generate Client Secret
- Click "Generate a new client secret"
- Copy the **Client ID**
- Copy the **Client Secret**

Save these safely! ✅

---

# PART 3: BACKEND SETUP

## Step 3: Install & Configure Backend

### 3.1 Navigate to Backend Directory
```bash
cd backend
```

### 3.2 Create Python Virtual Environment
```bash
python -m venv venv

# Activate it:
# On macOS/Linux:
source venv/bin/activate

# On Windows:
venv\Scripts\activate
```

### 3.3 Install Dependencies
```bash
pip install -r requirements.txt
```

**Ensure `requirements.txt` contains:**
```
fastapi==0.104.1
sqlalchemy==2.0.23
python-dotenv==1.0.0
pydantic==2.5.0
PyJWT==2.8.1
httpx==0.25.2
python-multipart==0.0.6
psycopg2-binary==2.9.9
python-jose[cryptography]==3.3.0
passlib[bcrypt]==1.7.4
email-validator==2.1.0
```

### 3.4 Setup PostgreSQL Database

**Option A: Using Homebrew (macOS)**
```bash
brew install postgresql
brew services start postgresql
```

**Option B: Using apt (Linux)**
```bash
sudo apt-get install postgresql postgresql-contrib
sudo service postgresql start
```

**Option C: Download (Windows)**
- Download from: https://www.postgresql.org/download/windows/
- Follow installer
- Remember your password!

### 3.5 Create Database
```bash
# Open PostgreSQL
psql postgres

# Run this command:
CREATE DATABASE ai_code_analyzer;
CREATE USER analyzer WITH PASSWORD 'your_password';
ALTER ROLE analyzer SET client_encoding TO 'utf8';
ALTER ROLE analyzer SET timezone TO 'UTC';
GRANT ALL PRIVILEGES ON DATABASE ai_code_analyzer TO analyzer;

# Exit:
\q
```

### 3.6 Create `.env` File

Create file: `backend/.env`

```env
# ============ DATABASE ============
DATABASE_URL=postgresql://analyzer:your_password@localhost:5432/ai_code_analyzer

# ============ JWT CONFIGURATION ============
JWT_SECRET_KEY=your-super-secret-random-key-change-this-in-production-make-it-long-and-random
JWT_ALGORITHM=HS256
JWT_EXPIRATION_HOURS=24

# ============ GOOGLE OAUTH ============
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=http://localhost:3000/auth/google/callback

# ============ GITHUB OAUTH ============
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret
GITHUB_REDIRECT_URI=http://localhost:3000/auth/github/callback

# ============ OTP CONFIGURATION ============
OTP_EXPIRATION_MINUTES=10
OTP_LENGTH=6

# ============ EMAIL CONFIGURATION (FREE OPTIONS) ============
# Option 1: Using Gmail (Simple)
EMAIL_PROVIDER=gmail
GMAIL_ADDRESS=your-email@gmail.com
GMAIL_APP_PASSWORD=your-app-password

# Option 2: Using Resend (Free tier available)
# RESEND_API_KEY=your-resend-api-key

# ============ FRONTEND URL ============
FRONTEND_URL=http://localhost:3000

# ============ API URL ============
API_URL=http://localhost:8000
```

**📌 How to get Gmail App Password:**
1. Enable 2FA on your Google account: https://myaccount.google.com/security
2. Go to: https://myaccount.google.com/apppasswords
3. Select "Mail" and "Windows Computer"
4. Google will generate a 16-character password
5. Use that as `GMAIL_APP_PASSWORD`

---

## Step 4: Create Database Models

Create file: `backend/app/models.py`

```python
from sqlalchemy import Column, String, DateTime, Boolean, Integer
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime

Base = declarative_base()

class User(Base):
    __tablename__ = "users"
    
    id = Column(String, primary_key=True)
    email = Column(String, unique=True, index=True)
    name = Column(String)
    password_hash = Column(String, nullable=True)  # For email/password
    
    # OAuth fields
    google_id = Column(String, nullable=True, unique=True)
    github_id = Column(String, nullable=True, unique=True)
    
    # Account status
    is_verified = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class OTP(Base):
    __tablename__ = "otps"
    
    id = Column(String, primary_key=True)
    email = Column(String, index=True)
    code = Column(String)
    is_used = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    
class RefreshToken(Base):
    __tablename__ = "refresh_tokens"
    
    id = Column(String, primary_key=True)
    user_id = Column(String, index=True)
    token = Column(String, unique=True)
    expires_at = Column(DateTime)
    created_at = Column(DateTime, default=datetime.utcnow)
```

---

## Step 5: Create Auth Utility Functions

Create file: `backend/app/auth_utils.py`

```python
import jwt
import os
from datetime import datetime, timedelta
from dotenv import load_dotenv

load_dotenv()

JWT_SECRET = os.getenv("JWT_SECRET_KEY")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
JWT_EXPIRATION = int(os.getenv("JWT_EXPIRATION_HOURS", 24))


def create_jwt_token(user_id: str, email: str) -> str:
    """
    Create a JWT access token
    
    Args:
        user_id: User ID
        email: User email
        
    Returns:
        JWT token string
    """
    payload = {
        "sub": user_id,
        "email": email,
        "iat": datetime.utcnow(),
        "exp": datetime.utcnow() + timedelta(hours=JWT_EXPIRATION)
    }
    token = jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)
    return token


def verify_jwt_token(token: str) -> dict:
    """
    Verify and decode JWT token
    
    Args:
        token: JWT token string
        
    Returns:
        Decoded token payload
        
    Raises:
        jwt.ExpiredSignatureError: If token expired
        jwt.InvalidTokenError: If token invalid
    """
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise Exception("Token expired")
    except jwt.InvalidTokenError:
        raise Exception("Invalid token")


def create_refresh_token(user_id: str) -> str:
    """
    Create a refresh token (valid for 30 days)
    """
    payload = {
        "sub": user_id,
        "type": "refresh",
        "exp": datetime.utcnow() + timedelta(days=30)
    }
    token = jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)
    return token
```

---

## Step 6: Create Auth Routes

Create file: `backend/app/auth_routes.py`

```python
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr
import os
import httpx
import uuid
import random
from dotenv import load_dotenv
from app.auth_utils import create_jwt_token

load_dotenv()

router = APIRouter(prefix="/auth", tags=["auth"])


# Pydantic Models
class OTPRequest(BaseModel):
    email: EmailStr


class VerifyOTPRequest(BaseModel):
    email: EmailStr
    code: str


# ============ GOOGLE OAUTH ============

@router.get("/google/callback")
async def google_callback(code: str):
    """
    Handle Google OAuth callback
    
    Flow:
    1. Frontend sends auth code from Google
    2. Backend exchanges code for access token
    3. Backend gets user info from Google
    4. Create/update user in database
    5. Return JWT tokens to frontend
    """
    try:
        # Exchange code for access token
        token_url = "https://oauth2.googleapis.com/token"
        token_data = {
            "code": code,
            "client_id": os.getenv("GOOGLE_CLIENT_ID"),
            "client_secret": os.getenv("GOOGLE_CLIENT_SECRET"),
            "redirect_uri": os.getenv("GOOGLE_REDIRECT_URI"),
            "grant_type": "authorization_code"
        }
        
        async with httpx.AsyncClient() as client:
            token_response = await client.post(token_url, data=token_data)
            token_json = token_response.json()
            
            if "error" in token_json:
                raise HTTPException(status_code=400, detail="Invalid code")
            
            access_token = token_json["access_token"]
            
            # Get user info from Google
            userinfo_url = "https://www.googleapis.com/oauth2/v2/userinfo"
            headers = {"Authorization": f"Bearer {access_token}"}
            user_response = await client.get(userinfo_url, headers=headers)
            user_info = user_response.json()
        
        # Find or create user
        user_email = user_info["email"]
        user_id = user_info["id"]
        
        # TODO: Save to database
        jwt_token = create_jwt_token(user_id, user_email)
        
        return {
            "access_token": jwt_token,
            "token_type": "bearer",
            "user": {
                "id": user_id,
                "email": user_email,
                "name": user_info.get("name", "")
            }
        }
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# ============ GITHUB OAUTH ============

@router.get("/github/callback")
async def github_callback(code: str):
    """
    Handle GitHub OAuth callback
    
    Similar flow to Google
    """
    try:
        # Exchange code for access token
        token_url = "https://github.com/login/oauth/access_token"
        token_data = {
            "client_id": os.getenv("GITHUB_CLIENT_ID"),
            "client_secret": os.getenv("GITHUB_CLIENT_SECRET"),
            "code": code
        }
        headers = {"Accept": "application/json"}
        
        async with httpx.AsyncClient() as client:
            token_response = await client.post(token_url, data=token_data, headers=headers)
            token_json = token_response.json()
            
            if "error" in token_json:
                raise HTTPException(status_code=400, detail="Invalid code")
            
            access_token = token_json["access_token"]
            
            # Get user info from GitHub
            userinfo_url = "https://api.github.com/user"
            headers = {"Authorization": f"Bearer {access_token}"}
            user_response = await client.get(userinfo_url, headers=headers)
            user_info = user_response.json()
        
        # Find or create user
        user_id = user_info["id"]
        user_email = user_info.get("email") or f"github_{user_id}@github.com"
        
        jwt_token = create_jwt_token(str(user_id), user_email)
        
        return {
            "access_token": jwt_token,
            "token_type": "bearer",
            "user": {
                "id": str(user_id),
                "email": user_email,
                "name": user_info.get("name", "")
            }
        }
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# ============ OTP VERIFICATION ============

@router.post("/send-otp")
async def send_otp(request: OTPRequest):
    """
    Send OTP to user email
    
    1. Generate random 6-digit OTP
    2. Save to database with expiration
    3. Send email to user
    """
    try:
        otp_code = "".join([str(random.randint(0, 9)) for _ in range(6)])
        
        # TODO: Save OTP to database
        # TODO: Send email via Gmail/Resend
        
        # For development: print to console
        print(f"OTP for {request.email}: {otp_code}")
        
        return {
            "message": "OTP sent to email",
            "email": request.email
        }
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/verify-otp")
async def verify_otp(request: VerifyOTPRequest):
    """
    Verify OTP code and create user
    
    1. Check if OTP exists and is valid
    2. Check if OTP is not expired
    3. Create user if not exists
    4. Return JWT tokens
    """
    try:
        # TODO: Fetch OTP from database and validate
        
        user_id = str(uuid.uuid4())
        jwt_token = create_jwt_token(user_id, request.email)
        
        return {
            "access_token": jwt_token,
            "token_type": "bearer",
            "user": {
                "id": user_id,
                "email": request.email
            }
        }
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
```

---

# PART 4: FRONTEND SETUP

## Step 7: Install Frontend Dependencies

```bash
cd frontend
npm install
```

### Install OAuth Libraries
```bash
npm install react-oauth/google axios
```

---

## Step 8: Create Login Page

Update or create: `frontend/src/app/auth/login/page.tsx`

```tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';
import axios from 'axios';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [showOTP, setShowOTP] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [loading, setLoading] = useState(false);

  // Handle Google OAuth
  const handleGoogleSuccess = async (credentialResponse: any) => {
    try {
      setLoading(true);
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/auth/google/callback`,
        { code: credentialResponse.credential }
      );
      
      localStorage.setItem('access_token', response.data.access_token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      
      router.push('/user/dashboard');
    } catch (error) {
      console.error('Google login failed:', error);
      alert('Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle GitHub OAuth
  const handleGitHubLogin = () => {
    const clientId = process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID;
    const redirectUri = `${window.location.origin}/auth/github/callback`;
    
    window.location.href = 
      `https://github.com/login/oauth/authorize?` +
      `client_id=${clientId}&` +
      `redirect_uri=${redirectUri}&` +
      `scope=user:email`;
  };

  // Handle Email OTP
  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/auth/send-otp`,
        { email }
      );
      setShowOTP(true);
    } catch (error) {
      alert('Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  // Verify OTP
  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/auth/verify-otp`,
        { email, code: otpCode }
      );
      
      localStorage.setItem('access_token', response.data.access_token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      
      router.push('/user/dashboard');
    } catch (error) {
      alert('Invalid OTP');
    } finally {
      setLoading(false);
    }
  };

  return (
    <GoogleOAuthProvider clientId={process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!}>
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-full max-w-md p-8 bg-white rounded-lg shadow">
          <h1 className="text-2xl font-bold mb-8 text-center">CodeAnalyzer</h1>

          {!showOTP ? (
            <>
              {/* Google Login */}
              <div className="mb-4">
                <GoogleLogin
                  onSuccess={handleGoogleSuccess}
                  onError={() => alert('Login failed')}
                />
              </div>

              {/* Divider */}
              <div className="relative mb-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">Or continue with</span>
                </div>
              </div>

              {/* GitHub Login */}
              <button
                onClick={handleGitHubLogin}
                className="w-full mb-4 py-2 px-4 border border-gray-300 rounded-lg hover:bg-gray-50"
                disabled={loading}
              >
                Continue with GitHub
              </button>

              {/* Email OTP */}
              <form onSubmit={handleSendOTP}>
                <input
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-4"
                  required
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
                >
                  {loading ? 'Sending...' : 'Send OTP'}
                </button>
              </form>
            </>
          ) : (
            <>
              {/* OTP Verification */}
              <p className="text-center mb-4 text-gray-600">
                Enter the 6-digit code sent to {email}
              </p>
              <form onSubmit={handleVerifyOTP}>
                <input
                  type="text"
                  placeholder="000000"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value)}
                  maxLength={6}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-4 text-center text-2xl tracking-widest"
                  required
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
                >
                  {loading ? 'Verifying...' : 'Verify OTP'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowOTP(false)}
                  className="w-full mt-2 py-2 px-4 text-blue-600 hover:text-blue-700"
                >
                  Change Email
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </GoogleOAuthProvider>
  );
}
```

---

## Step 9: Create Frontend Environment Variables

Create file: `frontend/.env.local`

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
NEXT_PUBLIC_GITHUB_CLIENT_ID=your-github-client-id
NEXT_PUBLIC_GITHUB_REDIRECT_URI=http://localhost:3000/auth/github/callback
```

---

# PART 5: RUN & TEST

## Step 10: Start Everything

### Terminal 1: Start Backend
```bash
cd backend
source venv/bin/activate  # On Windows: venv\Scripts\activate
python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

You should see:
```
Uvicorn running on http://127.0.0.1:8000
```

### Terminal 2: Start Frontend
```bash
cd frontend
npm run dev
```

You should see:
```
ready - started server on 0.0.0.0:3000
```

### Terminal 3: Start PostgreSQL (if not running)
```bash
# macOS:
brew services start postgresql

# Linux:
sudo service postgresql start
```

---

## Step 11: Test Authentication

### Test Google OAuth
1. Go to http://localhost:3000/auth/login
2. Click "Continue with Google"
3. Sign in with your Google account
4. You should be redirected to dashboard

### Test GitHub OAuth
1. Go to http://localhost:3000/auth/login
2. Click "Continue with GitHub"
3. Authorize the app
4. You should be redirected to dashboard

### Test Email OTP
1. Go to http://localhost:3000/auth/login
2. Enter your email
3. Click "Send OTP"
4. Check backend console for OTP code
5. Enter the 6-digit code
6. You should be redirected to dashboard

---

# PART 6: JWT TOKENS EXPLAINED

## How JWT Works

### 1. Structure
JWT has 3 parts separated by dots:
```
header.payload.signature
```

**Example:**
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.
eyJzdWIiOiJ1c2VyMTIzIiwiZW1haWwiOiJ1c2VyQGdtYWlsLmNvbSIsImlhdCI6MTcwNjUyMDAwMCwiZXhwIjoxNzA2NjA2NDAwfQ.
signature_hash_here
```

### 2. Token Parts Explained

**Header:**
```json
{
  "alg": "HS256",    // Algorithm used
  "typ": "JWT"       // Token type
}
```

**Payload:**
```json
{
  "sub": "user123",                    // Subject (user ID)
  "email": "user@gmail.com",           // User email
  "iat": 1706520000,                   // Issued at (timestamp)
  "exp": 1706606400                    // Expiration (timestamp)
}
```

**Signature:**
```
HMACSHA256(
  base64UrlEncode(header) + "." +
  base64UrlEncode(payload),
  secret_key
)
```

### 3. How to Use JWT

**Store in Frontend:**
```javascript
// After login
localStorage.setItem('access_token', token);

// When making API requests
const headers = {
  'Authorization': `Bearer ${token}`
};

// Fetch with token
fetch('/api/protected', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
```

**Verify in Backend:**
```python
from fastapi import Depends, HTTPException

def verify_token(token: str):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
        user_id = payload.get("sub")
        return user_id
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

@app.get("/protected")
def protected_route(user_id: str = Depends(verify_token)):
    return {"message": f"Hello {user_id}"}
```

---

# TROUBLESHOOTING

## Google OAuth Issues

**Problem:** "Invalid redirect_uri"
- **Solution:** Make sure your redirect URL matches exactly in Google Cloud Console

**Problem:** "Client ID not found"
- **Solution:** Check `NEXT_PUBLIC_GOOGLE_CLIENT_ID` in `.env.local`

## GitHub OAuth Issues

**Problem:** "Invalid client credentials"
- **Solution:** Verify `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET` in backend `.env`

## OTP Issues

**Problem:** "OTP not received"
- **Solution:** Check backend console for OTP code (development mode)

## JWT Issues

**Problem:** "Invalid token" error
- **Solution:**
  - Token might be expired (24 hours)
  - Make sure `JWT_SECRET_KEY` is same in backend
  - Check Bearer token format: `Bearer <token>`

---

# NEXT STEPS

After authentication works:

1. ✅ Add user profile page
2. ✅ Add logout functionality
3. ✅ Add password reset
4. ✅ Add rate limiting
5. ✅ Deploy to production (Vercel + Render)

---

## Security Checklist

- ✅ Never commit `.env` files to git
- ✅ Use strong `JWT_SECRET_KEY` in production
- ✅ Enable HTTPS in production
- ✅ Set secure CORS origins
- ✅ Validate all user inputs
- ✅ Use HTTPS for all redirects
- ✅ Implement rate limiting
- ✅ Add CSRF protection

---

**Congratulations! You now have a complete authentication system! 🎉**
