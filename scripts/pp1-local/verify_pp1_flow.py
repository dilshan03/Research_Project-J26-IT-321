"""
PP1 live verification against the ISOLATED LOCAL stack (no mocks, no Atlas):
  web http://localhost:5174 -> auth http://127.0.0.1:5100 + learner-profile http://localhost:5101
  -> MongoDB container on 127.0.0.1:27018, database mathquest_pp1_demo (synthetic records only).

Usage (after start-pp1-local.ps1):  python scripts\\pp1-local\\verify_pp1_flow.py
Requires: playwright + pymongo in the local Python. Every browser request to a non-local host is blocked.
"""
import json
import re
import sys
import time
from pathlib import Path

from playwright.sync_api import sync_playwright
from pymongo import MongoClient

WEB = "http://localhost:5174"
PROFILE_API = "http://localhost:5101/api/v1"
MONGO_URI = "mongodb://127.0.0.1:27018"
DB_NAME = "mathquest_pp1_demo"
OUT = Path(__file__).resolve().parent / "output"
OUT.mkdir(exist_ok=True)
RUN = str(int(time.time()))
PASSWORD = "Pp1Demo2026"
checks = []


def check(name, ok, detail=""):
    checks.append((name, bool(ok), detail))
    print(("PASS " if ok else "FAIL ") + name + (f"  [{detail}]" if detail else ""))


ALLOWED_LOCAL = {"localhost:5174", "127.0.0.1:5174", "localhost:5101", "127.0.0.1:5101"}
blocked = []


def guard(route):
    """Only the isolated stack (web 5174, learner-profile 5101) is reachable; ports 5000-5002 etc. are blocked."""
    netloc = re.sub(r"^https?://([^/]+).*$", r"\1", route.request.url)
    host = netloc.split(":")[0]
    if netloc in ALLOWED_LOCAL or host in ("fonts.googleapis.com", "fonts.gstatic.com"):
        return route.continue_()
    blocked.append(route.request.url)
    return route.abort()


def sign_up(request, role, name, email):
    r = request.post(f"{WEB}/api/auth/sign-up", data={"role": role, "fullName": name, "email": email,
                                                      "password": PASSWORD, "acceptedTerms": True})
    return r.status


def api_sign_in(request, email):
    return request.post(f"{WEB}/api/auth/sign-in", data={"email": email, "password": PASSWORD}).status


def assert_local_only():
    uri = MONGO_URI
    if not re.match(r"^mongodb://(127\.0\.0\.1|localhost):\d+$", uri):
        sys.exit("Refusing: not a loopback MongoDB URI")


assert_local_only()
db = MongoClient(MONGO_URI, serverSelectionTimeoutMS=3000)[DB_NAME]
db.command("ping")

parent_a = f"pp1.parent.a.{RUN}@example.test"
parent_b = f"pp1.parent.b.{RUN}@example.test"
teacher = f"pp1.teacher.{RUN}@example.test"

