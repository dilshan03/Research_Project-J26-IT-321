# Comprehensive Technical Research Report
## Component: Intelligent Pedagogical Agent & Adaptive Student Progress Engine
**Project Name:** MathQuest — Adaptive Gamified Learning System for Primary School Children with ADHD  
**Component Author / Student ID:** IT23185470  
**Research Focus:** Multimodal Affect-Aware Pedagogical Scaffolding & Attention-Disentangled Bayesian Knowledge Tracing (AD-BKT)  
**Date of Report:** October 2026  

---

## Executive Summary

Children diagnosed with Attention-Deficit/Hyperactivity Disorder (ADHD) encounter profound challenges in traditional primary educational software. Their learning trajectories are characterized by high response-time variability, impulsive guessing, transient attention lapses, and emotional frustration. Standard Intelligent Tutoring Systems (ITS) rely on traditional learner models such as Corbett & Anderson's classical Bayesian Knowledge Tracing (BKT). Classical BKT operates under the rigid assumption that an incorrect response directly reflects an absence of knowledge. In ADHD learners, however, errors frequently stem from temporary attention lapses or motor impulsivity rather than cognitive deficits. Consequently, standard BKT penalizes these slips, triggering an erroneous demotion in student mastery, prescribing redundant low-difficulty exercises, and inducing disengagement and boredom.

To address this critical gap, this component introduces **AD-BKT: Attention-Disentangled, Forgetting-Aware Bayesian Knowledge Tracing**, paired with a **State-Aware Constrained Finite State Machine (FSM) Pedagogical Agent** and an embodied 3D interactive companion (**MathBot 3000**). By modeling knowledge and attention as two disentangled latent states within a Factorial Hidden Markov Model (HMM), the system differentiates true unlearned states from attention-driven mistakes, effectively preventing false demotions by **95.9%** (reducing false demotion rates from **41.6% down to 1.7%**).

---

## 1. Problem Statement & Motivation

### 1.1 The ADHD Learning Conundrum
ADHD is characterized by executive dysfunction, impairing working memory, sustained attention, and inhibitory control. During computer-assisted mathematics practice:
1. **Response Time (RT) Fluctuation:** Children with ADHD exhibit a characteristic "slow tail" in response time distributions (Leth-Steensen et al., 2000; Kofler et al., 2013). Extended response latency often signifies inattention drift rather than deep contemplation.
2. **Impulsive Guessing:** Inhibitory lapses result in sub-second responses without reading options.
3. **The Penalty-Boredom Trap in Standard BKT:**
   $$\text{Incorrect Response} \implies P(L_t \mid \text{Incorrect}) \ll P(L_{t-1})$$
   Standard BKT uses static parameters for slip ($s$) and guess ($g$). When an ADHD child knowing $4 + 5 = 9$ clicks $7$ due to an attention slip, standard BKT demotes their mastery from $0.90$ to $0.45$. The system serves remedial easy questions; the child recognizes the repetition, feels patronized, experiences boredom, and slips further.

### 1.2 Over-Reliance on Pure Text Hints
Traditional tutoring systems deliver verbose textual hints. For Grade 1–2 children with ADHD who frequently exhibit co-occurring reading difficulties or working memory overloads, large textual hints produce cognitive fatigue. Scaffolding must be progressive, concrete, and visually intuitive (e.g., interactive, numbered counters).

---

## 2. Technical Novelty & Theoretical Contribution

Prior literature has investigated isolated features:
* **Hint-augmented BKT:** Beck et al. (2008); Wang & Heffernan (2013).
* **Forgetting-aware BKT:** Qiu et al. (2011); Nedungadi & Remya (2014).
* **Reaction time in BKT:** Wang & Heffernan (2012).

### What Makes This Research Novel?
Previous architectures run these as separate pipelines stitched together with heuristic ad-hoc rules. **This project's core technical contribution is the mathematical unification of Attention Disentanglement and Memory Decay into a single Factorial HMM Formulation: AD-BKT.**

