# Rule Definitions (`rule_definitions/`)

## Purpose
This directory contains modular, auditable rule definitions for personalized educational recommendations.

## Structure & Planned Scope
1. **Core Data Contracts:**
   - Formal data structures for rule inputs (e.g., learner skill estimates, uncertainty bounds, SNAP-IV screening indicators, preferences) and recommendation outputs (strategy codes, reason codes, descriptions).
2. **Pedagogical Scaffolding Rules:**
   - IES-aligned mathematical scaffolding: when to trigger visual manipulatives, when to fade hints, and when to introduce challenge problems.
3. **Attention & Executive Functioning Rules:**
   - Guidelines-informed adaptations: micro-task chunking, visual focus anchors, auditory pacing, and calm break recommendations.
4. **Preference & Agency Rules:**
   - Alignment with child-expressed preferences (visual themes, companion avatars, celebration style).
5. **Conflict Resolution:**
   - Explicit priority hierarchy handling conflicting signals (e.g., child pacing vs. parental supervision goals).

*Note: No rules or arbitrary scoring thresholds are implemented yet. Rules will be populated in subsequent steps based on expert validation.*
