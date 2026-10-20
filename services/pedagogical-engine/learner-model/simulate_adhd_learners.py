"""
ADHD Learner Simulation Generator
Simulates synthetic student trajectories across three ADHD archetypes:
1. ADHD_COMBINED: High inattention variance + impulsive fast guesses (<1.5s)
2. ADHD_INATTENTIVE: Long idle latency (>12s) leading to elevated slip rate
3. NEUROTYPICAL: Baseline comparison cohort
"""

import os
import sys
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

import numpy as np
import pandas as pd

def generate_synthetic_dataset(num_students=120, steps_per_student=20, output_path=None):
    if output_path is None:
        output_path = os.path.join(os.path.dirname(__file__), 'data', 'synthetic_adhd_interactions.csv')

    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    records = []

    archetypes = ['ADHD_COMBINED', 'ADHD_INATTENTIVE', 'NEUROTYPICAL']

    for i in range(1, num_students + 1):
        std_id = f"std_{i:03d}"
        archetype = archetypes[i % len(archetypes)]
        session_id = f"sess_{i:03d}_1"

        # Archetype specific parameters
        if archetype == 'ADHD_COMBINED':
            p_l0 = 0.20
            p_t = 0.12
            base_slip = 0.25
            base_guess = 0.30
        elif archetype == 'ADHD_INATTENTIVE':
            p_l0 = 0.22
            p_t = 0.14
            base_slip = 0.22
            base_guess = 0.25
        else: # NEUROTYPICAL
            p_l0 = 0.30
            p_t = 0.20
            base_slip = 0.10
            base_guess = 0.20

        latent_mastery = 1 if np.random.rand() < p_l0 else 0

        for step in range(1, steps_per_student + 1):
            q_id = f"q_math_{step:02d}"

            # Simulate inattention index & idle time
            if archetype == 'ADHD_INATTENTIVE':
                idle_ms = int(np.random.gamma(shape=3.0, scale=4500))
                inattention = float(np.clip(idle_ms / 20000.0 + np.random.normal(0, 0.1), 0.05, 0.95))
            elif archetype == 'ADHD_COMBINED':
                if np.random.rand() < 0.4:
                    idle_ms = int(np.random.uniform(400, 1800))  # Impulsive
                else:
                    idle_ms = int(np.random.gamma(shape=2.5, scale=4000))
                inattention = float(np.clip(idle_ms / 18000.0 + np.random.normal(0, 0.1), 0.05, 0.95))
            else:
                idle_ms = int(np.random.gamma(shape=2.0, scale=1500))
                inattention = float(np.clip(idle_ms / 25000.0, 0.02, 0.40))

            response_time_ms = idle_ms + int(np.random.gamma(shape=2.0, scale=2500))

            # Simulate hint usage
            if latent_mastery == 0 and np.random.rand() < 0.45:
                hint_level = int(np.random.choice([1, 2, 3, 4], p=[0.4, 0.3, 0.2, 0.1]))
            else:
                hint_level = 0

            # Compute answer outcome
            eff_slip = base_slip + 0.20 * inattention
            eff_guess = base_guess + 0.85 * (hint_level / 4.0) * (1.0 - base_guess)

            if latent_mastery == 1:
                is_correct = 1 if np.random.rand() > eff_slip else 0
            else:
                is_correct = 1 if np.random.rand() < eff_guess else 0

            records.append({
                'student_id': std_id,
                'archetype': archetype,
                'session_id': session_id,
                'question_id': q_id,
                'concept': 'single_digit_addition',
                'step': step,
                'true_mastery_latent': latent_mastery,
                'is_correct': is_correct,
                'hint_level': hint_level,
                'idle_time_ms': idle_ms,
                'response_time_ms': response_time_ms,
                'inattention_index': round(inattention, 2)
            })

            # Mastery transition
            if latent_mastery == 0 and np.random.rand() < p_t:
                latent_mastery = 1

    df = pd.DataFrame(records)
    df.to_csv(output_path, index=False)
    print(f"Generated {len(df)} interactions to {output_path}")
    return df

if __name__ == '__main__':
    generate_synthetic_dataset()
