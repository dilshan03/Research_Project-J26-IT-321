"""
Export the sanitized Learner Profile & Prediction Engine research snapshot for the admin dashboard.

    cd research/recommendation_engine
    ml_experiments\\.venv\\Scripts\\python.exe -m research_export.export_snapshot

What it reads (all already produced and verified elsewhere):
  - NSCH K2Q31A baseline: metadata, validation metrics, the single saved 2025 evaluation, evaluation log
    (the frozen model is loaded only after its SHA-256 matches metadata; it is never refitted)
  - NSCH SHAP: the hypothetical example, plus aggregate importance over the 2023-2024 VALIDATION partition
    (development data only; the 2025 file is never opened by this script)
  - MQ-REC v0.1: rule registry, evidence references and the eight synthetic scenarios run through the evaluator
  - ELP-X v1.0: simulated benchmark experiments A-C (deterministic) and the ELP-X-REC strategy catalogue
  - Software test suites (MQ-REC, NSCH), run in separate processes

What it never writes: raw survey rows, respondent identifiers, model binaries, SHAP background data, absolute
paths, test tracebacks or any MathQuest learner data. The output is checked by `assert_sanitized` before saving.
"""

from __future__ import annotations

import argparse
import hashlib
import importlib.util
import json
import re
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List

SCHEMA_VERSION = "MQ-RESEARCH-SNAPSHOT-v1"
EXPORTER_VERSION = "1.0.0"

HERE = Path(__file__).resolve().parent
REC_ROOT = HERE.parent                                   # research/recommendation_engine
REPO_ROOT = REC_ROOT.parents[1]
ML_ROOT = REC_ROOT / "ml_experiments"
SERVICE_ROOT = REPO_ROOT / "services" / "learner-profile-service"
DEFAULT_OUTPUT = SERVICE_ROOT / "app" / "research_snapshots" / "learner-profile.json"

# Keys and tokens that must never appear in a snapshot (respondent identifiers, design variables, personal data)
FORBIDDEN_KEYS = {"learnerid", "parentid", "firstname", "lastname", "fullname", "email", "username", "hhid", "fipsst",
                  "stratum", "fwc", "passwordhash", "sessionid"}
FORBIDDEN_TOKENS = re.compile(r"\b(HHID|FIPSST|STRATUM|FWC)\b")
ABSOLUTE_PATH = re.compile(r"(^[A-Za-z]:[\\/])|([\\/](Users|home)[\\/])")
BINARY_SUFFIXES = (".joblib", ".pkl", ".npz", ".csv")

for p in (str(ML_ROOT), str(REC_ROOT)):
    if p not in sys.path:
        sys.path.insert(0, p)


# --------------------------------------------------------------------------------------------------------------
# Helpers
# --------------------------------------------------------------------------------------------------------------

def sha256(path: Path) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest().upper()


def rel(path: Path) -> str:
    return path.resolve().relative_to(REPO_ROOT).as_posix()


def read_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


class Sources:
    """Every file the snapshot is derived from, with its hash, so a reader can check the snapshot is current."""

    def __init__(self):
        self.items: List[Dict[str, str]] = []

    def add(self, source_id: str, path: Path, provenance: str) -> Path:
        self.items.append({"id": source_id, "path": rel(path), "sha256": sha256(path), "provenance": provenance})
        return path


def assert_sanitized(value: Any, where: str = "$") -> None:
    """Raises ValueError if the snapshot contains identifiers, absolute paths or references to binary/raw files."""
    if isinstance(value, dict):
        for k, v in value.items():
            if str(k).lower() in FORBIDDEN_KEYS:
                raise ValueError(f"Forbidden key {k!r} at {where}")
            assert_sanitized(v, f"{where}.{k}")
    elif isinstance(value, list):
        for i, v in enumerate(value):
            assert_sanitized(v, f"{where}[{i}]")
    elif isinstance(value, str):
        if ABSOLUTE_PATH.search(value):
            raise ValueError(f"Absolute path at {where}")
        if FORBIDDEN_TOKENS.search(value):
            raise ValueError(f"Identifier/design variable name at {where}")
        if value.lower().endswith(BINARY_SUFFIXES):
            raise ValueError(f"Reference to a binary or raw data file at {where}")


