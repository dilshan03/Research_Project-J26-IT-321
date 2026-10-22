from typing import Any, Dict

from fastapi import APIRouter, Depends

from app.core.auth import require_research_access
from app.services import research_analytics_service as research

# Read-only; no prediction endpoint exists here. Requires the admin role AND researchAnalyticsAccess: true.
router = APIRouter(prefix="/admin/research", tags=["Admin research analytics (read-only)"])


@router.get("/access", summary="Whether this account may open research analytics (no data returned)")
async def access(admin: Dict[str, Any] = Depends(require_research_access)):
    return {"success": True, "data": {"granted": True}}


@router.get("/components", summary="Registered research components and snapshot status")
async def components(admin: Dict[str, Any] = Depends(require_research_access)):
    return {"success": True, "data": await research.list_components(admin)}


@router.get("/components/{component_id}", summary="Sanitized research snapshot for one component")
async def component(component_id: str, admin: Dict[str, Any] = Depends(require_research_access)):
    return {"success": True, "data": await research.get_component(admin, component_id)}


@router.get("/learner-profile/live-summary", summary="Aggregate live ELP-X / IMPSA / IMLR counts (suppressed < 5)")
async def live_summary(admin: Dict[str, Any] = Depends(require_research_access)):
    return {"success": True, "data": await research.live_summary(admin)}
