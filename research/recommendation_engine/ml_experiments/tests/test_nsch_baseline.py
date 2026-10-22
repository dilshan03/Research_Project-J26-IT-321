"""
Verification tests for the NSCH K2Q31A baseline (standard-library unittest).

Run from research/recommendation_engine/ml_experiments/:
    .venv\\Scripts\\python.exe -m unittest discover -s tests -t . -v

Tests that need the raw survey files or the trained artifact are skipped when those (git-ignored) files are absent.
"""

import json
import unittest
from datetime import datetime
from pathlib import Path
from unittest import mock

import numpy as np
import pandas as pd

from nsch_baseline import config, data, leakage
from nsch_baseline.preprocessing import make_preprocessor, source_feature

HAVE_RAW = all(data.raw_path(y).exists() for y in config.RAW_FILES)
HAVE_ARTIFACT = (config.ARTIFACT_DIR / "model.joblib").exists() and (config.ARTIFACT_DIR / "metadata.json").exists()
LABELS = json.loads((Path(config.ROOT) / "nsch_baseline" / "feature_labels.json").read_text(encoding="utf-8"))["features"]


def metadata():
    return json.loads((config.ARTIFACT_DIR / "metadata.json").read_text(encoding="utf-8"))


def load_model():
    import joblib
    return joblib.load(config.ARTIFACT_DIR / "model.joblib")


def blank_row():
    return pd.DataFrame([{f: "" for f in config.FEATURES}])


# ----------------------------------------------------------------------------------------------
class TestNoTargetLeakage(unittest.TestCase):
    def test_allowlist_has_no_forbidden_or_adhd_variables(self):
        self.assertEqual({k: v for k, v in leakage.static_violations().items() if v}, {})
        self.assertFalse(set(config.FEATURES) & config.FORBIDDEN_FEATURES)
        for name in ("K2Q31A", "K2Q31B", "K2Q31C", "K2Q31D", "ADDTREAT", "MEDSHORT", "K4Q23", "SC_CSHCN",
                     "MEMORYCOND", "K6Q15", "K7Q84_R", "FWC", "YEAR", "HHID", "FIPSST"):
            self.assertNotIn(name, config.FEATURES)

    def test_target_is_not_a_feature(self):
        self.assertNotIn(config.TARGET, config.FEATURES)

    @unittest.skipUnless(HAVE_ARTIFACT, "trained artifact not present")
    def test_every_encoded_model_column_comes_from_the_allowlist(self):
        names = load_model().named_steps["prep"].named_steps["columns"].get_feature_names_out()
        sources = {source_feature(n) for n in names}
        self.assertTrue(sources <= set(config.FEATURES))
        self.assertFalse(sources & config.FORBIDDEN_FEATURES)

    @unittest.skipUnless(HAVE_ARTIFACT, "trained artifact not present")
    def test_recorded_univariate_screen_is_below_leakage_threshold(self):
        screen = metadata()["univariate_leakage_screen_train"]
        self.assertEqual(set(screen), set(config.FEATURES))
        self.assertLessEqual(max(screen.values()), config.MAX_UNIVARIATE_AUC)

    def test_leakage_guard_rejects_a_proxy_feature(self):
        y = np.array([0, 1] * 50)
        X = pd.DataFrame({"PROXY": np.where(y == 1, "1", "2")})
        with mock.patch.object(config, "NUMERIC_FEATURES", []):
            aucs = leakage.univariate_auc(X, y)
        self.assertGreater(aucs["PROXY"], config.MAX_UNIVARIATE_AUC)


# ----------------------------------------------------------------------------------------------
class TestRequiredFeatures(unittest.TestCase):
    def test_allowlist_is_well_formed(self):
        self.assertEqual(len(config.FEATURES), len(set(config.FEATURES)))
        self.assertFalse(set(config.NUMERIC_FEATURES) & set(config.CATEGORICAL_FEATURES))
        self.assertEqual(set(LABELS), set(config.FEATURES))

    @unittest.skipUnless(HAVE_RAW, "raw NSCH files not present")
    def test_every_feature_exists_in_every_survey_year(self):
        for year in config.RAW_FILES:
            missing = set(config.FEATURES) - set(data.header(year))
            self.assertEqual(missing, set(), f"{year}: {missing}")

    def test_hypothetical_example_uses_documented_codes(self):
        example = json.loads((config.ROOT / "examples" / "hypothetical_child.json").read_text(encoding="utf-8"))
        for f, v in example["features"].items():
            self.assertIn(f, config.FEATURES)
            if f in config.CATEGORICAL_FEATURES and LABELS[f]["codes"]:
                self.assertIn(v, LABELS[f]["codes"], f)


