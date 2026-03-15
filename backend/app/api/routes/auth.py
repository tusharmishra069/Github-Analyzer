"""Authentication API routes."""

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.services.auth_service import (
    generate_google_oauth_url,
    generate_github_oauth_url,
    exchange_google_code,
    exchange_github_code,
    send_email_otp,
    verify_email_otp,
    verify_token,
)
from pydantic import BaseModel

router = APIRouter(prefix="/api/auth", tags=["auth"])


class OAuthStartRequest(BaseModel):
    provider: str  # 'google' or 'github'


class OAuthCallbackRequest(BaseModel):
    code: str


class EmailOTPRequest(BaseModel):
    email: str


class VerifyOTPRequest(BaseModel):
    email: str
    otp: str


class RefreshTokenRequest(BaseModel):
    refresh_token: str


@router.get("/oauth/google")
async def google_oauth_start():
    """Start Google OAuth flow."""
    return {"url": generate_google_oauth_url()}


@router.get("/oauth/github")
async def github_oauth_start():
    """Start GitHub OAuth flow."""
    return {"url": generate_github_oauth_url()}


@router.post("/oauth/google/callback")
async def google_oauth_callback(request: OAuthCallbackRequest, db: Session = Depends(get_db)):
    """Handle Google OAuth callback."""
    result = await exchange_google_code(request.code, db)
    
    if not result:
        raise HTTPException(status_code=400, detail="Failed to authenticate with Google")
    
    return {
        "success": True,
        "user": result["user"],
        "access_token": result["access_token"],
        "refresh_token": result["refresh_token"],
    }


@router.post("/oauth/github/callback")
async def github_oauth_callback(request: OAuthCallbackRequest, db: Session = Depends(get_db)):
    """Handle GitHub OAuth callback."""
    result = await exchange_github_code(request.code, db)
    
    if not result:
        raise HTTPException(status_code=400, detail="Failed to authenticate with GitHub")
    
    return {
        "success": True,
        "user": result["user"],
        "access_token": result["access_token"],
        "refresh_token": result["refresh_token"],
    }


@router.post("/email/send-otp")
async def email_send_otp(request: EmailOTPRequest, db: Session = Depends(get_db)):
    """Send OTP to email."""
    success = send_email_otp(db, request.email)
    
    if not success:
        raise HTTPException(status_code=500, detail="Failed to send OTP")
    
    return {
        "success": True,
        "message": f"OTP sent to {request.email}",
    }


@router.post("/email/verify-otp")
async def email_verify_otp(request: VerifyOTPRequest, db: Session = Depends(get_db)):
    """Verify OTP and create session."""
    result = verify_email_otp(db, request.email, request.otp)
    
    if not result:
        raise HTTPException(status_code=400, detail="Invalid or expired OTP")
    
    return {
        "success": True,
        "user": result["user"],
        "access_token": result["access_token"],
        "refresh_token": result["refresh_token"],
    }


@router.post("/refresh")
async def refresh_access_token(request: RefreshTokenRequest, db: Session = Depends(get_db)):
    """Refresh access token using refresh token."""
    # TODO: Implement refresh token validation
    raise HTTPException(status_code=501, detail="Not implemented")


@router.post("/logout")
async def logout(authorization: str = None):
    """Logout user."""
    return {"success": True, "message": "Logged out successfully"}


@router.get("/me")
async def get_current_user(authorization: str = None):
    """Get current user info."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid token")
    
    token = authorization.substring(7)
    payload = verify_token(token)
    
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    
    return {
        "id": payload.get("sub"),
        "email": payload.get("email"),
        "role": payload.get("role"),
    }