def run_suite(name: str, command: str, start_dir: Path, top_dir: Path, pattern: str = "test*.py") -> Dict[str, Any]:
    started = datetime.now(timezone.utc).isoformat(timespec="seconds")
    proc = subprocess.run([sys.executable, str(HERE / "run_tests.py"), str(start_dir), str(top_dir), pattern],
                          cwd=str(top_dir), capture_output=True, text=True, encoding="utf-8")
    base = {"suite": name, "kind": "software_test", "command": command, "ranAtUtc": started}
    try:
        summary = json.loads(proc.stdout.strip().splitlines()[-1])
    except (IndexError, json.JSONDecodeError):
        return {**base, "status": "NOT_RUN", "testsRun": 0, "passed": 0, "failed": 0, "errors": 0, "skipped": 0,
                "results": [], "note": "The suite could not be started in this environment."}
    ok = summary["failed"] == 0 and summary["errors"] == 0
    return {**base, "status": "PASSED" if ok else "FAILED", **summary}


# --------------------------------------------------------------------------------------------------------------
# NSCH K2Q31A baseline (offline survey experiment)
# --------------------------------------------------------------------------------------------------------------

def nsch_section(sources: Sources) -> Dict[str, Any]:
    from sklearn.model_selection import train_test_split

    from nsch_baseline import config, data, demo
    from nsch_baseline.preprocessing import source_feature

    art = config.ARTIFACT_DIR
    meta = read_json(sources.add("nsch.metadata", art / "metadata.json", "offline_survey"))
    validation = read_json(sources.add("nsch.validation", art / "validation_metrics.json", "offline_survey"))
    test = read_json(sources.add("nsch.test2025", art / "test_metrics_2025.json", "offline_survey"))
    log_path = sources.add("nsch.evaluationLog", art / "evaluation_log.jsonl", "offline_survey")
    log = [json.loads(line) for line in log_path.read_text(encoding="utf-8").splitlines() if line.strip()]
    labels = read_json(sources.add("nsch.featureLabels", Path(demo.__file__).with_name("feature_labels.json"),
                                   "documentation"))["features"]
    hyp_path = sources.add("nsch.hypothetical", ML_ROOT / "examples" / "hypothetical_child.json", "hypothetical")

    if test["model_sha256"] != meta["model_sha256"]:
        raise RuntimeError("Saved 2025 evaluation does not belong to the frozen model.")
    pipe, _ = demo.load_frozen()                      # verifies the model hash; nothing is refitted

    def label(f: str) -> str:
        return labels[f]["label"]

    def meaning(f: str, v: str) -> Any:
        return None if v in ("", "nan", "None") else labels[f]["codes"].get(v)

    threshold = meta["decision_threshold"]["value"]

    # Hypothetical example: prediction and verified SHAP explanation
    X_h, _ = demo.hypothetical(hyp_path)
    p_h = float(pipe.predict_proba(X_h)[0, 1])
    row = X_h.iloc[0]
    explanation, message = demo.explain(pipe, X_h)
    hyp_features = [{"feature": f, "label": label(f), "value": str(row[f]) or None, "meaning": meaning(f, str(row[f]))}
                    for f in config.FEATURES]
    shap_h: Dict[str, Any] = {"provenance": "hypothetical", "available": explanation is not None, "message": message}
    if explanation:
        contribs = sorted(explanation["contributions"].items(), key=lambda kv: -abs(kv[1]))
        shap_h.update({
            "method": "SHAP LinearExplainer (Independent masker, 200 training-partition background rows)",
            "scale": explanation["scale"],
            "baseValue": explanation["base_value"],
            "modelOutput": explanation["model_output"],
            "reconstructed": explanation["reconstructed"],
            "additivityAbsError": abs(explanation["reconstructed"] - explanation["model_output"]),
            "contributions": [{"feature": f, "label": label(f), "value": str(row[f]) or None,
                               "meaning": meaning(f, str(row[f])), "contribution": v} for f, v in contribs],
        })

    # Aggregate SHAP importance on the development VALIDATION partition (same split as training; 2025 not opened)
    X, y, years, _ = data.load_development()
    strata = years.to_numpy() + "_" + y.astype(str)
    _, X_va, _, _ = train_test_split(X, y, test_size=config.VALIDATION_FRACTION, stratify=strata,
                                     random_state=config.SEED)
    if len(X_va) != meta["n"]["validation"]:
        raise RuntimeError("Re-created validation partition does not match the frozen metadata.")
    shap_g = global_shap(pipe, X_va, source_feature, label)

    numeric, categorical = meta["features"]["numeric"], meta["features"]["categorical"]
    exclusions = {
        "outcomeAndFollowUps": len(config.OUTCOME_VARIABLES),
        "designAndIdentifiers": len(config.DESIGN_AND_IDENTIFIERS),
        "directProxies": len(config.L1_DIRECT_PROXIES),
        "servicesAndTreatment": len(config.L2_SERVICES_TREATMENT),
        "coDiagnoses": len(config.L3_CODIAGNOSES),
        "contemporaneousBehaviourAndSchool": len(config.TIER_B_CONTEMPORANEOUS),
    }
    sel = validation["selected"]
    return {
        "provenance": "offline_survey",
        "experimentId": meta["experiment_id"],
        "outcome": meta["outcome"],
        "disclaimer": meta["disclaimer"],
        "population": meta["population"],
        "developmentYears": meta["development_years"],
        "testYear": meta["test_year"],
        "testYearUsedForTrainingOrSelection": meta["test_year_used_for_training_or_selection"],
        "frozenAtUtc": meta["frozen_at_utc"],
        "evaluatedAtUtc": test["evaluated_at_utc"],
        "modelSha256": meta["model_sha256"],
        "seed": meta["seed"],
        "libraryVersions": meta["library_versions"],
        "selectedModel": meta["selected_model"],
        "decisionThreshold": meta["decision_threshold"],
        "n": meta["n"],
        "trainPrevalence": meta["train_prevalence"],
        "preprocessing": meta["preprocessing"],
        "features": {
            "nSource": meta["features"]["n_source_features"],
            "nEncoded": meta["features"]["n_encoded_columns"],
            "numeric": [{"feature": f, "label": label(f)} for f in numeric],
            "categorical": [{"feature": f, "label": label(f)} for f in categorical],
        },
        "excludedVariableCounts": exclusions,
        "leakageScreen": {"maxUnivariateAuc": max(meta["univariate_leakage_screen_train"].values()),
                          "limit": config.MAX_UNIVARIATE_AUC},
        "validation": {
            "n": sel["n"], "positives": sel["positives"], "prevalence": sel["prevalence"],
            "rocAuc": sel["roc_auc"], "prAuc": sel["pr_auc"], "brier": sel["brier"],
            "brierSkill": sel["brier_skill_vs_observed_prevalence"],
            "calibration": sel["calibration"], "atThreshold": sel["at_threshold"],
            "prevalenceBaseline": validation["prevalence_baseline"],
            "candidates": validation["all_candidates"],
        },
        "test": {
            "metrics": test["test"],
            "calibration": test["calibration"],
            "atFrozenThreshold": test["at_frozen_threshold"],
            "prevalenceBaseline": test["prevalence_baseline"],
            "provisionalBootstrapCi": test["provisional_bootstrap_95ci_unweighted_not_design_adjusted"],
            "subgroups": test["subgroups"],
            "notes": test["notes"],
        },
        "evaluationLog": {"count": len(log), "entries": [{"evaluatedAtUtc": e["evaluated_at_utc"],
                                                          "modelSha256": e["model_sha256"]} for e in log]},
        "hypotheticalExample": {
            "provenance": "hypothetical",
            "description": read_json(hyp_path)["description"],
            "probability": p_h,
            "threshold": threshold,
            "aboveThreshold": p_h >= threshold,
            "trainPrevalence": meta["train_prevalence"],
            "missingInputs": sum(1 for f in hyp_features if f["value"] is None),
            "features": hyp_features,
        },
        "shapHypothetical": shap_h,
        "shapGlobal": shap_g,
    }


