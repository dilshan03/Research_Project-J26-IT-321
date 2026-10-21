"""
FastAPI Service for Hint-Aware BKT Model
Port: 8004 (or runnable standalone)
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Optional
from bkt_model import HintAwareBKT

app = FastAPI(
    title="MathQuest Hint-Aware BKT Learner Model API",
    description="Probabilistic Knowledge Tracing service adapting to ADHD inattention and progressive hints.",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

bkt = HintAwareBKT(
    p_l0=0.20,
    p_t=0.15,
    p_g=0.25,
    p_s=0.18,
    gamma=0.85,
    alpha_slip=0.22,
    mastery_threshold=0.85
)

class BKTStepRequest(BaseModel):
    p_prior: float = Field(0.20, ge=0.0, le=1.0)
    is_correct: bool
    hint_level: int = Field(0, ge=0, le=4)
    inattention_index: float = Field(0.0, ge=0.0, le=1.0)
    is_attention_slip: bool = False
    rt_zscore: float = Field(0.0)
    memory_stability: float = Field(3.0, ge=0.5, le=60.0)
    elapsed_days: float = Field(0.0, ge=0.0)
    remaining_time_ms: Optional[float] = None
    camera_permission_granted: bool = False
    camera_attention_score: Optional[float] = Field(None, ge=0.0, le=1.0)

class Observation(BaseModel):
    is_correct: bool
    hint_level: int = 0
    inattention_index: float = 0.0
    camera_permission_granted: bool = False
    camera_attention_score: Optional[float] = None

class BKTTrajectoryRequest(BaseModel):
    observations: List[Observation]

@app.get("/health")
def health():
    return {
        "status": "ONLINE",
        "service": "Hint-Aware BKT Learner Model",
        "default_parameters": {
            "p_l0": bkt.p_l0,
            "p_t": bkt.p_t,
            "p_g": bkt.p_g,
            "p_s": bkt.p_s,
            "gamma": bkt.gamma,
            "alpha_slip": bkt.alpha_slip,
            "mastery_threshold": bkt.mastery_threshold
        }
    }

@app.post("/bkt/step")
def update_step(req: BKTStepRequest):
    try:
        fusion = bkt.fuse_attention_signals(
            gameplay_inattention_index=req.inattention_index,
            rt_zscore=req.rt_zscore,
            remaining_time_ms=req.remaining_time_ms,
            camera_permission_granted=req.camera_permission_granted,
            camera_attention_score=req.camera_attention_score
        )
        result = bkt.update_step(
            p_prior=req.p_prior,
            is_correct=req.is_correct,
            hint_level=req.hint_level,
            inattention_index=fusion["fused_inattention_index"],
            is_attention_slip=req.is_attention_slip,
            rt_zscore=req.rt_zscore,
            memory_stability=req.memory_stability,
            elapsed_days=req.elapsed_days
        )
        result["attention_fusion"] = fusion
        return {"success": True, "result": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/bkt/trajectory")
def predict_trajectory(req: BKTTrajectoryRequest):
    try:
        obs = [(o.is_correct, o.hint_level, o.inattention_index) for o in req.observations]
        trajectory = bkt.predict_sequence(obs)
        return {
            "success": True,
            "steps_count": len(trajectory),
            "final_knowledge": trajectory[-1]['updated_knowledge'] if trajectory else bkt.p_l0,
            "is_mastered": trajectory[-1]['is_mastered'] if trajectory else False,
            "trajectory": trajectory
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == '__main__':
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8004)