with sync_playwright() as p:
    browser = p.chromium.launch()
    ctx_a = browser.new_context(viewport={"width": 1366, "height": 900})
    ctx_a.route("**/*", guard)
    ctx_b = browser.new_context()
    ctx_t = browser.new_context()
    anon = browser.new_context()
    for c in (ctx_b, ctx_t, anon):
        c.route("**/*", guard)

    # 1. Authentication (real auth-service, local DB)
    check("sign-up parent A", sign_up(ctx_a.request, "parent", "PP1 Parent A", parent_a) in (200, 201))
    check("sign-up parent B", sign_up(ctx_b.request, "parent", "PP1 Parent B", parent_b) in (200, 201))
    check("sign-up teacher", sign_up(ctx_t.request, "teacher", "PP1 Teacher", teacher) in (200, 201))
    page = ctx_a.new_page()
    page.goto(f"{WEB}/sign-in", wait_until="networkidle")
    page.fill("#signInEmail", parent_a)
    page.fill("#signInPassword", PASSWORD)
    page.get_by_role("button", name="Sign In", exact=True).click()
    page.wait_for_timeout(2500)
    check("parent A signs in through the UI (session cookie set)",
          any(c["name"] == "mathquest_session" for c in ctx_a.cookies()), page.url)
    check("parent B / teacher sign in", api_sign_in(ctx_b.request, parent_b) == 200 and api_sign_in(ctx_t.request, teacher) == 200)

    # 2. Grade 2 child creation + parent onboarding steps (real learner-profile API)
    r = ctx_a.request.post(f"{PROFILE_API}/learners", data={"firstName": "PP1 සඳුනි", "age": 7, "grade": 2,
                                                            "preferredLanguage": "Sinhala", "avatarId": "avatar_lion"})
    check("create Grade 2 child", r.status == 201, str(r.status))
    lid = r.json()["data"]["learnerId"]
    steps = [("adhd-information", {"diagnosisStatus": "no"}), ("snap-iv/skip", None),
             ("preferences", {"version": "LEARNING-PREF-v1.0", "visualAssistance": "always", "audioAssistance": "read_on_click",
                              "activityPace": "calm_step_by_step", "hintStyle": "visual_clue", "celebrationStyle": "gentle_star"}),
             ("social-context", {"version": "SOCIAL-CONTEXT-v1.0", "learningEnvironment": "quiet_room",
                                 "peerCollaboration": "independent_first", "parentInvolvement": "guided_together",
                                 "challengingTaskSupport": "take_a_break"})]
    for path, body in steps:
        r = ctx_a.request.post(f"{PROFILE_API}/learners/{lid}/onboarding/{path}", data=body) if body is not None \
            else ctx_a.request.post(f"{PROFILE_API}/learners/{lid}/onboarding/{path}")
        check(f"parent onboarding: {path}", r.status == 200, str(r.status))

    # 3. Child journey through the real UI (Grade 2 onboarding-v2)
    page.goto(f"{WEB}/learners/{lid}/onboarding", wait_until="networkidle")
    page.get_by_role("button", name="ක්‍රියාකාරකම අරඹමු").click()
    page.get_by_role("radio", name=re.compile("බකමූණා")).click()
    page.get_by_role("radio", name=re.compile("සත්ව යාළුවෝ")).click()
    page.get_by_role("radio", name=re.compile("නිහඬව")).click()
    page.get_by_role("button", name=re.compile("පටන් ගමු")).click()
    page.get_by_role("button", name="රතු ඇපල්").click()
    page.get_by_role("button", name="අලියා").click()
    page.get_by_role("button", name=re.compile("ඊළඟට")).click()
    ten, one = page.get_by_role("button", name="දහයේ කූර", exact=True), page.get_by_role("button", name="එකේ කැටය", exact=True)
    tray = page.get_by_role("button", name="තැටිය", exact=True)
    for _ in range(4):
        ten.click(); tray.click()
    page.get_by_role("button", name=re.compile("දහයේ කූර අයින්")).first.click()          # self-correction
    for _ in range(4):
        one.click(); tray.click()
    done = lambda: page.get_by_role("button", name=re.compile("ඉවරයි")).click()          # noqa: E731
    done()
    page.get_by_role("radio", name="74").click(); page.get_by_role("radio", name="47").click(); done()
    page.get_by_role("radio", name="කූරු 5, කැට 2").click(); done()
    page.get_by_role("button", name=re.compile("නැවත")).click()                          # instruction replay
    page.get_by_role("radio", name="35").click(); done()
    page.get_by_role("radio", name="46").click(); done()                                   # pre-probe wrong
    page.get_by_role("radio", name="56").click(); done()                                   # guided: wrong -> L2
    page.get_by_role("radio", name="57").click(); done()
    page.get_by_role("radio", name="67").click(); done()                                   # transfer
    page.get_by_role("button", name=re.compile("අවසන් කරන්න")).click()
    page.wait_for_timeout(4000)
    page.screenshot(path=str(OUT / "1_onboarding_summary.png"), full_page=True)
    check("onboarding summary shown after submission", page.get_by_text("ස්ථානීය අගය").count() > 0
          or page.get_by_text("place_value").count() > 0)

    # 4. Parent-facing results
    page.goto(f"{WEB}/parent/dashboard/learner-profiles", wait_until="networkidle")
    page.wait_for_timeout(1500)
    page.screenshot(path=str(OUT / "2_parent_learner_profiles.png"), full_page=True)
    page.goto(f"{WEB}/parent/dashboard/recommendations", wait_until="networkidle")
    page.wait_for_timeout(1500)
    page.screenshot(path=str(OUT / "3_parent_recommendations.png"), full_page=True)
    prof = ctx_a.request.get(f"{PROFILE_API}/learners/{lid}/profile").json()
    skills = {s["skillId"]: s for s in prof["skillEstimates"]}
    for sid in ("place_value", "addition"):
        s = skills.get(sid, {})
        check(f"profile: {sid} sufficient with 3 independent items", s.get("distinctQuestionsAssessed") == 3
              and s.get("isEvidenceSufficient") is True, f"n={s.get('distinctQuestionsAssessed')} level={s.get('provisionalSkillLevel')}")
    check("profile: ELP-X-REC recommendations present", bool(prof.get("structuredRecommendations")))

    # 5. Ownership restrictions
    check("parent B cannot read A's child", ctx_b.request.get(f"{PROFILE_API}/learners/{lid}").status in (403, 404))
    check("parent B cannot read A's profile", ctx_b.request.get(f"{PROFILE_API}/learners/{lid}/profile").status in (403, 404))
    check("parent B cannot submit for A's child", ctx_b.request.post(
        f"{PROFILE_API}/learners/{lid}/onboarding/math-assessment",
        data={"grade": 2, "answers": [{"questionId": "g2v2_add_pre_32_15", "userAnswer": 47}]}).status in (403, 404))
    check("teacher denied learner data", ctx_t.request.get(f"{PROFILE_API}/learners/{lid}/profile").status == 403)
    check("unauthenticated denied", anon.request.get(f"{PROFILE_API}/learners/{lid}/profile").status == 401)
    check("parent B sees no children of A", lid not in json.dumps(ctx_b.request.get(f"{PROFILE_API}/learners").json()))
    browser.close()