def global_shap(pipe, X_va, source_feature, label) -> Dict[str, Any]:
    import numpy as np
    import shap

    from nsch_baseline import config

    prep, model = pipe.named_steps["prep"], pipe.named_steps["model"]
    if not hasattr(model, "coef_"):
        return {"provenance": "offline_survey", "available": False,
                "message": "Aggregate SHAP is only exported for the linear model."}
    x = prep.transform(X_va)
    names = prep.named_steps["columns"].get_feature_names_out()
    background = np.load(config.ARTIFACT_DIR / "shap_background.npz")["background"]
    explainer = shap.LinearExplainer(model, shap.maskers.Independent(background, max_samples=len(background)))
    values = np.asarray(explainer.shap_values(x))
    base = float(np.ravel(explainer.expected_value)[0])
    error = float(np.max(np.abs(base + values.sum(axis=1) - model.decision_function(x))))
    if error > 1e-6:
        return {"provenance": "offline_survey", "available": False,
                "message": f"Additivity check failed (max error {error:.2e}); aggregate importance withheld."}

    sources = sorted({source_feature(n) for n in names})
    index = {s: i for i, s in enumerate(sources)}
    per_source = np.zeros((values.shape[0], len(sources)))
    for j, n in enumerate(names):
        per_source[:, index[source_feature(n)]] += values[:, j]
    mean_abs, mean_signed = np.abs(per_source).mean(axis=0), per_source.mean(axis=0)
    order = np.argsort(-mean_abs)
    return {
        "provenance": "offline_survey",
        "available": True,
        "dataset": "NSCH 2023-2024 development data, validation partition (2025 not used)",
        "n": int(values.shape[0]),
        "method": "Mean |SHAP| per source feature (one-hot columns summed per row), LinearExplainer",
        "scale": "log-odds",
        "baseValue": base,
        "additivityMaxAbsError": error,
        "features": [{"feature": sources[i], "label": label(sources[i]), "meanAbs": float(mean_abs[i]),
                      "meanSigned": float(mean_signed[i])} for i in order],
    }


