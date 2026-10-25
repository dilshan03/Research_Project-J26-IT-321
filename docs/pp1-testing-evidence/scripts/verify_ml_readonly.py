"""Read-only PP1 verification of the frozen NSCH K2Q31A baseline: no refit, no file writes in the repo."""
import json, sys
from pathlib import Path

ROOT = Path(sys.argv[1])
ML = ROOT / "research" / "recommendation_engine" / "ml_experiments"
sys.path.insert(0, str(ML))
sys.dont_write_bytecode = True

import numpy as np
from sklearn.metrics import roc_auc_score, average_precision_score, brier_score_loss, confusion_matrix
from sklearn.model_selection import train_test_split
from nsch_baseline import config, data, demo

TOL = 1e-9
ok_all = True
def check(name, recomputed, stored, tol=TOL):
    global ok_all
    ok = abs(recomputed - stored) <= tol
    ok_all &= ok
    print(f"  [{'PASS' if ok else 'FAIL'}] {name}: recomputed={recomputed!r} stored={stored!r} |diff|={abs(recomputed-stored):.2e}")

art = config.ARTIFACT_DIR
meta = json.loads((art / "metadata.json").read_text(encoding="utf-8"))
test = json.loads((art / "test_metrics_2025.json").read_text(encoding="utf-8"))
snap = json.loads((ROOT / "services/learner-profile-service/app/research_snapshots/learner-profile.json").read_text(encoding="utf-8"))["sections"]["nsch"]

print("1. Frozen model integrity")
pipe, _ = demo.load_frozen()  # raises if sha256 differs
print(f"  [PASS] model.joblib sha256 matches metadata ({meta['model_sha256'][:8]}...{meta['model_sha256'][-4:]})")
same = test["model_sha256"] == meta["model_sha256"] == snap["modelSha256"]
ok_all &= same
print(f"  [{'PASS' if same else 'FAIL'}] test_metrics_2025.json and research snapshot reference the same model hash")
print(f"  model: {type(pipe.named_steps['model']).__name__}, C={pipe.named_steps['model'].C}")

print("2. 2025 held-out test metrics (frozen model, no refit)")
X, y, _ = data.load_test()
p = pipe.predict_proba(X)[:, 1]
m = test["test"]
check("n", len(y), m["n"], 0); check("positives", int(y.sum()), m["positives"], 0)
check("ROC-AUC", roc_auc_score(y, p), m["roc_auc"])
check("PR-AUC (average precision)", average_precision_score(y, p), m["pr_auc"])
check("Brier", brier_score_loss(y, p), m["brier"])
thr = meta["decision_threshold"]["value"]
tn, fp, fn, tp = confusion_matrix(y, (p >= thr).astype(int)).ravel()
cm = test["at_frozen_threshold"]["confusion_matrix"] if "at_frozen_threshold" in test else snap["test"]["atFrozenThreshold"]["confusion_matrix"]
for k, v in zip(("tn", "fp", "fn", "tp"), (tn, fp, fn, tp)):
    check(f"confusion {k} @ threshold {thr:.5f}", int(v), cm[k], 0)
check("snapshot ROC-AUC equals stored file", snap["test"]["metrics"]["roc_auc"], m["roc_auc"], 0)

print("3. SHAP - hypothetical example (HYPOTHETICAL input, not a real child)")
X_h, _ = demo.hypothetical(ML / "examples" / "hypothetical_child.json")
exp, msg = demo.explain(pipe, X_h)
sh = snap["shapHypothetical"]
if exp is None:
    ok_all = False; print("  [FAIL]", msg)
else:
    import shap
    bg = np.load(art / "shap_background.npz")["background"]
    print(f"  explainer: shap {shap.__version__} LinearExplainer, Independent masker, background rows={bg.shape[0]}")
    check("probability", float(pipe.predict_proba(X_h)[0, 1]), snap["hypotheticalExample"]["probability"], 1e-12)
    check("base value (log-odds)", exp["base_value"], sh["baseValue"], 1e-9)
    check("model output (log-odds)", exp["model_output"], sh["modelOutput"], 1e-9)
    check("additivity |base+sum(SHAP) - output|", abs(exp["reconstructed"] - exp["model_output"]), 0.0, 1e-6)
    stored = {c["feature"]: c["contribution"] for c in sh["contributions"]}
    diff = max(abs(exp["contributions"][f] - stored[f]) for f in stored)
    check(f"max |contribution diff| over {len(stored)} features", diff, 0.0, 1e-9)
    top = sorted(exp["contributions"].items(), key=lambda kv: -abs(kv[1]))[:5]
    print("  top-5 recomputed:", [(f, round(v, 4)) for f, v in top])
    print("  top-5 snapshot:  ", [(c["feature"], round(c["contribution"], 4)) for c in sh["contributions"][:5]])

print("4. SHAP - aggregate importance on 2023-24 validation partition (2025 not used)")
Xd, yd, years, _ = data.load_development()
strata = years.to_numpy() + "_" + yd.astype(str)
_, X_va, _, _ = train_test_split(Xd, yd, test_size=config.VALIDATION_FRACTION, stratify=strata, random_state=config.SEED)
check("validation n", len(X_va), snap["shapGlobal"]["n"], 0)
prep, model = pipe.named_steps["prep"], pipe.named_steps["model"]
x = prep.transform(X_va)
explainer = shap.LinearExplainer(model, shap.maskers.Independent(bg, max_samples=len(bg)))
vals = np.asarray(explainer.shap_values(x))
base = float(np.ravel(explainer.expected_value)[0])
err = float(np.max(np.abs(base + vals.sum(axis=1) - model.decision_function(x))))
check("additivity max abs error", err, 0.0, 1e-6)
from nsch_baseline.preprocessing import source_feature
names = prep.named_steps["columns"].get_feature_names_out()
agg = {}
for j, n in enumerate(names):
    agg.setdefault(source_feature(n), np.zeros(vals.shape[0]))
    agg[source_feature(n)] += vals[:, j]
stored_g = {f["feature"]: f["meanAbs"] for f in snap["shapGlobal"]["features"]}
check("max |mean|SHAP| diff| across features", max(abs(np.abs(agg[f]).mean() - stored_g[f]) for f in stored_g), 0.0, 1e-9)
top_r = sorted(agg, key=lambda f: -np.abs(agg[f]).mean())[:5]
print("  top-5 recomputed:", top_r)
print("  top-5 snapshot:  ", [f["feature"] for f in snap["shapGlobal"]["features"][:5]])

print("\nOVERALL:", "ALL CHECKS PASSED" if ok_all else "SOME CHECKS FAILED")
sys.exit(0 if ok_all else 1)
