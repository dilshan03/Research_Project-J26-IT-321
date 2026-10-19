# MathQuest — Complete Interactive Child Onboarding Redesign

Implement a complete, meaningful, theme-based child onboarding activity experience for Grades 1–5 within the existing MathQuest Learner Profile & Prediction Engine.

**Project:** MathQuest — Adaptive Sinhala Mathematics Game for ADHD-Related Learning Support  
**Component:** Learner Profile & Prediction Engine  
**Age group:** 6–10 years  
**Grades:** 1–5

**Primary design reference:**
`docs/architecture/MathQuest_Onboarding_Activity_Design.md`

Read this document and inspect the existing child onboarding implementation before making changes. Use the existing architecture and components wherever possible.

This is an implementation task, not just an analysis task.

## 1. Current problems

The current onboarding is not satisfactory.

- Grade 1 has only one interactive Living Canvas activity.
- That activity uses a single visual scene and the interaction does not feel educationally meaningful.
- Grades 2–5 display generic fallback question interfaces instead of engaging grade-specific activities.
- The child does not experience sufficient variety in backgrounds, themes, objects or interactions.
- Some activities resemble ordinary quizzes instead of a child-friendly baseline assessment.
- The current implementation does not adequately collect evidence for all seven research dimensions.
- Visual elements sometimes appear decorative rather than connected to the mathematical task.
- The experience does not feel like a coherent journey.

**Do not simply change the background of the existing activity. Redesign the activity interactions themselves while preserving the existing onboarding infrastructure.**

## 2. Overall objective

Build a reusable, visually engaging onboarding activity system that:

1. Provides meaningful, age-appropriate interactive activities.
2. Supports Grades 1–5 with genuinely different mathematical content.
3. Uses multiple backgrounds, mini-worlds and visual themes.
4. Measures all seven research dimensions through appropriate observations.
5. Collects trustworthy evidence for future IMPSA and IMLR predictions.
6. Gives children opportunities to explore, attempt, receive support and transfer learning.
7. Maintains a calm, ADHD-friendly learning environment.
8. Fits within an approximately five-minute child onboarding target where feasible, without imposing a strict time limit.
9. Uses simple Sinhala instructions.
10. Integrates with the existing onboarding-v2 contracts and backend.

Do not replace the existing parent onboarding, authentication, database architecture, learner management or ELP-X calculations.

## 3. Seven required assessment dimensions

The onboarding must intentionally collect evidence for:

**D1 — Initial Mathematical Proficiency**

Observe the child's independent mathematical understanding through unassisted first attempts.

**D2 — Instruction Comprehension**

Observe whether the child understands simple instructions independently or needs them repeated or clarified.

**D3 — Support Responsiveness**

Observe how the child responds to different levels of guidance.

**D4 — Representation Understanding**

Observe whether the child can connect mathematical ideas across objects, pictures, quantities and symbols.

**D5 — Self-Correction and Strategy**

Observe meaningful revisions, strategy changes and the child's approach to solving tasks.

**D6 — Interaction Accessibility and Engagement**

Collect basic interaction and accessibility evidence without treating motor difficulties, slowness or inactivity as mathematical failure or ADHD symptoms.

**D7 — Child-Expressed Preferences**

Allow the child to select preferred visual or interaction options directly rather than relying entirely on parent-selected preferences.

These dimensions must be represented in actual activities and event data, not merely listed in metadata.

A single activity may contribute evidence to multiple dimensions where justified.

Do not claim that a short onboarding assessment clinically measures ADHD or diagnoses ADHD presentations.

Gameplay behaviour classification belongs to the Behaviour Signal Engine team member. Do not implement their model.

## 4. Reusable activity architecture

Design an extensible activity framework with separate configuration for:

- Grade.
- Activity ID.
- Assessment protocol version.
- Mathematical concept.
- Assessment dimension tags.
- Scene or theme ID.
- Background.
- Visual objects and assets.
- Interactive task type.
- Sinhala instruction.
- Optional audio.
- Correct answer or expected completion conditions.
- Available support levels.
- Representation types.
- Independent probe.
- Guided probe.
- Transfer probe.
- Evidence and interaction events.

Avoid duplicating a completely separate React component for every activity.

Create reusable activity templates where appropriate, such as:

- Drag objects into a target.
- Tap or select an object.
- Match quantities with numerals.
- Group and arrange objects.
- Build numbers using manipulatives.
- Match equivalent visual representations.
- Compare quantities.
- Arrange patterns or sequences.
- Measure using visual units.
- Select or construct a correct result.