# --------------------------------------------------------------------------------------------------------------
# MQ-REC v0.1 (synthetic rule prototype)
# --------------------------------------------------------------------------------------------------------------

def mqrec_section(sources: Sources) -> Dict[str, Any]:
    from rule_engine.mq_rec import RULESET_VERSION, SCHEMA_VERSION as CONTEXT_SCHEMA, evaluate, load_context
    from rule_engine.mq_rec.evidence import evidence_for
    from rule_engine.mq_rec.rules import REGISTRY

    for name in ("rules.py", "evaluator.py", "evidence.py", "guardrails.py", "context.py"):
        sources.add(f"mqrec.{name}", REC_ROOT / "rule_engine" / "mq_rec" / name, "synthetic")
    refs = read_json(sources.add("mqrec.references", REC_ROOT / "evidence_base" / "references.json", "documentation"))

    scenarios = []
    for path in sorted((REC_ROOT / "test_scenarios" / "scenarios").glob("*.json")):
        sources.add(f"mqrec.scenario.{path.stem}", path, "synthetic")
        ctx, raw = load_context(path)
        out = evaluate(ctx)
        if not raw.get("notes", {}).get("synthetic", False) and not str(raw.get("learnerRef", "")).startswith("SYN"):
            raise RuntimeError(f"{path.name} is not marked synthetic; refusing to export it.")
        scenarios.append({
            "id": path.stem,
            "provenance": "synthetic",
            "description": raw.get("notes", {}).get("description", ""),
            "input": {k: v for k, v in raw.items() if k != "notes"},
            "output": out,
        })

    return {
        "provenance": "synthetic",
        "rulesetVersion": RULESET_VERSION,
        "contextSchemaVersion": CONTEXT_SCHEMA,
        "status": "RESEARCH_PROTOTYPE",
        "integration": "Not connected to MathQuest; runs offline on synthetic learner contexts only.",
        "rules": [{
            "ruleId": s.ruleId, "name": s.name, "category": s.category, "priority": s.priority,
            "specStatus": s.specStatus, "enabled": s.enabled, "disabledReason": s.disabledReason,
            "expertReviewPending": list(s.expertReviewPending), "evidence": evidence_for(s.ruleId),
        } for s in REGISTRY],
        "references": [{k: r.get(k) for k in ("sourceId", "title", "organization", "publicationYear", "limitations")}
                       for r in refs["references"]],
        "scenarios": scenarios,
    }


