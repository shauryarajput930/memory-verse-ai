"""
Module Auth — User Session & Token Verification
GET /api/auth/me — Returns authenticated user metadata
POST /api/auth/verify — Validates bearer token
"""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from config import supabase
from dependencies import get_current_user

router = APIRouter(prefix="/api/auth", tags=["auth"])


class UserProfile(BaseModel):
    user_id: str
    email: Optional[str] = None
    authenticated: bool = True


class TokenVerifyRequest(BaseModel):
    token: str


@router.get("/me", response_model=UserProfile)
async def get_me(user_id: str = Depends(get_current_user)):
    """Return authenticated user profile details from token."""
    try:
        res = supabase.auth.admin.get_user_by_id(user_id)
        email = res.user.email if res and res.user else None
    except Exception:
        email = None

    return UserProfile(user_id=user_id, email=email, authenticated=True)


@router.post("/verify")
async def verify_token(payload: TokenVerifyRequest):
    """Verify if a given Supabase access token is valid."""
    try:
        user_res = supabase.auth.get_user(payload.token)
        if user_res and user_res.user:
            return {"valid": True, "user_id": user_res.user.id, "email": user_res.user.email}
        return {"valid": False, "detail": "Invalid token"}
    except Exception as e:
        return {"valid": False, "detail": str(e)}
