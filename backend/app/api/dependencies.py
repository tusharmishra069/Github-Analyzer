from fastapi import Depends, HTTPException, status
from sqlalchemy.orm import Session

# Note: These are placeholder imports
# In actual implementation, import from your project:
# from app.models.auth import User
# from app.database import get_db

async def get_current_user_from_token(token: str) -> dict:
    """
    Verify JWT token and return user data.
    TODO: Implement actual JWT verification
    """
    try:
        # TODO: Decode JWT token using jwt.decode()
        # Verify token signature and expiry
        # Return user data from token claims
        pass
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
        )

async def get_admin_user(
    # current_user: User = Depends(get_current_user),
) -> dict:
    """
    Verify that current user is an admin.
    Use this dependency in admin-only endpoints.
    
    Example:
        @router.get("/admin/data")
        async def get_admin_data(admin: User = Depends(get_admin_user)):
            ...
    """
    # TODO: Implement actual admin check
    # if current_user.role != "admin":
    #     raise HTTPException(
    #         status_code=status.HTTP_403_FORBIDDEN,
    #         detail="Admin access required",
    #     )
    # return current_user
    pass

async def get_regular_user(
    # current_user: User = Depends(get_current_user),
) -> dict:
    """
    Verify that current user is a regular user (not necessarily admin).
    Use this dependency to ensure user is authenticated.
    
    Example:
        @router.get("/user/profile")
        async def get_profile(user: User = Depends(get_regular_user)):
            ...
    """
    # TODO: Implement actual user check
    # if not current_user:
    #     raise HTTPException(
    #         status_code=status.HTTP_401_UNAUTHORIZED,
    #         detail="Authentication required",
    #     )
    # return current_user
    pass