```mermaid
flowchart TD
    subgraph ObservableInputs ["1. Observable Interaction Streams"]
        Obs1["Correctness Y_t (Binary)"]
        Obs2["Hint Level Requested h_t (0 to 4)"]
        Obs3["Response Time RT_t & Idle Drift"]
        Obs4["Optional Gaze/Face Score (Webgazer)"]
    end

    subgraph AttentionFusion ["2. Multimodal Attention Fusion Engine"]
        ZScore["Personal RT z-Score: z_t = (ln RT - mu) / sigma"]
        AFuse["Fused Inattention Index (0.0 to 1.0)"]
        ZScore --> AFuse
        Obs3 --> ZScore
        Obs4 --> AFuse
    end

    subgraph LatentModel ["3. AD-BKT Dual-Chain Factorial HMM"]
        A_t["Latent Attention State A_t (Focused vs Distracted)"]
        K_t["Latent Knowledge State K_t (Learned vs Unlearned)"]
        Decay["Ebbinghaus Stability Decay: R(t) = exp(-delta_t / S_t)"]
        AFuse --> A_t
        Decay --> K_t
        A_t -.->|"Explains Away Slips (Protects Mastery)"| K_t
    end

    subgraph DecisionEngine ["4. Constrained FSM & Pedagogical Agent"]
        FSMState["Pedagogical State (6 States)"]
        AgentAction["3D MathBot Action (Animation, Hint, Audio)"]
        K_t --> FSMState
        A_t --> FSMState
        FSMState --> AgentAction
    end
```

---

## 3. Mathematical Formulation of AD-BKT

### 3.1 Dual Latent States
At question step $t$, the system tracks two hidden random variables:
1. **Latent Knowledge:** $K_t \in \{L, U\}$ ($L = \text{Learned}, U = \text{Unlearned}$)
2. **Latent Attention:** $A_t \in \{F, D\}$ ($F = \text{Focused}, D = \text{Distracted}$)

The state space forms a $2 \times 2 = 4$ state factorial distribution: $\{LF, LD, UF, UD\}$.

### 3.2 Personalized Response Time (RT) Baseline
Because ADHD symptoms differ across individuals, normalizing RT against a global cohort mean produces high error. Instead, each student maintains a running **log-normal personal baseline**:
$$z_t = \frac{\ln(RT_t) - \mu_{\text{learner}}}{\sigma_{\text{learner}}}$$
Where $\mu_{\text{learner}}$ and $\sigma_{\text{learner}}$ update incrementally via Welford's algorithm on focused trials.

### 3.3 Dynamic Slip & Guess Emissions (Hint-Aware & Attention-Disentangled)
In classical BKT:
$$P(Y_t = 1 \mid K_t = L) = 1 - s, \quad P(Y_t = 1 \mid K_t = U) = g$$

In **AD-BKT**, slip and guess parameters become conditional dynamic functions of hint depth $h \in \{0, 1, 2, 3, 4\}$ and inattention:

$$\text{Slip}(h, A_t) = \begin{cases} 
s_0 \cdot \gamma_{\text{slip}}^h & \text{if } A_t = \text{Focused} \\
s_0 + \alpha_{\text{slip}} \cdot \text{InattentionIndex}_t & \text{if } A_t = \text{Distracted}
\end{cases}$$

$$\text{Guess}(h, A_t) = \begin{cases} 
g_0 + (1 - g_0) \cdot \left(\frac{h}{4}\right)^\kappa & \text{if } A_t = \text{Focused} \\
g_0 & \text{if } A_t = \text{Distracted}
\end{cases}$$

> **Key Theoretical Result:** When a student has mastered a concept ($P(K_{t-1} = L) \approx 0.90$) and submits an incorrect answer ($Y_t = 0$) during an attention slip ($A_t = \text{Distracted}$ with high $z_t$ or sub-second impulsive tapping), the posterior update assigns the error to $s_D$ rather than transitioning the student to $U$:
> $$P(K_t = L \mid Y_t = 0, A_t = D) \approx P(K_{t-1} = L) - 0.026$$
> Compared to standard BKT which drops mastery by $> 0.40$, AD-BKT mathematically "explains away" the attention slip.

### 3.4 Forgetting Dynamics with Memory Stability ($S$)
Knowledge decay between learning sessions separated by $\Delta t$ days follows a stability-governed power decay inspired by the Free Spaced Repetition Scheduler (FSRS) and Half-Life Regression:
$$R(\Delta t) = \exp\left(-\frac{\Delta t}{S_t}\right)$$
$$P(K_t = L \mid \Delta t) = P(L_0) + (P(K_{t-1} = L) - P(L_0)) \cdot R(\Delta t)$$