# 6. Persistence in the isolated database
doc = db["learner_assessments"].find_one({"learnerId": lid})
check("assessment persisted in local DB", doc is not None)
items = {i["questionId"]: i for i in doc["evaluatedItems"] + doc["excludedItems"]}
check("stored protocol onboarding-v2", doc["assessmentProtocolVersion"] == "onboarding-v2")
check("stored support events (levels 1,2)", [e["level"] for e in items["g2v2_add_support_24_33"]["supportEvents"]] == [1, 2])
check("stored transfer role", items["g2v2_add_transfer_41_26"]["probeRole"] == "transfer")
check("support excluded from proficiency", items["g2v2_add_support_24_33"]["includedInProficiencyEstimate"] is False)
dims = {
    "CP": doc["childPreferences"]["source"] == "child",
    "IC": items["g2v2_calibration_move"]["exclusionReason"] == "NON_MATHEMATICAL_ITEM",
    "IA": all(i.get("inputMethod") and i.get("interactionObservations") for i in items.values()),
    "MP": sum(1 for i in doc["evaluatedItems"] if i["includedInProficiencyEstimate"]) == 6,
    "RU": {i["representation"] for i in doc["evaluatedItems"] if i["skillId"] == "place_value"} == {"concrete", "pictorial", "symbolic"},
    "SC": bool(items["g2v2_build_tens_ones_34"]["revisionEvents"]) and bool(items["g2v2_match_blocks_to_numeral_47"]["revisionEvents"]),
    "SR": items["g2v2_add_transfer_41_26"]["independentFirstResponse"] is True and bool(doc["imlrSummary"]),
}
for k, v in dims.items():
    check(f"dimension evidence {k}", v)
check("no dimension scores stored", "dimensionscore" not in json.dumps(doc, default=str).lower())
check("learner onboardingStatus COMPLETED", db["learners"].find_one({"learnerId": lid})["onboardingStatus"] == "COMPLETED")
non_isolated = [u for u in blocked if re.search(r"//(localhost|127\.0\.0\.1):(5000|5001|5002|8003|8004)", u)]
check("browser never reached non-isolated services", not non_isolated, f"{len(blocked)} blocked: {sorted(set(non_isolated))[:3]}")
check("only synthetic users in local DB", all(u["email"].endswith("@example.test") for u in db["users"].find({}, {"email": 1})))

print(f"\n{sum(ok for _, ok, _ in checks)}/{len(checks)} checks passed | learnerId {lid} | screenshots in {OUT}")
sys.exit(0 if all(ok for _, ok, _ in checks) else 1)
