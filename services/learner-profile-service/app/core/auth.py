from datetime import datetime, timezone
from typing import Optional, Dict, Any
from bson import ObjectId
from fastapi import Request, HTTPException, status, Depends
from app.config import AUTH_COOKIE_NAME
from app.db.mongodb import get_sessions_collection, get_users_collection


async def get_current_user(request: Request) -> Dict[str, Any]:
    """
    Extracts and securely validates the session token against MongoDB Atlas sessions.
    Derives the authenticated user ID and role directly from the verified session.
    Never trusts client-supplied parentId or role parameters.
    """
    # 1. Check HTTP-only cookie first (standard web browser flow)
    session_id: Optional[str] = request.cookies.get(AUTH_COOKIE_NAME)

    # 2. Check Authorization header as fallback (Bearer token for API testing / mobile)
    if not session_id:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            session_id = auth_header.split(" ", 1)[1].strip()

    if not session_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Please sign in to access learner profiles.",
        )

    sessions_col = get_sessions_collection()
    users_col = get_users_collection()

    now = datetime.now(timezone.utc)
    # Query active, unexpired session
    session_doc = await sessions_col.find_one({
        "sessionId": session_id,
        "expiresAt": {"$gt": now},
    })

    if not session_doc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session is invalid or has expired. Please sign in again.",
        )

    user_id = session_doc.get("userId")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session has no associated user.",
        )

    # Normalize user_id to ObjectId if it's a string
    try:
        user_object_id = ObjectId(user_id) if isinstance(user_id, str) else user_id
    except Exception:
        user_object_id = user_id

    user_doc = await users_col.find_one({"_id": user_object_id})
    if not user_doc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Associated user account was not found.",
        )

    return {
        "id": str(user_doc["_id"]),
        "email": user_doc.get("email"),
        "fullName": user_doc.get("fullName"),
        # No default: a missing or unknown role must never be treated as 'parent'.
        "role": user_doc.get("role"),
        "username": user_doc.get("username"),
    }


async def require_parent(current_user: Dict[str, Any] = Depends(get_current_user)) -> Dict[str, Any]:
    """
    Enforces that the authenticated user has the 'parent' role.
    Teachers, missing roles and any other role receive HTTP 403 Forbidden (deny by default).
    Teachers remain excluded from learner data until teacher-learner assignment exists.
    """
    if current_user.get("role") != "parent":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access restricted: Only registered parent accounts can create or modify child learner profiles.",
        )
    return current_user


async def require_admin(current_user: Dict[str, Any] = Depends(get_current_user)) -> Dict[str, Any]:
    """
    Enforces the 'admin' role (set manually on the user document; it cannot be self-registered).
    Every other role, including parents and teachers, receives HTTP 403 Forbidden.
    """
    if current_user.get("role") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access restricted: Administrator accounts only.",
        )
    return current_user


async def require_research_access(admin: Dict[str, Any] = Depends(require_admin)) -> Dict[str, Any]:
    """
    Research & Model Analytics: the 'admin' role AND `researchAnalyticsAccess: true` on the user document.
    The flag is granted manually per account (it is never self-assignable) and applies to research analytics
    only; ordinary admin pages keep using `require_admin`. Anything other than boolean true is refused.
    """
    try:
        user_object_id = ObjectId(admin["id"])
    except Exception:
        user_object_id = admin["id"]
    user_doc = await get_users_collection().find_one({"_id": user_object_id})
    if not user_doc or user_doc.get("researchAnalyticsAccess") is not True:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access restricted: research analytics access has not been granted to this administrator account.",
        )
    return admin