Prefer simple, robust, accessible interactions over technically complex mini-games.

The activity engine should be extensible enough to add more mathematical concepts and themes later.

## 5. Multiple visual themes and backgrounds

The onboarding must support multiple meaningful scenes rather than a single image.

Create a reusable theme configuration so the same interaction template can work with different appropriate environments.

Suggested mini-worlds:

**Nature Garden**
- Trees, flowers, fruits, leaves, butterflies and baskets.
- Appropriate for counting, comparing quantities and grouping.

**Animal Friends**
- Squirrels, birds, elephants and other friendly animal characters.
- Appropriate for object distribution, grouping and simple mathematical tasks.

**Toy Room**
- Building blocks, toy cars, balls, shelves and containers.
- Appropriate for quantities, number building, shapes and sorting.

**Little Shop**
- Products, shelves, baskets and price tags.
- Appropriate for addition, subtraction, money and decimal concepts.

**Shape Playground**
- Geometric shapes, tiles, structures and visual puzzles.
- Appropriate for geometry, patterns and representation matching.

**Measurement Workshop**
- Rulers, tiles, rectangles, containers and measuring objects.
- Appropriate for perimeter, measurement and unit concepts.

**Pattern Island**
- Paths, stepping stones, number sequences and repeating patterns.
- Appropriate for sequences, mathematical relationships and progression.

### Visual design requirements

- Use several visually distinct backgrounds or scenes throughout onboarding.
- Do not use the exact same full-screen illustration for every stage.
- Backgrounds should relate meaningfully to the activity.
- Interactive objects must be visually distinguishable from decorative objects.
- Use a consistent visual art direction across all themes.
- Prefer calm, colourful, welcoming visuals without excessive decoration.
- Avoid irrelevant images, overlapping elements, tiny controls and crowded scenes.
- Use large touch targets and responsive layouts.
- Maintain sufficient text contrast over backgrounds.
- Avoid flashing effects, excessive movement and unnecessary sound.
- Support reduced-motion preferences.
- Do not rely on colour alone to communicate instructions.
- Preserve visual clarity on desktop and tablet.

### Asset handling

First inspect existing image, SVG, icon and animation assets.

Reuse suitable assets where possible.

Where additional visuals are needed, use lightweight reusable SVG illustrations or existing approved assets rather than depending on unavailable remote images.

Do not use random external images or unsupported asset URLs.

Do not introduce a heavy graphics or game-engine dependency unless absolutely necessary.

If asset generation is not available, implement coherent CSS/SVG scenes and report any illustration work that remains.

## 6. Child preference selection

Create a welcoming introductory stage where the child makes simple choices.

Examples:

- Choose a friendly companion.
- Choose a preferred visual world or theme.
- Choose gentle sound or quiet mode.

The selection should use large visual cards rather than a complicated settings form.

Record the selected options using the existing `ChildPreferenceChoices` contract with `source: "child"`.

Keep parent-reported and child-expressed preferences separate.

The chosen theme should influence the subsequent activity presentation where practical, but should not change mathematical difficulty or invalidate assessment comparability.

If a theme changes, the correct answer and mathematical evidence must remain equivalent.

## 7. Non-mathematical instruction calibration

Include a short activity that checks whether the child can understand and follow a simple instruction without requiring mathematical knowledge.

Example:

**Nature Garden — Put the red leaf on the tree.**

The child sees a leaf and a tree.

Allow the child to:

- Drag the leaf onto the tree.
- Or tap the leaf and then tap the tree.

Collect:

- Whether the instruction was completed.
- Instruction replays.
- Clarification requests.
- Response duration.
- Interaction mode.
- Whether the child needed support.

Do not score this activity as a mathematics question.

Do not interpret difficulty with this activity as proof of inattention or ADHD.

Provide a gentle continuation path if the child struggles.

## 8. Grade-specific mathematics activities

Implement grade-appropriate activities based on the design document and the Sri Lankan primary mathematics curriculum.

Avoid simply changing numbers between grades.

### Grade 1 — Garden and Animal Friends

**Activity A: Counting and Quantity**

Theme: Nature Garden.

Example: Help a squirrel place four fruits in a basket.

The child moves the correct number of fruits into a basket and confirms the selection.

Collect the independent first attempt.

**Activity B: Number Representation**

Theme: Toy Room.

Example: Match three objects to the numeral 3.

Use objects, visual quantities and number symbols.

Allow the child to revise a selection before confirming.

**Activity C: Learning and Transfer**