# ----------------------------------------------------------------------------------------------
@unittest.skipUnless(HAVE_RAW, "raw NSCH files not present")
class TestPreprocessingReproducibility(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        df = data.select_cohort(data.load_year(2023)).sample(1500, random_state=1)
        cls.X, cls.y = data.features_and_target(df)

    def test_fitting_twice_gives_identical_output(self):
        a = make_preprocessor().fit_transform(self.X)
        b = make_preprocessor().fit_transform(self.X)
        np.testing.assert_array_equal(a, b)

    def test_transform_is_deterministic_and_finite(self):
        prep = make_preprocessor().fit(self.X)
        a, b = prep.transform(self.X), prep.transform(self.X)
        np.testing.assert_array_equal(a, b)
        self.assertTrue(np.isfinite(a).all())

    def test_original_frame_is_not_modified(self):
        before = self.X.copy()
        make_preprocessor().fit_transform(self.X)
        pd.testing.assert_frame_equal(before, self.X)


# ----------------------------------------------------------------------------------------------
@unittest.skipUnless(HAVE_ARTIFACT, "trained artifact not present")
class TestArtifacts(unittest.TestCase):
    def test_model_loads_and_matches_frozen_hash(self):
        self.assertEqual(data.sha256(config.ARTIFACT_DIR / "model.joblib"), metadata()["model_sha256"])
        self.assertTrue(hasattr(load_model(), "predict_proba"))

    def test_metadata_records_seed_versions_features_and_threshold(self):
        m = metadata()
        self.assertEqual(m["seed"], config.SEED)
        self.assertIn("scikit-learn", m["library_versions"])
        self.assertEqual(m["features"]["numeric"] + m["features"]["categorical"], config.FEATURES)
        self.assertTrue(0 < m["decision_threshold"]["value"] < 1)
        allow = json.loads((config.ARTIFACT_DIR / "feature_allowlist.json").read_text(encoding="utf-8"))
        self.assertEqual(allow["numeric"] + allow["categorical"], config.FEATURES)


# ----------------------------------------------------------------------------------------------
@unittest.skipUnless(HAVE_ARTIFACT and HAVE_RAW, "artifact or raw data not present")
class TestPredictions(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.model = load_model()
        df = data.select_cohort(data.load_year(2023)).sample(300, random_state=2)
        cls.X, _ = data.features_and_target(df)

    def test_probabilities_are_valid(self):
        p = self.model.predict_proba(self.X)
        self.assertEqual(p.shape, (len(self.X), 2))
        self.assertTrue(np.isfinite(p).all())
        self.assertTrue(((p >= 0) & (p <= 1)).all())
        np.testing.assert_allclose(p.sum(axis=1), 1.0)

    def test_same_input_gives_same_prediction(self):
        a = self.model.predict_proba(self.X)[:, 1]
        b = self.model.predict_proba(self.X.copy())[:, 1]
        np.testing.assert_array_equal(a, b)

    def test_missing_values_are_handled(self):
        p = self.model.predict_proba(blank_row())[0, 1]
        self.assertTrue(0 <= p <= 1)
        partial = self.X.iloc[[0]].copy()
        partial[config.FEATURES[:10]] = ""
        self.assertTrue(0 <= self.model.predict_proba(partial)[0, 1] <= 1)

    def test_unseen_category_is_handled(self):
        row = self.X.iloc[[0]].copy()
        row["SC_RACE_R"] = "99"
        self.assertTrue(0 <= self.model.predict_proba(row)[0, 1] <= 1)


# ----------------------------------------------------------------------------------------------
class TestNo2025InTrainingOrSelection(unittest.TestCase):
    def test_configuration_separates_years(self):
        self.assertNotIn(config.TEST_YEAR, config.DEVELOPMENT_YEARS)

    @unittest.skipUnless(HAVE_RAW, "raw NSCH files not present")
    def test_development_loader_never_opens_2025(self):
        opened = []
        real = data.load_year

        def spy(year):
            opened.append(year)
            return real(year)

        with mock.patch.object(data, "load_year", side_effect=spy):
            X, y, years, hashes = data.load_development()
        self.assertEqual(sorted(set(opened)), sorted(config.DEVELOPMENT_YEARS))
        self.assertEqual(set(years.unique()), {str(y) for y in config.DEVELOPMENT_YEARS})
        self.assertNotIn(config.TEST_YEAR, hashes)

    def test_development_loader_refuses_the_test_year(self):
        with mock.patch.object(config, "DEVELOPMENT_YEARS", (2023, config.TEST_YEAR)), \
                mock.patch.object(data, "load_year", return_value=pd.DataFrame()):
            with self.assertRaises(RuntimeError):
                data.load_development()

    @unittest.skipUnless(HAVE_ARTIFACT, "trained artifact not present")
    def test_frozen_model_used_only_development_years_and_test_came_after_freezing(self):
        m = metadata()
        self.assertEqual(m["development_years"], list(config.DEVELOPMENT_YEARS))
        self.assertFalse(m["test_year_used_for_training_or_selection"])
        self.assertNotIn(str(config.TEST_YEAR), m["raw_file_sha256"])
        test_file = config.ARTIFACT_DIR / "test_metrics_2025.json"
        if test_file.exists():
            t = json.loads(test_file.read_text(encoding="utf-8"))
            self.assertEqual(t["model_sha256"], m["model_sha256"])
            self.assertGreater(datetime.fromisoformat(t["evaluated_at_utc"]), datetime.fromisoformat(m["frozen_at_utc"]))


if __name__ == "__main__":
    unittest.main()
