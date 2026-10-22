# Test Scenarios & Synthetic Profiles (`test_scenarios/`)

## Purpose
This directory contains synthetic learner profiles and offline test suites to verify rule execution, boundary conditions, and recommendation safety.

## Planned Scope
1. **Synthetic Learner Archetypes:**
   - Diverse mock profiles representing varied learner states without using sensitive real-child data:
     - Profile A: High mathematical ability + high inattention indicators.
     - Profile B: Emerging mathematical foundations + high need for visual scaffolding.
     - Profile C: Insufficient evidence boundary cases ($n < 3$ items attempted).
     - Profile D: Divergent parent vs. child preference selections.
2. **Predictability & Safety Unit Tests:**
   - Pytest suites verifying that rules trigger under expected conditions, never assign negative or diagnostic labels, and handle missing evidence gracefully.