# --------------------------------------------------------------------------------------------------------------
# ELP-X v1.0 (simulated benchmark + strategy catalogue read from the service source)
# --------------------------------------------------------------------------------------------------------------

def elpx_section(sources: Sources) -> Dict[str, Any]:
    engine_path = sources.add("elpx.engine", SERVICE_ROOT / "app" / "core" / "elpx_engine.py", "documentation")
    evidence_path = sources.add("elpx.assessmentEvidence",
                                SERVICE_ROOT / "app" / "services" / "assessment_evidence.py", "documentation")
    engine_src = engine_path.read_text(encoding="utf-8")

    def constant(src: str, name: str) -> str:
        m = re.search(rf'^{name}\s*=\s*"([^"]+)"', src, re.M)
        if not m:
            raise RuntimeError(f"{name} not found")
        return m.group(1)

    catalogue: Dict[str, Dict[str, Any]] = {}
    pattern = re.compile(r'"strategyCode":\s*"(\w+)",\s*"reasonCodes":\s*\[([^\]]*)\].*?"titleEn":\s*f?"([^"]*)"', re.S)
    for code, reasons, title in pattern.findall(engine_src):
        entry = catalogue.setdefault(code, {"strategyCode": code, "reasonCodeSets": [], "titleTemplates": []})
        reason_list = re.findall(r'"(\w+)"', reasons)
        if reason_list not in entry["reasonCodeSets"]:
            entry["reasonCodeSets"].append(reason_list)
        title = re.sub(r"\{[^}]*\}", "<skill>", title)
        if title not in entry["titleTemplates"]:
            entry["titleTemplates"].append(title)

    eval_path = sources.add("elpx.simulation", REPO_ROOT / "research" / "experiments" / "evaluate_elpx.py", "simulated")
    spec = importlib.util.spec_from_file_location("evaluate_elpx", eval_path)
    sim = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(sim)

    def plain(v: Any) -> Any:
        if isinstance(v, dict):
            return {str(k): plain(x) for k, x in v.items()}
        if isinstance(v, (list, tuple)):
            return [plain(x) for x in v]
        return v

    return {
        "algorithmVersion": constant(engine_src, "ALGORITHM_VERSION"),
        "recommendationRulesetVersion": constant(engine_src, "RECOMMENDATION_RULESET_VERSION"),
        "profileSchemaVersion": constant(engine_src, "PROFILE_SCHEMA_VERSION"),
        "evidenceRulesetVersion": constant(evidence_path.read_text(encoding="utf-8"), "EVIDENCE_RULESET_VERSION"),
        "method": {
            "prior": "Beta(1, 1)",
            "estimate": "posterior mean of Beta(1 + c, 1 + n - c) over distinct first responses",
            "interval": "95% equal-tailed Bayesian credible interval",
            "minimumEvidencePerSkill": int(constant_number(engine_src, "MINIMUM_EVIDENCE_QUESTIONS_PER_SKILL")),
            "levels": {"EMERGING": "p < 0.50", "DEVELOPING": "0.50 <= p < 0.80", "PROFICIENT": "p >= 0.80",
                       "INSUFFICIENT_EVIDENCE": "fewer than the minimum distinct items"},
        },
        "strategyCatalogue": list(catalogue.values()),
        "simulated": {
            "provenance": "simulated",
            "note": "Deterministic simulations for algorithm verification; not validation on real children.",
            "experimentA": plain(sim.run_experiment_a_small_sample_vulnerability()),
            "experimentB": plain(sim.run_experiment_b_sample_size_sensitivity()),
            "experimentC": plain(sim.run_experiment_c_stability_under_perturbation()),
        },
    }