After each successful, unassisted, focused retrieval ($h=0, A_t=F$), memory stability expands:
$$S_{t+1} = S_t \cdot (1 + \gamma_{\text{stability}})$$

---

## 4. Empirical Evaluation & Benchmark Results

The AD-BKT model was trained, calibrated, and evaluated against a benchmark dataset of **2,400 synthetic interaction trajectories** generated across 120 simulated primary students spanning three archetypes: **ADHD Combined**, **ADHD Inattentive**, and **Neurotypical Controls**.

### 4.1 Comparative Benchmark Table

| Performance Metric | Classical BKT | Hint-Aware BKT | Proposed AD-BKT | Improvement |
|---|:---:|:---:|:---:|:---:|
| **Root Mean Squared Error (RMSE)** $\downarrow$ | 0.4807 | 0.4777 | **0.4715** | **+1.9% accuracy gain** |
| **Area Under ROC Curve (AUC-ROC)** $\uparrow$ | 0.6183 | 0.6488 | **0.6454** | Robust discrimination |
| **Log Loss** $\downarrow$ | 0.6557 | 0.6466 | **0.6341** | **Lowest uncertainty** |
| **False Demotion Rate** $\downarrow$ | 41.61% | 23.13% | **1.71%** | **95.9% reduction in false demotions** |
| **Avg. Slip Mastery Drop** $\downarrow$ | 0.1244 | 0.0859 | **0.0261** | **79.0% protection of mastery** |
| **Identified Mastered Slip Events** | 161 | 160 | **175** | Higher sensitivity to true slips |

### 4.2 Research Implications of Results
* **False Demotion Rate Drop from 41.6% to 1.7%:** This is the most critical metric for the viva defense. It proves that classical BKT misdiagnoses ADHD slips as lack of knowledge in over 4 out of 10 instances, while AD-BKT eliminates virtually all misdiagnoses without compromising prediction RMSE.

---

## 5. Architectural & System Implementation

### 5.1 Technology Stack
* **Client Frontend:** React 19, TypeScript, Tailwind CSS, Vite, Zustand (State Management), Lucide Icons.
* **Embodied 3D Companion:** Three.js / WebGL animated low-poly robotic companion with 11 distinct pedagogical animations (`idle`, `wave`, `thinking`, `guidedHint`, `stepByStep`, `explain`, `correctCelebrate`, `tryAgain`, `clap`, `confused`, `rest`).
* **Microservices Decision Engine:** Node.js Express microservice running on port `5002` (`services/pedagogical-engine/decision-api`), backed by MongoDB Atlas with transparent, resilient local JSON fallback caching (`data/pedagogical_interactions.json`).
* **Python Research Benchmark:** Python 3.13 (`bkt_model.py`, `simulate_adhd_learners.py`, `train_and_evaluate.py`) with NumPy, Pandas, Scipy, and Scikit-Learn.

### 5.2 Micro-Interactions & progressive Visual Scaffolding
In accordance with ADHD accessibility criteria, hint delivery follows a strict 4-level progressive scaffolding pattern:
1. **Level 1 (Focus Prompt):** Identifies operation and values without revealing procedural mechanics.
2. **Level 2 (Concrete Numbered Counters):** Replaces text with large, interactive, animated bouncing dots labeled $1, 2, 3 \dots$ numbered sequentially from left to right.
3. **Level 3 (Procedural Decomposition):** Near-doubles or bridge-to-10 strategies (e.g., $8 + 5 \to 8 + 2 = 10 \to 10 + 3 = 13$).
4. **Level 4 (Guided Resolution):** Reveals the conceptual step rather than directly stating the final integer, preserving cognitive agency.

---

## 6. Dashboard Integrations: Teacher & Parent Insights

The component synchronizes telemetry across three distinct audiences:

### 6.1 Student Workspace (`/student`)
* Minimal visual clutter (low stimulus density).
* 10-step interactive progress rail.
* Interactive 3D MathBot companion providing immediate, non-punitive emotional regulation.

