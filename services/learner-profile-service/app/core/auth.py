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
        "role": user_doc.get("role", "parent"),
        "username": user_doc.get("username"),
    }


async def require_parent(current_user: Dict[str, Any] = Depends(get_current_user)) -> Dict[str, Any]:
    """
    Enforces that the authenticated user has the 'parent' role.
    Teachers or other roles attempting parent-only operations receive HTTP 403 Forbidden.
    """
    if current_user.get("role") != "parent":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access restricted: Only registered parent accounts can create or modify child learner profiles.",
        )
    return current_user