def constant_number(src: str, name: str) -> float:
    m = re.search(rf"^{name}\s*=\s*([0-9.]+)", src, re.M)
    if not m:
        raise RuntimeError(f"{name} not found")
    return float(m.group(1))


# --------------------------------------------------------------------------------------------------------------
# IMLR probe prototype (scripted synthetic scenarios run through the unmodified prototype)
# --------------------------------------------------------------------------------------------------------------

IMLR_DEMO_SEED = 7
_EVENT_FIELDS = ("seq", "t", "type", "itemId", "level", "origin", "action", "position", "assistanceRecording")
_ITEM_FIELDS = ("itemId", "role", "presented", "answered", "skipped", "firstResponseSeconds", "firstResponsePosition",
                "correctFirstResponse", "revisions", "instructionReplays", "supportBeforeFirstResponse",
                "supportLevels", "childHelpRequests", "assistanceRecording", "assistanceStatus", "flags")


def imlr_demo_section(sources: Sources) -> Dict[str, Any]:
    """
    Runs every scripted scenario through the prototype exactly as its tests do. Per scenario, the prediction-time
    INPUTS (frozen snapshot and pre/teaching evidence) and the transfer OUTCOMES are exported as separate blocks.
    """
    from imlr_probe import events as ev
    from imlr_probe import fixtures, forms, item_bank, protocol
    from imlr_probe.outcome import build_research_record, evaluate_transfer
    from imlr_probe.snapshot import build_prediction_snapshot, pre_probe_evidence

    for name in ("protocol.py", "item_bank.py", "forms.py", "events.py", "snapshot.py", "outcome.py", "fixtures.py"):
        sources.add(f"imlr.{name}", ML_ROOT / "imlr_probe" / name, "synthetic")

    form = forms.assign_form(IMLR_DEMO_SEED)
    transfer_ids = {it["itemId"] for it in forms.items_by_role(form, protocol.TRANSFER)}
    scenarios = []
    for sid, spec in fixtures.SCENARIOS.items():
        log = fixtures.scenario(sid, form)
        snap = build_prediction_snapshot(form, log)
        out = evaluate_transfer(form, log)
        record = build_research_record(snap, out)
        cutoff = snap["meta"]["predictionTime"]["seq"]
        before = [e for e in log if e["seq"] < cutoff]
        if transfer_ids & {e.get("itemId") for e in before}:
            raise RuntimeError(f"{sid}: transfer events before prediction time")
        scenarios.append({
            "id": sid,
            "title": spec["title"],
            "description": spec["description"],
            "synthetic": True,
            "inputs": {
                "preProbe": [{k: p[k] for k in _ITEM_FIELDS} for p in pre_probe_evidence(form, log)],
                "teaching": [{k: t[k] for k in _ITEM_FIELDS}
                             for t in (ev.item_evidence(it, before) for it in forms.items_by_role(form, protocol.TEACHING))],
                "teachingWindow": ev.teaching_window(before),
                "snapshot": snap,
            },
            "outcomes": {
                **out,
                "itemDetails": [{k: d[k] for k in _ITEM_FIELDS}
                                for d in (ev.item_evidence(it, log) for it in forms.items_by_role(form, protocol.TRANSFER))],
                "label": record["label"],
                "separation": record["separation"],
            },
            "events": [{**{k: e[k] for k in _EVENT_FIELDS if k in e},
                        "window": "before_prediction_time" if e["seq"] < cutoff else
                                  ("prediction_time" if e["seq"] == cutoff else "after_prediction_time")}
                       for e in log],
        })

    return {
        "provenance": "synthetic",
        "notice": fixtures.SYNTHETIC_NOTICE,
        "protocol": protocol.protocol_descriptor(),
        "snapshotSchemaVersion": protocol.SNAPSHOT_SCHEMA_VERSION,
        "outcomeSchemaVersion": protocol.OUTCOME_SCHEMA_VERSION,
        "itemBank": {
            "version": item_bank.BANK_VERSION,
            "familyId": item_bank.FAMILY_ID,
            "conceptId": item_bank.CONCEPT_ID,
            "expertReview": item_bank.EXPERT_REVIEW,
            "cells": {k: {"largest": list(v["largest"]), "gap": v["gap"], "smallestMin": v["smallestMin"],
                          "roles": list(v["roles"])} for k, v in item_bank.CELLS.items()},
            "items": [{**i, "counts": list(i["counts"])} for i in item_bank.ITEMS],
        },
        "form": form,
        "scenarios": scenarios,
    }