Theme: Animal Friends.

Pre-probe: Compare two groups of animals.

If necessary, provide guidance using one-to-one matching.

Transfer: Present different groups with different visual objects and ask the child to apply the idea independently.

The transfer activity must not simply repeat the same numbers and arrangement.

### Grade 2 — Toy Shop and Number Blocks

**Activity A: Place Value**

Theme: Number Blocks.

Build a two-digit number using tens and ones.

**Activity B: Representation Matching**

Theme: Little Shop.

Match a collection of grouped objects to the correct two-digit numeral.

**Activity C: Learning and Transfer**

Use two-digit addition or subtraction with visual support.

Present an independent attempt, a guided example if needed, and a genuinely new unassisted transfer item.

### Grade 3 — Grouping and Fraction Garden

**Activity A: Place Value**

Build a three-digit number using hundreds, tens and ones.

**Activity B: Fractions**

Use a visual fraction activity to match parts of an object or shape to a fraction symbol.

**Activity C: Learning and Transfer**

Use equal-group multiplication with a guided example and a different independent transfer task.

### Grade 4 — Shape Playground and Measurement Workshop

**Activity A: Perimeter**

Use visual unit tiles or lengths to determine the perimeter of a simple rectangle.

**Activity B: Equivalent Fractions**

Use fraction strips or geometric representations to identify equivalence.

**Activity C: Learning and Transfer**

Provide an independent problem, targeted support, and a new perimeter or fraction problem testing transfer of the same concept.

### Grade 5 — Market and Pattern Island

**Activity A: Decimal Place Value**

Represent decimals with appropriate visual manipulatives.

**Activity B: Representation Understanding**

Match a mathematical representation to an appropriate equivalent symbolic or visual form.

Choose grade-appropriate concepts based on curriculum review.

**Activity C: Learning and Transfer**

Use a number-pattern or decimal-related problem with a new independent transfer item after appropriate support.

### Grade-specific requirements

Each grade must have:

- A meaningful independent mathematics activity.
- A representation activity.
- A guided-learning sequence.
- A separate independent transfer item.
- Age-appropriate instructions.
- At least two visually distinct mini-scenes.
- Proper evidence logging.

Use the provided design document as the main content reference. If an activity's curriculum appropriateness is uncertain, keep its content marked for expert review rather than claiming it is validated.

## 9. Graduated support

Implement a reusable support system.

Suggested levels:

**Level 1 — Clarification**
Repeat or simplify the instruction without revealing the solution.

**Level 2 — Visual Cue**
Highlight or demonstrate the relevant relationship without directly providing the answer.

**Level 3 — Worked Demonstration**
Show an appropriate worked example or guided manipulation.

Important:

- Record which level was used and when.
- Distinguish help before the first answer from help after the first answer.
- Never classify an assisted first response as independently correct.
- Never automatically give hints before an independent probe.
- Do not use negative feedback when the child requests help.

For IMLR-related evidence, use the progression:

Independent pre-probe → Support when needed → New independent transfer probe.

The transfer probe must not reveal the previous solution and must use a distinct item from the same concept family.

If the child already demonstrates the concept independently, record that appropriately rather than falsely claiming learning occurred because of support.

## 10. Evidence collection and assessment integrity

Integrate the activity system with the existing onboarding-v2 contracts.

Capture meaningful fields where supported:

- `assessmentProtocolVersion`
- `activityId`
- `itemId` or existing question ID
- `conceptId`
- `dimensionTags`
- `probeRole`
- `itemFamilyId`
- `representation`
- `firstConfirmedResponse`
- `isFirstResponseCorrect`
- `supportBeforeFirstResponse`
- `supportEvents`
- `instructionEvents`
- `revisionEvents`
- `interactionMode`
- Child preference choices
- Genuine response duration
- Activity completion or skipped status
- Evidence-quality flags where available

Reuse the actual current schema names where they differ from the design document. Introduce only necessary additive fields.

### Critical rules

1. Submit only activities actually presented to the child.
2. Never fabricate answers, attempts or response times.
3. Never hardcode first-response correctness.
4. Validate correctness on the backend wherever possible.
5. Keep unattempted activities separate from incorrect attempted answers.
6. Record help accessed before the first response accurately.
7. Preserve meaningful first-response evidence even if the child later corrects their answer.
8. Never treat calibration or preference activities as mathematics proficiency evidence.
9. Do not treat interactions as clinical ADHD symptoms.
10. Record incomplete or unavailable evidence honestly.

Reuse any backend evidence-integrity fixes already implemented by B1.

