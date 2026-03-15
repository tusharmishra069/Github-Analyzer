"""Authentication service module."""

import os
import secrets
import string
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
import jwt
import httpx
from sqlalchemy.orm import Session
from app.models.auth import User, UserRole, RefreshToken
from app.core.security import hash_password, verify_password

# JWT Configuration
JWT_SECRET = os.getenv("JWT_SECRET_KEY", "your-secret-key-change-in-production")
JWT_ALGORITHM = "HS256"
JWT_ACCESS_EXPIRATION = 3600  # 1 hour
JWT_REFRESH_EXPIRATION = 604800  # 7 days


def generate_otp(length: int = 6) -> str:
    """Generate random OTP code."""
    return ''.join(secrets.choice(string.digits) for _ in range(length))


def create_access_token(user_id: str, email: str, role: UserRole) -> str:
    """Create JWT access token."""
    payload = {
        "sub": user_id,
        "email": email,
        "role": role.value,
        "iat": datetime.utcnow(),
        "exp": datetime.utcnow() + timedelta(seconds=JWT_ACCESS_EXPIRATION),
        "type": "access",
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def create_refresh_token(db: Session, user_id: str) -> str:
    """Create refresh token and store in database."""
    token = secrets.token_urlsafe(32)
    expires_at = datetime.utcnow() + timedelta(seconds=JWT_REFRESH_EXPIRATION)
    
    refresh_token = RefreshToken(
        user_id=user_id,
        token=token,
        expires_at=expires_at,
    )
    db.add(refresh_token)
    db.commit()
    
    return token


def verify_token(token: str) -> Optional[Dict[str, Any]]:
    """Verify JWT token and return payload."""
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None


def send_otp_email(email: str, otp: str) -> bool:
    """Send OTP via email. Replace with actual email service (SendGrid, etc.)."""
    # TODO: Integrate with SendGrid or similar service
    print(f"🔐 OTP for {email}: {otp}")  # For development
    return True


def get_or_create_user(db: Session, email: str, name: Optional[str] = None, 
                      oauth_provider: Optional[str] = None, oauth_id: Optional[str] = None) -> User:
    """Get existing user or create new one."""
    user = db.query(User).filter(User.email == email).first()
    
    if not user:
        user = User(
            email=email,
            name=name or email.split('@')[0],
            oauth_provider=oauth_provider,
            oauth_id=oauth_id,
            is_verified=True if oauth_provider else False,
            role=UserRole.USER,
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    
    return user


def generate_google_oauth_url() -> str:
    """Generate Google OAuth authorization URL."""
    client_id = os.getenv("GOOGLE_OAUTH_CLIENT_ID")
    redirect_uri = os.getenv("GOOGLE_OAUTH_REDIRECT_URI", "http://localhost:3000/auth/google/callback")
    scope = "openid profile email"
    
    return (
        f"https://accounts.google.com/o/oauth2/v2/auth?"
        f"client_id={client_id}&"
        f"redirect_uri={redirect_uri}&"
        f"response_type=code&"
        f"scope={scope}&"
        f"access_type=offline"
    )


def generate_github_oauth_url() -> str:
    """Generate GitHub OAuth authorization URL."""
    client_id = os.getenv("GITHUB_OAUTH_CLIENT_ID")
    redirect_uri = os.getenv("GITHUB_OAUTH_REDIRECT_URI", "http://localhost:3000/auth/github/callback")
    scope = "user:email"
    
    return (
        f"https://github.com/login/oauth/authorize?"
        f"client_id={client_id}&"
        f"redirect_uri={redirect_uri}&"
        f"scope={scope}"
    )


async def exchange_google_code(code: str, db: Session) -> Optional[Dict[str, Any]]:
    """Exchange Google authorization code for tokens and user info."""
    async with httpx.AsyncClient() as client:
        # Exchange code for tokens
        token_response = await client.post(
            "https://oauth2.googleapis.com/token",
            data={
                "client_id": os.getenv("GOOGLE_OAUTH_CLIENT_ID"),
                "client_secret": os.getenv("GOOGLE_OAUTH_CLIENT_SECRET"),
                "code": code,
                "grant_type": "authorization_code",
                "redirect_uri": os.getenv("GOOGLE_OAUTH_REDIRECT_URI", "http://localhost:3000/auth/google/callback"),
            },
        )
        
        if token_response.status_code != 200:
            return None
        
        tokens = token_response.json()
        
        # Get user info
        user_response = await client.get(
            "https://www.googleapis.com/oauth2/v1/userinfo",
            headers={"Authorization": f"Bearer {tokens['access_token']}"},
        )
        
        if user_response.status_code != 200:
            return None
        
        user_info = user_response.json()
        
        # Create or update user
        user = get_or_create_user(
            db,
            email=user_info["email"],
            name=user_info.get("name"),
            oauth_provider="google",
            oauth_id=user_info["id"],
        )
        
        # Create tokens
        access_token = create_access_token(user.id, user.email, user.role)
        refresh_token = create_refresh_token(db, user.id)
        
        return {
            "user": {
                "id": user.id,
                "email": user.email,
                "name": user.name,
                "role": user.role.value,
                "avatar_url": user_info.get("picture"),
            },
            "access_token": access_token,
            "refresh_token": refresh_token,
        }


async def exchange_github_code(code: str, db: Session) -> Optional[Dict[str, Any]]:
    """Exchange GitHub authorization code for tokens and user info."""
    async with httpx.AsyncClient() as client:
        # Exchange code for token
        token_response = await client.post(
            "https://github.com/login/oauth/access_token",
            data={
                "client_id": os.getenv("GITHUB_OAUTH_CLIENT_ID"),
                "client_secret": os.getenv("GITHUB_OAUTH_CLIENT_SECRET"),
                "code": code,
                "redirect_uri": os.getenv("GITHUB_OAUTH_REDIRECT_URI", "http://localhost:3000/auth/github/callback"),
            },
            headers={"Accept": "application/json"},
        )
        
        if token_response.status_code != 200:
            return None
        
        tokens = token_response.json()
        
        if "error" in tokens:
            return None
        
        # Get user info
        user_response = await client.get(
            "https://api.github.com/user",
            headers={"Authorization": f"Bearer {tokens['access_token']}"},
        )
        
        if user_response.status_code != 200:
            return None
        
        user_info = user_response.json()
        
        # Get email if needed
        email = user_info.get("email")
        if not email:
            emails_response = await client.get(
                "https://api.github.com/user/emails",
                headers={"Authorization": f"Bearer {tokens['access_token']}"},
            )
            if emails_response.status_code == 200:
                emails = emails_response.json()
                primary_email = next((e for e in emails if e["primary"]), None)
                if primary_email:
                    email = primary_email["email"]
        
        if not email:
            return None
        
        # Create or update user
        user = get_or_create_user(
            db,
            email=email,
            name=user_info.get("name") or user_info.get("login"),
            oauth_provider="github",
            oauth_id=str(user_info["id"]),
        )
        
        # Create tokens
        access_token = create_access_token(user.id, user.email, user.role)
        refresh_token = create_refresh_token(db, user.id)
        
        return {
            "user": {
                "id": user.id,
                "email": user.email,
                "name": user.name,
                "role": user.role.value,
                "avatar_url": user_info.get("avatar_url"),
            },
            "access_token": access_token,
            "refresh_token": refresh_token,
        }


def send_email_otp(db: Session, email: str) -> bool:
    """Send OTP to email for verification."""
    user = db.query(User).filter(User.email == email).first()
    
    if not user:
        user = User(email=email, name=email.split('@')[0])
        db.add(user)
        db.commit()
    
    # Generate OTP
    otp = generate_otp()
    expires_at = datetime.utcnow() + timedelta(minutes=10)
    
    user.otp_code = otp
    user.otp_expires_at = expires_at
    user.otp_verified = False
    db.commit()
    
    # Send email
    return send_otp_email(email, otp)


def verify_email_otp(db: Session, email: str, otp: str) -> Optional[Dict[str, Any]]:
    """Verify OTP and create session."""
    user = db.query(User).filter(User.email == email).first()
    
    if not user:
        return None
    
    # Check OTP validity
    if not user.otp_code or user.otp_code != otp:
        return None
    
    if user.otp_expires_at < datetime.utcnow():
        return None
    
    # Mark as verified
    user.is_verified = True
    user.otp_verified = True
    user.otp_code = None
    user.otp_expires_at = None
    user.last_login = datetime.utcnow()
    db.commit()
    
    # Create tokens
    access_token = create_access_token(user.id, user.email, user.role)
    refresh_token = create_refresh_token(db, user.id)
    
    return {
        "user": {
            "id": user.id,
            "email": user.email,
            "name": user.name,
            "role": user.role.value,
        },
        "access_token": access_token,
        "refresh_token": refresh_token,
    }