# --------------------------------------------------------------------------------------------------------------
# Model registry (statuses mirror what is actually implemented; nothing planned is shown as working)
# --------------------------------------------------------------------------------------------------------------

def model_registry(nsch: Dict[str, Any], mqrec: Dict[str, Any], elpx: Dict[str, Any],
                   imlr: Dict[str, Any]) -> List[Dict[str, Any]]:
    sel = nsch["selectedModel"]
    return [
        {"id": "elpx", "name": "ELP-X Bayesian skill estimation", "family": "Beta-Binomial Bayesian estimation",
         "version": elpx["algorithmVersion"], "status": "IMPLEMENTED", "provenance": "live",
         "description": "Per-skill proficiency estimate with a 95% credible interval and an evidence-sufficiency gate.",
         "location": "services/learner-profile-service/app/core/elpx_engine.py"},
        {"id": "elpx-rec", "name": "ELP-X-REC recommendations", "family": "Deterministic rules",
         "version": elpx["recommendationRulesetVersion"], "status": "IMPLEMENTED", "provenance": "live",
         "description": "Structured strategy codes with reason codes, generated from ELP-X estimates and preferences.",
         "location": "services/learner-profile-service/app/core/elpx_engine.py"},
        {"id": "assess-evidence", "name": "Assessment evidence integrity rules", "family": "Deterministic rules",
         "version": elpx["evidenceRulesetVersion"], "status": "IMPLEMENTED", "provenance": "live",
         "description": "Server-side first-response scoring, exclusion of unapproved/calibration items, quality flags.",
         "location": "services/learner-profile-service/app/services/assessment_evidence.py"},
        {"id": "impsa", "name": "IMPSA (independent problem-solving) summary", "family": "Provisional evidence summary",
         "version": None, "status": "PROVISIONAL", "provenance": "live",
         "description": "Counts of eligible unassisted first attempts. Provisional label only; not a validated score.",
         "location": "services/learner-profile-service/app/services/onboarding_service.py"},
        {"id": "imlr", "name": "IMLR (learning readiness) transfer indicator", "family": "Provisional evidence summary",
         "version": None, "status": "PROVISIONAL", "provenance": "live",
         "description": "Single pre-probe / support / transfer observation. Does not certify a learning gain.",
         "location": "services/learner-profile-service/app/services/onboarding_service.py"},
        {"id": "nsch-k2q31a", "name": "NSCH K2Q31A baseline classifier",
         "family": f"{sel['family'].replace('_', ' ')} {sel['params']}", "version": nsch["experimentId"],
         "status": "OFFLINE_EXPERIMENT", "provenance": "offline_survey",
         "description": "Predicts a US parent report of ever being told ADD/ADHD (ages 6-10). Not diagnostic and "
                        "not applied to MathQuest learners.",
         "location": "research/recommendation_engine/ml_experiments/nsch_baseline"},
        {"id": "mq-rec", "name": "MQ-REC personalisation rules", "family": "Deterministic rules with traces",
         "version": mqrec["rulesetVersion"], "status": "PROTOTYPE", "provenance": "synthetic",
         "description": "Offline rule prototype evaluated on synthetic learner contexts only.",
         "location": "research/recommendation_engine/rule_engine/mq_rec"},
        {"id": "readiness-prediction", "name": "Learning readiness prediction model", "family": None, "version": None,
         "status": "NOT_IMPLEMENTED", "provenance": "documentation",
         "description": "Planned supervised model for IMPSA/IMLR targets. No data, training or results exist.",
         "location": "research/recommendation_engine/ml_experiments/README.md"},
        {"id": "longitudinal", "name": "Longitudinal progress model", "family": None, "version": None,
         "status": "NOT_IMPLEMENTED", "provenance": "documentation",
         "description": "Planned trajectory modelling across sessions. No implementation exists.",
         "location": "research/recommendation_engine/longitudinal/README.md"},
        {"id": "imlr-probe", "name": "IMLR learning-transfer probe", "family": "Assessment protocol with frozen evidence boundary",
         "version": f"{imlr['protocol']['protocolId']} {imlr['protocol']['protocolVersion']}",
         "status": "PROTOTYPE", "provenance": "synthetic",
         "description": "Pre-probe, standard teaching and new transfer questions, demonstrated on scripted synthetic "
                        "scenarios only. Not used with children; no prediction model.",
         "location": "research/recommendation_engine/ml_experiments/imlr_probe"},
        {"id": "adhd-presentation", "name": "ADHD presentation classification", "family": None, "version": None,
         "status": "NOT_IMPLEMENTED", "provenance": "documentation",
         "description": "Only possible offline with clinically established labels and ethics approval. Not started.",
         "location": "research/recommendation_engine/ml_experiments/README.md"},
    ]


