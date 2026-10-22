from typing import Any, Dict, Optional

from fastapi import APIRouter, Depends, Query

from app.core.auth import require_admin
from app.services import admin_service

router = APIRouter(prefix="/admin", tags=["Admin (read-only)"])


@router.get("/overview", summary="Platform counts (admin only)")
async def overview(admin: Dict[str, Any] = Depends(require_admin)):
    return {"success": True, "data": await admin_service.get_overview(admin)}


@router.get("/users", summary="Parent / teacher / admin accounts (admin only)")
async def users(role: Optional[str] = Query(default=None), admin: Dict[str, Any] = Depends(require_admin)):
    return {"success": True, "data": await admin_service.list_users(admin, role)}


@router.get("/learners", summary="All child learner profiles (admin only)")
async def learners(admin: Dict[str, Any] = Depends(require_admin)):
    return {"success": True, "data": await admin_service.list_learners(admin)}


@router.get("/learners/{learner_id}", summary="Full technical detail for one child (admin only)")
async def learner_detail(
    learner_id: str,
    include_sensitive: bool = Query(default=False, description="Include ADHD information and SNAP-IV answers"),
    admin: Dict[str, Any] = Depends(require_admin),
):
    return {"success": True, "data": await admin_service.get_learner_detail(admin, learner_id, include_sensitive)}


@router.get("/audit-log", summary="Recent admin access log (admin only)")
async def audit_log(limit: int = Query(default=100, ge=1, le=500), admin: Dict[str, Any] = Depends(require_admin)):
    return {"success": True, "data": await admin_service.list_audit_log(admin, limit)}