Do not overwrite historical assessment records.

## 11. Navigation, progress and persistence

Provide a coherent child onboarding journey.

The child should understand what to do next without reading long paragraphs.

Requirements:

- Smooth progression between activities and scenes.
- Clear instructions and visual cues.
- Ability to repeat an instruction.
- Optional assistance.
- No mandatory countdown timer.
- Gentle encouragement.
- No negative scoring animations.
- Correct loading, disabled, error and completion states.
- Avoid accidental double submission.
- Preserve assessment progress where the current architecture supports it.
- Implement safe pause and resume if feasible without introducing extensive scope.
- Do not mark onboarding completed before the required assessment evidence has been processed successfully.
- After completion, return to the existing parent-facing assessment summary.

Make the journey feel like a short exploratory adventure rather than an examination.

## 12. Sinhala and accessibility requirements

Child-facing instructions must use short, understandable Sinhala appropriate to the grade.

- Prefer one instruction at a time.
- Use simple verbs and familiar examples.
- Provide visual guidance.
- Reuse existing audio where available.
- Do not pretend audio is available if no asset or implementation exists.
- Keep mathematical terminology age-appropriate.
- Ensure Sinhala text renders without clipping.
- Use readable typography.
- Provide large controls and accessible alternatives to dragging.
- Ensure activities work with mouse and touch where supported.
- Do not penalize a child for using an alternative interaction method.

The child-facing UI can be playful, but it must be less visually distracting than a typical entertainment game.

## 13. Architecture and compatibility

Work primarily in:

`apps/web/src/features/learner-profile/`

and the minimum necessary learner-profile backend files.

Inspect the current implementation before choosing exact file names.

Preserve:

- Authentication and parent authorization.
- Existing child profiles.
- Existing parent ADHD information.
- Optional SNAP-IV flow.
- Parent learning preferences.
- Social context.
- Existing onboarding-v1 compatibility.
- Onboarding-v2 contracts.
- ELP-X Bayesian calculations.
- Current MongoDB collections and historical records.
- Existing parent dashboard routes and results.
- Other team members' components.
- Student Dashboard and Test 3D Agent floating development buttons.

Do not modify the Behaviour Signal Engine, Content Adaptation Engine or Pedagogical Engine.

Do not introduce ADHD diagnostic classification.

Do not modify the model-development files being worked on in parallel.

## 14. Implementation strategy under the two-day deadline

Avoid spending most of the time writing a lengthy architecture report.

Implement directly in a focused sequence:

**Part 1 — Activity and theme framework**

Create reusable scene, theme, activity and interaction configuration.

**Part 2 — Complete Grade 1**

Implement all six onboarding stages with meaningful visuals and working evidence collection.

**Part 3 — Extend Grades 2–5**

Reuse the framework with genuinely different curriculum-aligned mathematical concepts, scenes and interactions.

**Part 4 — Backend integration**

Ensure activity outcomes can be submitted through the existing onboarding API using truthful evidence.

**Part 5 — Verification**

Test the complete experience and check for regressions.

Do not start unrelated refactoring.

If the complete scope cannot be safely completed in one execution, finish a coherent working subset, clearly report the remaining work, and stop rather than leaving partially connected or misleading features.

## 15. Verification

Run targeted tests and checks for:

- Grade 1–5 activity selection and rendering.
- Correct activity progression.
- Theme/background switching.
- Child preference selection.
- Instruction calibration.
- Independent response tracking.
- Graduated support.
- Transfer probe identity and correctness.
- Only attempted items being submitted.
- No fabricated timing.
- Onboarding-v2 request compatibility.
- Existing parent workflow compatibility.
- No changes to ELP-X calculations.

Run the frontend TypeScript check and relevant backend database-free tests.

Do not connect to the live Atlas database.

Do not install unnecessary dependencies.

Do not fix unrelated errors in other research components.

Do not commit or push.

## 16. Final output

Keep the completion report concise but specific.

Provide:

1. Files created and modified.
2. Reusable activity templates implemented.
3. Themes and backgrounds available.
4. Actual working activities for each grade.
5. Which of the seven dimensions have genuine evidence collection.
6. Backend/API integration status.
7. Tests executed and results.
8. Any missing assets or incomplete functionality.
9. Suggested commit message.

**Most important:** I want actual interactive, meaningful and visually varied onboarding activities — not a single scene, generic fallback questions, decorative image changes or hardcoded demonstration results.

Implement the approved child onboarding activity system while preserving the rest of MathQuest.