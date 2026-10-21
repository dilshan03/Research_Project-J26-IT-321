"""
Schema for sanitized research snapshots (MQ-RESEARCH-SNAPSHOT-v1) served to the admin Research & Model
Analytics dashboard. A snapshot that does not validate is never served.

The envelope is shared by all four research components, so each owner can register their own outputs.
Component-specific sections are validated here for the Learner Profile & Prediction Engine only.
"""

from typing import Any, Dict, List, Literal, Optional

from pydantic import BaseModel, ConfigDict, Field

SNAPSHOT_SCHEMA_VERSION = "MQ-RESEARCH-SNAPSHOT-v1"

Provenance = Literal["live", "offline_survey", "hypothetical", "simulated", "synthetic", "software_test",
                     "documentation"]
ModelStatus = Literal["IMPLEMENTED", "OFFLINE_EXPERIMENT", "PROTOTYPE", "PROVISIONAL", "PLANNED", "NOT_IMPLEMENTED"]


class _Strict(BaseModel):
    model_config = ConfigDict(extra="forbid")


class _Open(BaseModel):
    model_config = ConfigDict(extra="allow")


class SnapshotSource(_Strict):
    id: str
    path: str = Field(pattern=r"^[A-Za-z0-9_.\-]+(/[A-Za-z0-9_.\-]+)*$")  # repository-relative only
    sha256: str = Field(pattern=r"^[0-9A-F]{64}$")
    provenance: Provenance


class SnapshotGenerator(_Strict):
    script: str
    version: str


class ModelEntry(_Strict):
    id: str
    name: str
    family: Optional[str] = None
    version: Optional[str] = None
    status: ModelStatus
    provenance: Provenance
    description: str
    location: Optional[str] = None


class SuiteOutcome(_Strict):
    test: str
    outcome: Literal["passed", "failed", "error", "skipped"]


class SoftwareTestRun(_Strict):
    suite: str
    kind: Literal["software_test"]
    command: str
    ranAtUtc: str
    status: Literal["PASSED", "FAILED", "NOT_RUN"]
    testsRun: int = Field(ge=0)
    passed: int = Field(ge=0)
    failed: int = Field(ge=0)
    errors: int = Field(ge=0)
    skipped: int = Field(ge=0)
    results: List[SuiteOutcome]
    note: Optional[str] = None


class ResearchSnapshot(_Strict):
    schemaVersion: Literal["MQ-RESEARCH-SNAPSHOT-v1"]
    componentId: str = Field(pattern=r"^[a-z0-9\-]+$")
    componentTitle: str
    generatedAtUtc: str
    generator: SnapshotGenerator
    sources: List[SnapshotSource]
    models: List[ModelEntry]
    sections: Dict[str, Any]


# --- Learner Profile & Prediction Engine sections ---------------------------------------------------------------

class NschHypothetical(_Open):
    provenance: Literal["hypothetical"]
    probability: float = Field(ge=0.0, le=1.0)
    threshold: float = Field(ge=0.0, le=1.0)
    features: List[Dict[str, Any]]


class NschShapHypothetical(_Open):
    provenance: Literal["hypothetical"]
    available: bool


class NschShapGlobal(_Open):
    provenance: Literal["offline_survey"]
    available: bool


class NschSection(_Open):
    provenance: Literal["offline_survey"]
    experimentId: str
    disclaimer: str
    testYear: int
    testYearUsedForTrainingOrSelection: Literal[False]
    selectedModel: Dict[str, Any]
    decisionThreshold: Dict[str, Any]
    validation: Dict[str, Any]
    test: Dict[str, Any]
    evaluationLog: Dict[str, Any]
    hypotheticalExample: NschHypothetical
    shapHypothetical: NschShapHypothetical
    shapGlobal: NschShapGlobal


class MqRecScenario(_Open):
    id: str
    provenance: Literal["synthetic"]
    description: str
    input: Dict[str, Any]
    output: Dict[str, Any]


class MqRecSection(_Open):
    provenance: Literal["synthetic"]
    rulesetVersion: str
    rules: List[Dict[str, Any]]
    scenarios: List[MqRecScenario]


class ElpxSimulated(_Open):
    provenance: Literal["simulated"]


class ElpxSection(_Open):
    algorithmVersion: str
    recommendationRulesetVersion: str
    strategyCatalogue: List[Dict[str, Any]]
    simulated: ElpxSimulated


class LearnerProfileSections(_Strict):
    nsch: NschSection
    mqRec: MqRecSection
    elpx: ElpxSection
    softwareTests: List[SoftwareTestRun]


COMPONENT_SECTION_SCHEMAS = {"learner-profile": LearnerProfileSections}
