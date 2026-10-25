"""
Checks that MANUAL browsing on the PP1 frontend (http://localhost:5174) only reaches the isolated stack.

It signs in a synthetic parent, creates a Grade 2 child, then opens every parent-facing page a presenter is likely to
click (dashboard, children, learner profiles, recommendations, assessments, support info, onboarding, student
dashboard, settings) WITHOUT blocking anything. It records where every browser request actually went and fails if
any request left 5174/5101. It also checks that the decoy ports used for other components (5199/5198/5197) have no
listener, so proxied calls for those components fail instead of reaching a real service.

Usage (stack started with start-pp1-local.ps1):  python scripts\\pp1-local\\check_pp1_isolation.py
"""
import re
import socket
import sys
import time

from playwright.sync_api import sync_playwright

WEB = "http://localhost:5174"
PROFILE_API = "http://localhost:5101/api/v1"
ALLOWED = {"localhost:5174", "127.0.0.1:5174", "localhost:5101", "127.0.0.1:5101"}
EXTERNAL_OK = {"fonts.googleapis.com", "fonts.gstatic.com"}
DECOYS = {5199: "pedagogical engine", 5198: "behaviour signal", 5197: "content adaptation"}
PAGES = ["/", "/learners", "/parent/dashboard", "/parent/dashboard/learner-profiles", "/parent/dashboard/recommendations",
         "/parent/dashboard/assessments", "/parent/dashboard/support-info", "/parent/dashboard/progress",
         "/parent/dashboard/settings", "/learners/{lid}/onboarding", "/student/dashboard/{lid}", "/profile"]
failures = []


def listening(port):
    with socket.socket() as s:
        s.settimeout(0.5)
        return s.connect_ex(("127.0.0.1", port)) == 0


for port, name in DECOYS.items():
    if listening(port):
        failures.append(f"decoy port {port} ({name}) has a listener")

email = f"pp1.isolation.{int(time.time())}@example.test"
seen = []
with sync_playwright() as p:
    browser = p.chromium.launch()
    ctx = browser.new_context(viewport={"width": 1366, "height": 900})
    ctx.on("request", lambda r: seen.append(r.url))
    r = ctx.request.post(f"{WEB}/api/auth/sign-up", data={"role": "parent", "fullName": "PP1 Isolation", "email": email,
                                                         "password": "Pp1Demo2026", "acceptedTerms": True})
    assert r.status in (200, 201), r.status
    assert ctx.request.post(f"{WEB}/api/auth/sign-in", data={"email": email, "password": "Pp1Demo2026"}).status == 200
    lid = ctx.request.post(f"{PROFILE_API}/learners", data={"firstName": "PP1 Isolation", "age": 7, "grade": 2,
                                                            "preferredLanguage": "Sinhala"}).json()["data"]["learnerId"]
    page = ctx.new_page()
    for path in PAGES:
        page.goto(WEB + path.format(lid=lid), wait_until="networkidle")
        page.wait_for_timeout(800)
    browser.close()

outside = sorted({re.sub(r"^https?://([^/]+).*$", r"\1", u) for u in seen if u.startswith("http")}
                 - ALLOWED - EXTERNAL_OK)
if outside:
    failures.append(f"requests left the isolated stack: {outside}")

print(f"pages opened: {len(PAGES)} | browser requests: {len(seen)} | hosts: "
      f"{sorted({re.sub(r'^https?://([^/]+).*$', r'\1', u) for u in seen if u.startswith('http')})}")
print("PASS: manual browsing stays on 5174/5101; decoy ports have no listener" if not failures else
      "FAIL:\n  " + "\n  ".join(failures))
sys.exit(1 if failures else 0)
