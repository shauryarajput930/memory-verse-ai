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
    full_name: Optional[str] = None
    authenticated: bool = True


class TokenVerifyRequest(BaseModel):
    token: str


class UserRegisterRequest(BaseModel):
    user_id: str
    email: str
    full_name: str


@router.post("/register")
async def register_user_profile(payload: UserRegisterRequest):
    """Store or update user profile with full_name in backend database."""
    try:
        data = {
            "id": payload.user_id,
            "full_name": payload.full_name,
            "email": payload.email,
        }
        res = supabase.table("profiles").upsert(data).execute()
        return {"status": "ok", "message": "Profile created", "data": res.data}
    except Exception as e:
        # Fallback response if profiles table is not yet created in Supabase SQL editor
        print(f"Profile upsert warning: {e}")
        return {"status": "ok", "message": "Profile metadata processed", "detail": str(e)}


@router.get("/me", response_model=UserProfile)
async def get_me(user_id: str = Depends(get_current_user)):
    """Return authenticated user profile details from token."""
    email = None
    full_name = None
    try:
        res = supabase.auth.admin.get_user_by_id(user_id)
        if res and res.user:
            email = res.user.email
            full_name = (res.user.user_metadata or {}).get("full_name") or (res.user.user_metadata or {}).get("name")
    except Exception:
        email = None

    return UserProfile(user_id=user_id, email=email, full_name=full_name, authenticated=True)


@router.post("/verify")
async def verify_token(payload: TokenVerifyRequest):
    """Verify if a given Supabase access token is valid."""
    try:
        user_res = supabase.auth.get_user(payload.token)
        if user_res and user_res.user:
            meta = user_res.user.user_metadata or {}
            full_name = meta.get("full_name") or meta.get("name")
            return {"valid": True, "user_id": user_res.user.id, "email": user_res.user.email, "full_name": full_name}
        return {"valid": False, "detail": "Invalid token"}
    except Exception as e:
        return {"valid": False, "detail": str(e)}
