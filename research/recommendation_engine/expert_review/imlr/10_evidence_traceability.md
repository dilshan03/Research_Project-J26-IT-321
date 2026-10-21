# 10. Evidence-to-Design Traceability: Boston Children's Hospital Guidance

> **SUPPORTING BACKGROUND ONLY: NOT VALIDATION OF IMLR.** The source below is a parent- and child-facing guide to
> self-management strategies for children with ADHD at home and with homework. It does **not** evaluate
> assessments, mathematics teaching, or any part of the IMLR protocol.
>
> The references show only that certain *general design considerations* (short breaks, breaking work into small
> ordered steps, awareness that tasks with several simultaneous demands can be hard) are also discussed in this
> guide. They are **not** used for mathematics content, question formats, item counts, visual layouts or scoring.
>
> All related decisions remain **OPEN**. No expert has reviewed or approved these links.

## 10.1 Source verification

| Field | Verified value | How verified |
|---|---|---|
| Title | *Guided Self-Management Tools for ADHD: Children 6-12*, Version 1.1 | Cover, PDF p. 1 |
| Authors | Erica Lee, PhD, and Keneisha Sinclair-McBride, PhD (equal authors), Boston Children's Hospital / Harvard Medical School | Credits page, PDF p. 41 |
| Other contributors | Clinicians listed under a "Reviewers" heading on PDF p. 41 (incl. David R. DeMaso, Jonas Bromberg, Eugene D'Angelo, Louis Vernacchio, Betsy Brooks, Bhavana Arora, Heather J. Walter); graphic designer Zoë Judd | PDF p. 41. Roles read from extracted text, so the exact layout grouping should be confirmed visually. |
| Year | **2020, from the PDF file metadata only** (creation date 2020-01-03). No year is printed in the document text. | `pypdf` metadata; full-text search found no printed year or copyright line |
| File | `research/recommendation_engine/evidence_base/sources/Guided Self-Management Tools for ADHD - Children 6-12.pdf` (44 PDF pages) | — |
| Page numbering | **The PDF has no printed page numbers.** All references below use **PDF page numbers** (page 1 = cover). | Text extraction plus a scan of the top and bottom margins of every page found no page-number text |
| Intended use | Home strategies for parents and children with ADHD, ages 6–12 (PDF p. 2, Introduction) | PDF p. 2 |

**How the passages were checked:** text was extracted with `pdfplumber` / `pypdf` (already installed; nothing new
installed). Quotations are verbatim from that text, except that typographic ligatures (ﬁ, ﬀ, ﬃ) are written as normal
letters and quotation marks inside a quotation are shown as single quotes. Every quotation and section heading
below was checked by script against the extracted text of its cited PDF page (12 quotations, 13 headings, all
found). The extraction cannot show images or layout, so the reviewer may wish to confirm each passage in the PDF.

**Notes for the research team (no changes made):**
- `evidence_base/references.json` (`REF-BCH-2020`) lists several reviewers as co-authors. The PDF credits page
  lists them under "Reviewers".
- Existing project documents cite this guide as "printed pp. …". Because the PDF has no printed page numbers, those
  numbers are in practice PDF page numbers. The specific pages cited for Skill 2 (p. 8), Skill 6 (pp. 26–30) and
  Skill 8 (p. 34) match the PDF pages below.

## 10.2 Verified sections

| Skill | Section heading (as printed) | PDF pages |
|---|---|---|
| Skill 2 | HOMEWORK HELP (Parent handout) | 7–10 |
| Skill 6 | HOW TO GET THINGS DONE (Parent handout, Roadmap worksheets, Tips) | 26–30 |
| Skill 8 | HOW TO MANAGE MY TIME (Parent handout, worksheets, Tips) | 34–37 |

## 10.3 Traceability matrix

**Evidence status:**
- **BACKGROUND:** the source discusses a closely related general consideration.
- **PARTIAL:** related, but in a different context or with a stated limitation.
- **GAP:** the source does not address it.

### D-C05: Optional breaks (clinical supervisor)

| Design consideration in the IMLR draft | Verified passage | What it supports | What it does **not** support | Status |
|---|---|---|---|---|
| Short breaks can be offered during effortful work, after which the child returns to the task | Skill 2, PDF p. 8 (*Break bigger assignments or projects down into smaller steps*): "Encourage your child to take short breaks as needed to stretch or do an in-place exercise (like jumping jacks) or have a small snack before going back to work." | The general idea of short, as-needed breaks during demanding schoolwork, followed by a return to the work | Breaks during an **assessment**; a child-operated break button; returning to the **same question** versus a new one | BACKGROUND (homework context) |
| Breaks for children who find sustained tasks difficult | Skill 8, PDF p. 34 (*Plan for Homework*): "If you have trouble paying attention or doing a task for a long time, remember to schedule in short breaks (e.g., a 5-minute break after completing each homework assignment)." | Short breaks as a recognised strategy when attention over a long task is hard | Child-initiated breaks **within** a question. The source describes **scheduled** breaks **after** a task. The 5-minute example is not a duration or threshold for MathQuest. | PARTIAL |
| Breaks between steps | Skill 6, PDF p. 26 (*Here's how to get things done*): "If you have trouble paying attention, it can help to take short breaks (5 minutes or less) after you complete each step." | Breaks placed between steps of a task | Any break timing rule for the probe. The same page notes "This skill is most useful for older children." | PARTIAL |
| A break can be pleasant after effort | Skill 8, PDF p. 37 (*Common parent concerns*): "Even a short break to do something they enjoy can feel great after working hard!" | Breaks framed positively, not as failure | — | BACKGROUND |
| The reason for a break is never asked | — | — | Not addressed by the source | GAP |
| A break is not counted as help in scoring | — | — | Not addressed. Scoring is outside this source's scope and is not cited. | GAP (out of scope) |
| Break use is recorded (start/end) as context only | — | — | Not addressed. Data recording is a clinical/ethics decision (D-C07). | GAP |

### D-E09: Teaching method and scripts (mathematics educator)

| Design consideration in the IMLR draft | Verified passage | What it supports | What it does **not** support | Status |
|---|---|---|---|---|
| Present the teaching as small, ordered steps rather than one large demand | Skill 6, PDF p. 26 (*Here's how to get things done*): "If possible, break your task up into 'mini tasks.' Many goals can feel less difficult or overwhelming if you approach them one step at a time. … split your task up into smaller, more manageable 'mini tasks'. Be sure to decide what order the steps go in." | The general principle that work broken into small, ordered steps can feel less overwhelming | The specific steps (count each box → number tags → worked demonstration); any mathematics teaching method. Skill 6 teaches children to **plan their own tasks**; it is not an instructional method. | PARTIAL |
| Check understanding and walk through with the child | Skill 2, PDF p. 8: "First, make sure your child understands the assignment. If they don't, walk through it with them or help them problem solve how to figure out what they need to do." | An adult checking understanding and walking through a task, as general support | Teaching scripts, wording, or when each support level appears | BACKGROUND (homework context) |
| Younger children may need more guided support | Skill 2, PDF p. 8 (*Provide support and supervision*): "The younger your child is, the more homework support they will need. Younger children may do better if you keep them company while they work and walk through their assignments with them." | Age-related need for more guidance, relevant to Grade 1 | How much teaching support, or the number of teaching questions | BACKGROUND (homework context) |
| Age suitability of a "mini-tasks" approach for 6-year-olds | Skill 6, PDF p. 26: "This skill is most useful for older children." | — | **Limits** using Skill 6 for Grade 1. The source itself suggests the planning skill suits older children better. | GAP / caution |
| Counting vs matching vs estimation; number tags; worked demonstration; Sinhala scripts | — | — | Not addressed. These are mathematics education decisions for the educators and are not cited to this source. | GAP (out of scope) |

### D-C02: Attention and working-memory demands (clinical supervisor)

| Design consideration in the IMLR draft | Verified passage | What it supports | What it does **not** support | Status |
|---|---|---|---|---|
| Tasks that need several skills at once can be harder for children with attention difficulties | Skill 2, PDF p. 9 (*How can Homework Help strategies help my family?*): "Doing schoolwork can be especially challenging for children with ADHD, as it requires using many different skills at the same time, such as working memory, organization, planning, and time management." | Awareness that simultaneous demands (incl. working memory) can be challenging | Any limit on the number of groups, objects or instruction length | BACKGROUND |
| Starting, focusing and staying on track can be hard | Skill 6, PDF p. 30 (*How can getting things done help my family?*): "they may have a hard time getting started on a task, figuring out what to focus on, or staying on track once they get going." | A general reason to keep each step clear and focused | Specific probe design choices | BACKGROUND |
| Focusing on one task at a time | Skill 8, PDF p. 37: "When your child has ADHD, it can be challenging for them to pay attention, focus on one task at a time, and keep track of their time." | General consideration supporting one clear question at a time | — | BACKGROUND |
| One step at a time reduces overwhelm | Skill 6, PDF p. 26 (see D-E09 above) | Presenting one step at a time | Item counts or session length | PARTIAL (source notes older children) |
| Three groups of up to 9 objects; instruction length; on-screen visual layout | — | — | Not addressed. Item design and visual layout are **not** cited to this source. | GAP (out of scope) |

**Important framing for D-C02:** the guide describes children **with ADHD**. The IMLR assessment is for **all**
Grade 1 children and must not treat children differently because of a parent report or SNAP-IV results. These
passages are background for keeping demands reasonable for every child. They are not a reason to adapt the
assessment by diagnosis.

## 10.4 Explicitly not supported by this source

This guide is not cited for:
- the mathematics concept;
- number ranges;
- the three-choice format;
- the number of pre-teaching, teaching or transfer questions;
- the visual layouts or the density confound;
- the transfer timing;
- the independent / helped / unknown classification;
- any scoring or summary of results.

It also does not validate IMLR, learning readiness or any assessment. Evidence for mathematics teaching and assessment
design must come from the mathematics educators' review and appropriate mathematics-education sources.

## 10.5 Status
- All 29 decisions in [08_decision_log.md](08_decision_log.md) remain **OPEN**.
- No expert feedback is recorded here. Reviewers may disagree with any link above. Please note this in your form.
