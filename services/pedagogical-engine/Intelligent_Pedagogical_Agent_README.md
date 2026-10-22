# MathQuest – Intelligent Pedagogical Agent & Adaptive Student Progress Engine

*Component 4 | Pedagogical Scaffolding & Knowledge Tracing*

## Overview

This component of MathQuest provides adaptive pedagogical scaffolding and intelligent knowledge tracking during Sinhala mathematics gameplay for Sri Lankan Grade 1–5 students with ADHD-related learning support needs.

It combines interaction tracking, personalized reaction-time baselining, behavioural signal outputs received from Component 3 (Gameplay Interaction & Behaviour Signal Engine), an embodied 3D companion robot (MathBot 3000), 4-tier visual scaffolding, and the proposed Attention-Disentangled Bayesian Knowledge Tracing (AD-BKT) Algorithm to identify learner knowledge states and provide supportive interventions without penalizing attention-driven mistakes.

## Main Functionalities

1. *Gameplay Interaction Tracking:* Records clicks, response times, answer selections, hint requests, incorrect attempts, and inactivity.
2. *Reaction-Time & Inattention Estimation:* Evaluates response times against a personalized log-normal baseline to detect impulsive guessing or inattention drift.
3. *Multimodal Signal Ingestion:* Ingests real-time behavioural and gaze analysis signals from Component 3 (Gameplay Interaction & Behaviour Signal Engine).
4. *Knowledge State Tracking:* Uses AD-BKT to decouple knowledge mastery from temporary attention lapses.
5. *Pedagogical Decision Engine:* Evaluates learner state in real time and triggers appropriate supportive interventions across six predefined pedagogical states.
6. *Embodied 3D Companion:* Uses Three.js WebGL to render an animated companion robot (MathBot 3000) with 11 animations providing non-punitive encouragement.
7. *Progressive Visual Scaffolding:* Delivers 4-tier visual hints with interactive numbered counter dots instead of heavy text.
8. *Pedagogical Analytics:* Provides cognitive state insights and mastery summaries for teachers and parents.

## Six Pedagogical States

1. Focused Flow / Engaged
2. Impulsive Rush
3. Inattention Drift
4. Productive Struggle
5. Cognitive Overload / Frustration
6. Concept Mastery Achieved

## Proposed AD-BKT Algorithm

*Attention-Disentangled Bayesian Knowledge Tracing (AD-BKT)* is the proposed core algorithm of Component 4.

It is designed to:
- Track two decoupled latent states: Latent Knowledge ($K_t$) and Latent Attention ($A_t$).
- Adjust slip and guess emission probabilities dynamically based on hint level and inattention.
- "Explain away" incorrect answers caused by distraction, protecting true mastery from false demotions.
- Model forgetting between practice sessions using Ebbinghaus memory stability decay.
- Strengthen memory stability following unassisted, focused recall.

The AD-BKT approach has been benchmarked on synthetic learner trajectories and is undergoing clinical evaluation.

## Machine Learning Approach

- *AD-BKT Algorithm:* Proposed Factorial Hidden Markov Model (HMM) separating knowledge mastery from inattention slips.
- *Log-Normal RT Baseline:* Online estimation of personalized response latency mean and variance for z-score calculation.
- *Finite State Machine (FSM):* Rule-based pedagogical policy engine for real-time scaffolding decisions.
- *Ebbinghaus Memory Stability Model:* Spaced retention and forgetting curve estimation across sessions.
- *Classical BKT:* Standard baseline model used for comparative benchmark evaluation.

## Technologies

| Technology | Purpose |
|---|---|
| React + TypeScript | Frontend practice and adventure gameplay |
| Three.js | 3D MathBot companion and WebGL animations |
| Node.js + Express | Pedagogical decision API microservice |
| MongoDB | Gameplay telemetry logs and student progress data |
| Python + scikit-learn | AD-BKT benchmark simulation and evaluation |
| Tailwind CSS | Low-distraction UI styling |

## System Workflow

Learner Gameplay
→ Gameplay Interaction Tracking & Component 3 Behaviour Signals
→ Personalized RT Baseline & Inattention Estimation
→ AD-BKT Knowledge Tracing
→ FSM Pedagogical Decision Engine
→ 3D Companion & Visual Hint Scaffolding
→ Pedagogical Analytics

## Current Development Status

*Implemented / Initial Development*
- Gameplay interaction and reaction-time tracking
- Factorial HMM AD-BKT mathematical model
- Node.js Express decision API service (Port 5002)
- Telemetry logging and student progress API routes
- Dual persistence with MongoDB and local cache
- Three.js 3D MathBot companion with 11 animations
- 4-tier visual scaffolding with interactive counter dots
- Practice and adventure gameplay arenas
- Initial teacher and parent analytics views
- Python simulation and evaluation benchmark

*Ongoing / Planned*
- Integration with Component 3 webcam behaviour analysis outputs
- Adding additional 3D companion agents and character options
- Forgetting curve-based spaced repetition review scheduling
- Further updates and advanced visual analytics for teacher and parent dashboards
- In-school clinical evaluation with ADHD students

## Privacy and Ethics

Webcam-based behavioural and gaze monitoring is managed by Component 3 (Gameplay Interaction & Behaviour Signal Engine) under explicit user consent. This pedagogical engine only consumes processed high-level behavioural states and operates seamlessly in telemetry-only mode when webcam signals are unavailable.

MathQuest is an educational support system and is not intended to diagnose ADHD.

---

*Research Project:* MathQuest – Adaptive Sinhala Mathematics Game for ADHD-Related Learning Support

*Component:* Intelligent Pedagogical Agent & Adaptive Student Progress Engine