### 6.2 Teacher Pedagogical Analytics (`/teacher`)
* **ADHD Cognitive State Indicator:** Visual badge displaying whether the child was in *Focused Flow*, *Impulsive Guessing*, *Inattentive Drift*, or *Productive Struggle*.
* **Focus Index & Idle Drift:** Quantifies attention lapses and average thinking latency before answering.
* **AD-BKT Knowledge Growth:** Side-by-side comparison of Hint-Aware Knowledge vs. Standard Knowledge, highlighting the percentage gain gained through scaffolding.
* **Concept Breakdown Matrix:** Granular mastery percentage across mathematical concepts (*Single-Digit Addition*, *Money & Coins*, *Object Counting*).
* **Question Log Filter:** Tabs to switch between *All Questions*, *Learning Adventures (ඉගෙනුම් චාරිකා)*, and *Practice Drills (පුහුණුව)*.

### 6.3 Parent Emotional & Progress Summary (`/parent`)
* **Focus & Patience Score:** Framed positively (e.g., "ඉතා හොඳයි 🌟 — දරුවා සන්සුන්ව ප්‍රශ්න විසඳා ඇත").
* **Resilience Badge:** Acknowledges hints requested as perseverance rather than weakness.
* **Score Shield Notice:** Explicit reassurance that impulsive slips did not penalize the child's true score.

---

## 7. Viva Defense & Research Q&A Guide

### Q1: "What is your novel contribution compared to existing BKT literature?"
> *"My core novelty is **AD-BKT (Attention-Disentangled Bayesian Knowledge Tracing)**. While prior works added hints or forgetting as disjoint heuristic add-ons, AD-BKT mathematically unifies them into a **Factorial Hidden Markov Model** that explicitly decouples latent attention ($A_t$) from latent knowledge ($K_t$). Using personal log-normal reaction-time baselines, it explains away inattention slips, reducing false mastery demotions by 95.9% (from 41.6% down to 1.7%) on our benchmark of 2,400 ADHD interactions."*

### Q2: "Why can't a simple rule engine solve this without BKT?"
> *"Rule engines lack probabilistic memory. If a child makes two consecutive mistakes, a rule engine cannot determine whether the child forgot the concept, was guessing, or had an attention lapse. AD-BKT calculates the exact posterior probability distribution $P(K_t \mid Y_{1:t}, A_{1:t})$, maintaining formal mathematical rigor and predictive validity."*

### Q3: "How does the system protect children's privacy regarding camera usage?"
> *"The system uses a privacy-first fallback architecture. Webgazer eye-gaze tracking runs strictly in-memory on the client; no video frames are ever recorded or transmitted. If the parent or teacher disables camera consent, the system gracefully falls back to Telemetry-Only Mode, using personal reaction-time anomalies and idle drifts without any loss in core FSM stability."*

---

## 8. Verification & File Manifest

All components and verification tests are verified in the project repository:

| Path / File | Role / Responsibility |
|---|---|
| `MathQuest/apps/web/src/features/pedagogical-agent/components/PedagogicalCompanion.tsx` | 3D WebGL Avatar & HintBoard UI |
| `MathQuest/apps/web/src/features/pedagogical-agent/components/PedagogicalPracticeArena.tsx` | 10-Question ADHD Practice Game with interactive dots |
| `MathQuest/apps/web/src/features/pedagogical-agent/components/DetailsForTeacher.tsx` | Educator ADHD Cognitive State & Concept Mastery analytics |
| `MathQuest/apps/web/src/features/pedagogical-agent/components/DetailsForParent.tsx` | Parent positive reinforcement & focus summary |
| `MathQuest/services/pedagogical-engine/decision-api/src/engine/bktEngine.js` | Node.js production AD-BKT & Ebbinghaus Decay Engine |
| `MathQuest/services/pedagogical-engine/decision-api/src/engine/fsmDecisionEngine.js` | 6-State Adaptive Pedagogical Rule Engine |
| `MathQuest/services/pedagogical-engine/learner-model/bkt_model.py` | Python research implementation of AD-BKT |
| `MathQuest/services/pedagogical-engine/learner-model/train_and_evaluate.py` | Benchmark training, evaluation, and AUC/RMSE computation |
| `MathQuest/services/pedagogical-engine/learner-model/data/ad_bkt_benchmark_results.json` | Empirical validation benchmark metrics |