# --------------------------------------------------------------------------------------------------------------

def build(skip_tests: bool = False) -> Dict[str, Any]:
    sources = Sources()
    nsch = nsch_section(sources)
    mqrec = mqrec_section(sources)
    elpx = elpx_section(sources)
    imlr = imlr_demo_section(sources)

    tests: List[Dict[str, Any]] = []
    if not skip_tests:
        tests.append(run_suite("MQ-REC v0.1 unit tests",
                               "python -m unittest discover -s test_scenarios -t . (from research/recommendation_engine)",
                               REC_ROOT / "test_scenarios", REC_ROOT))
        tests.append(run_suite("NSCH baseline verification tests",
                               ".venv\\Scripts\\python.exe -m unittest tests.test_nsch_baseline (from ml_experiments)",
                               ML_ROOT / "tests", ML_ROOT, "test_nsch*.py"))
        tests.append(run_suite("IMLR probe prototype tests",
                               ".venv\\Scripts\\python.exe -m unittest tests.test_imlr_probe (from ml_experiments)",
                               ML_ROOT / "tests", ML_ROOT, "test_imlr*.py"))

    snapshot = {
        "schemaVersion": SCHEMA_VERSION,
        "componentId": "learner-profile",
        "componentTitle": "Learner Profile & Prediction Engine",
        "generatedAtUtc": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "generator": {"script": rel(Path(__file__)), "version": EXPORTER_VERSION},
        "sources": sources.items,
        "models": model_registry(nsch, mqrec, elpx, imlr),
        "sections": {"nsch": nsch, "mqRec": mqrec, "elpx": elpx, "imlrDemo": imlr, "softwareTests": tests},
    }
    assert_sanitized(snapshot)
    return snapshot


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(description="Export the sanitized research analytics snapshot")
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--skip-tests", action="store_true", help="do not run the software test suites")
    args = parser.parse_args(argv)

    snapshot = build(skip_tests=args.skip_tests)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(snapshot, indent=1, ensure_ascii=False), encoding="utf-8")
    nsch = snapshot["sections"]["nsch"]
    out = args.output.resolve()
    print(f"Snapshot written: {rel(out) if out.is_relative_to(REPO_ROOT) else out.name}")
    print(f"  sources: {len(snapshot['sources'])} files hashed | models: {len(snapshot['models'])}")
    print(f"  NSCH test ROC-AUC {nsch['test']['metrics']['roc_auc']:.4f} (saved evaluation, 2025 not reopened)")
    print(f"  SHAP hypothetical available: {nsch['shapHypothetical']['available']} | "
          f"aggregate (validation n={nsch['shapGlobal'].get('n')}): {nsch['shapGlobal']['available']}")
    for t in snapshot["sections"]["softwareTests"]:
        print(f"  {t['suite']}: {t['status']} ({t['passed']}/{t['testsRun']} passed, {t['skipped']} skipped)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
