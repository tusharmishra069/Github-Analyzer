"""Authentication service module."""

import os
import logging
import secrets
import string
import hashlib
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from urllib.parse import urlencode

import jwt
import httpx
from sqlalchemy.orm import Session

from app.models.auth import AuthIdentity, EmailOTP, RefreshToken, User, UserRole

logger = logging.getLogger(__name__)

# JWT Configuration
JWT_SECRET = os.getenv("JWT_SECRET_KEY", "your-secret-key-change-in-production")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
JWT_ACCESS_EXPIRATION = int(os.getenv("JWT_ACCESS_EXPIRATION", 3600))  # 1 hour
JWT_REFRESH_EXPIRATION = int(os.getenv("JWT_REFRESH_EXPIRATION", 604800))  # 7 days


def generate_otp(length: int = 6) -> str:
    """Generate random OTP code."""
    return ''.join(secrets.choice(string.digits) for _ in range(length))


def hash_value(value: str) -> str:
    """Hash sensitive values like refresh tokens and OTPs."""
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


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
    """Create refresh token and store hashed in database."""
    token = secrets.token_urlsafe(32)
    expires_at = datetime.utcnow() + timedelta(seconds=JWT_REFRESH_EXPIRATION)

    refresh_token = RefreshToken(
        user_id=user_id,
        token_hash=hash_value(token),
        expires_at=expires_at,
        revoked_at=None,
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


def get_or_create_user(
    db: Session,
    email: str,
    name: Optional[str] = None,
    oauth_provider: Optional[str] = None,
    oauth_id: Optional[str] = None,
) -> User:
    """Get existing user or create new one."""
    user = None

    if oauth_provider and oauth_id:
        identity = (
            db.query(AuthIdentity)
            .filter(
                AuthIdentity.provider == oauth_provider,
                AuthIdentity.provider_user_id == oauth_id,
            )
            .first()
        )
        if identity:
            user = db.query(User).filter(User.id == identity.user_id).first()

    if not user:
        user = db.query(User).filter(User.email == email).first()

    if not user:
        user = User(
            email=email,
            name=name or email.split('@')[0],
            is_verified=True if oauth_provider else False,
            role=UserRole.USER,
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    if oauth_provider and oauth_id:
        existing_identity = (
            db.query(AuthIdentity)
            .filter(
                AuthIdentity.provider == oauth_provider,
                AuthIdentity.provider_user_id == oauth_id,
            )
            .first()
        )
        if not existing_identity:
            identity = AuthIdentity(
                user_id=user.id,
                provider=oauth_provider,
                provider_user_id=oauth_id,
                provider_email=email,
                last_login=datetime.utcnow(),
            )
            db.add(identity)
            db.commit()

    return user


def generate_google_oauth_url() -> str:
    """Generate Google OAuth authorization URL."""
    client_id = os.getenv("GOOGLE_CLIENT_ID") or os.getenv("GOOGLE_OAUTH_CLIENT_ID")
    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000")
    redirect_uri = os.getenv("GOOGLE_REDIRECT_URI") or os.getenv(
        "GOOGLE_OAUTH_REDIRECT_URI",
        f"{frontend_url}/auth/callback?provider=google",
    )
    params = {
        "client_id": client_id,
        "redirect_uri": redirect_uri,
        "response_type": "code",
        "scope": "openid profile email",
        "access_type": "offline",
        "prompt": "consent",
    }
    return f"https://accounts.google.com/o/oauth2/v2/auth?{urlencode(params)}"


def generate_github_oauth_url() -> str:
    """Generate GitHub OAuth authorization URL."""
    client_id = os.getenv("GITHUB_CLIENT_ID") or os.getenv("GITHUB_OAUTH_CLIENT_ID")
    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000")
    redirect_uri = os.getenv("GITHUB_REDIRECT_URI") or os.getenv(
        "GITHUB_OAUTH_REDIRECT_URI",
        f"{frontend_url}/auth/callback?provider=github",
    )
    params = {
        "client_id": client_id,
        "redirect_uri": redirect_uri,
        "scope": "user:email",
    }
    return f"https://github.com/login/oauth/authorize?{urlencode(params)}"


async def exchange_google_code(code: str, db: Session) -> Optional[Dict[str, Any]]:
    """Exchange Google authorization code for tokens and user info."""
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            # Exchange code for tokens
            token_response = await client.post(
                "https://oauth2.googleapis.com/token",
                data={
                    "client_id": os.getenv("GOOGLE_CLIENT_ID") or os.getenv("GOOGLE_OAUTH_CLIENT_ID"),
                    "client_secret": os.getenv("GOOGLE_CLIENT_SECRET") or os.getenv("GOOGLE_OAUTH_CLIENT_SECRET"),
                    "code": code,
                    "grant_type": "authorization_code",
                    "redirect_uri": os.getenv("GOOGLE_REDIRECT_URI")
                    or os.getenv("GOOGLE_OAUTH_REDIRECT_URI", "http://localhost:3000/auth/callback?provider=google"),
                },
            )

            if token_response.status_code != 200:
                logger.warning("Google OAuth token exchange failed: %s", token_response.text)
                return None

            tokens = token_response.json()
            if "access_token" not in tokens:
                logger.warning("Google OAuth token response missing access_token: %s", tokens)
                return None

            # Get user info
            user_response = await client.get(
                "https://www.googleapis.com/oauth2/v1/userinfo",
                headers={"Authorization": f"Bearer {tokens['access_token']}"},
            )

            if user_response.status_code != 200:
                logger.warning("Google OAuth userinfo failed: %s", user_response.text)
                return None

            user_info = user_response.json()
            if "email" not in user_info or "id" not in user_info:
                logger.warning("Google OAuth userinfo missing fields: %s", user_info)
                return None

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
    except Exception as exc:
        logger.exception("Google OAuth exchange failed: %s", exc)
        return None


async def exchange_github_code(code: str, db: Session) -> Optional[Dict[str, Any]]:
    """Exchange GitHub authorization code for tokens and user info."""
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            # Exchange code for token
            token_response = await client.post(
                "https://github.com/login/oauth/access_token",
                data={
                    "client_id": os.getenv("GITHUB_CLIENT_ID") or os.getenv("GITHUB_OAUTH_CLIENT_ID"),
                    "client_secret": os.getenv("GITHUB_CLIENT_SECRET") or os.getenv("GITHUB_OAUTH_CLIENT_SECRET"),
                    "code": code,
                    "redirect_uri": os.getenv("GITHUB_REDIRECT_URI")
                    or os.getenv("GITHUB_OAUTH_REDIRECT_URI", "http://localhost:3000/auth/callback?provider=github"),
                },
                headers={"Accept": "application/json"},
            )

            if token_response.status_code != 200:
                logger.warning("GitHub OAuth token exchange failed: %s", token_response.text)
                return None

            tokens = token_response.json()

            if "error" in tokens or "access_token" not in tokens:
                logger.warning("GitHub OAuth token response error: %s", tokens)
                return None

            # Get user info
            user_response = await client.get(
                "https://api.github.com/user",
                headers={"Authorization": f"Bearer {tokens['access_token']}"},
            )

            if user_response.status_code != 200:
                logger.warning("GitHub OAuth userinfo failed: %s", user_response.text)
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

            if not email or "id" not in user_info:
                logger.warning("GitHub OAuth userinfo missing fields: %s", user_info)
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
    except Exception as exc:
        logger.exception("GitHub OAuth exchange failed: %s", exc)
        return None


def send_email_otp(db: Session, email: str) -> bool:
    """Send OTP to email for verification."""
    user = db.query(User).filter(User.email == email).first()
    
    if not user:
        user = User(email=email, name=email.split('@')[0])
        db.add(user)
        db.commit()
        db.refresh(user)
    
    # Generate OTP
    otp = generate_otp()
    expires_at = datetime.utcnow() + timedelta(minutes=10)

    otp_entry = EmailOTP(
        email=email,
        code_hash=hash_value(otp),
        expires_at=expires_at,
        used_at=None,
    )
    db.add(otp_entry)
    db.commit()
    
    # Send email
    return send_otp_email(email, otp)


def verify_email_otp(db: Session, email: str, otp: str) -> Optional[Dict[str, Any]]:
    """Verify OTP and create session."""
    user = db.query(User).filter(User.email == email).first()
    
    if not user:
        return None

    otp_entry = (
        db.query(EmailOTP)
        .filter(
            EmailOTP.email == email,
            EmailOTP.used_at.is_(None),
            EmailOTP.expires_at >= datetime.utcnow(),
        )
        .order_by(EmailOTP.created_at.desc())
        .first()
    )

    if not otp_entry:
        return None

    if otp_entry.code_hash != hash_value(otp):
        return None

    otp_entry.used_at = datetime.utcnow()
    user.is_verified = True
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


def verify_refresh_token(db: Session, refresh_token: str) -> Optional[User]:
    """Validate refresh token and return user."""
    token_hash = hash_value(refresh_token)
    token_entry = (
        db.query(RefreshToken)
        .filter(
            RefreshToken.token_hash == token_hash,
            RefreshToken.revoked_at.is_(None),
            RefreshToken.expires_at >= datetime.utcnow(),
        )
        .first()
    )

    if not token_entry:
        return None

    return db.query(User).filter(User.id == token_entry.user_id).first()


def revoke_refresh_token(db: Session, refresh_token: str) -> bool:
    """Revoke a refresh token."""
    token_hash = hash_value(refresh_token)
    token_entry = db.query(RefreshToken).filter(RefreshToken.token_hash == token_hash).first()

    if not token_entry:
        return False

    token_entry.revoked_at = datetime.utcnow()
    db.commit()
    return True
