import re
from typing import Optional, Tuple
from app.schemas.game_blueprint import ADHDGameSettings
from app.schemas.syllabus import CustomADHDGameSettings, StudentBehaviorProfile


def compute_cli(raw_sinhala_text: str, operation_count: int = 1) -> float:
    """
    Computes the baseline Cognitive Load Index (CLI) for a given math problem.
    
    Formula: CLI = (0.4 * IntrinsicComplexity) + (0.3 * LinguisticExtraneous) + (0.3 * ExecutiveInteractivity)
    """
    intrinsic_complexity = operation_count
    
    # Calculate Linguistic Extraneous
    word_tokens = raw_sinhala_text.split()
    total_words = len(word_tokens)
    
    # Extract numbers using regex
    numbers = re.findall(r'\d+', raw_sinhala_text)
    numeric_quantity_count = len(numbers)
    
    if numeric_quantity_count > 0:
        linguistic_extraneous = total_words / numeric_quantity_count
    else:
        linguistic_extraneous = total_words  # Fallback if no explicit numbers are present
        
    executive_interactivity = max(0, operation_count - 1)
    
    cli_score = (0.4 * intrinsic_complexity) + (0.3 * linguistic_extraneous) + (0.3 * executive_interactivity)
    
    return round(cli_score, 2)


def derive_adhd_game_settings(cli_score: float, adhd_risk_level: str) -> ADHDGameSettings:
    """
    Derives ADHD-friendly game settings based on the CLI score and the learner's ADHD risk level.
    """
    if adhd_risk_level == 'HIGH' or cli_score >= 3.0:
        return ADHDGameSettings(
            step_granularity='MAXIMAL_THREE_TIER',
            distractor_count=2,
            stimulus_density='LOW',
            visual_clutter_filter=True,
            timer_enabled=False
        )
    elif cli_score >= 2.0:
        return ADHDGameSettings(
            step_granularity='TWO_TIER',
            distractor_count=3,
            stimulus_density='MEDIUM',
            visual_clutter_filter=True,
            timer_enabled=False
        )
    else:
        return ADHDGameSettings(
            step_granularity='TWO_TIER',
            distractor_count=3,
            stimulus_density='MEDIUM',
            visual_clutter_filter=True,
            timer_enabled=False
        )


def calculate_custom_cli(
    base_cli: float,
    settings: ADHDGameSettings,
    behavior_profile: Optional[StudentBehaviorProfile] = None,
) -> float:
    """
    Calculates the adjusted Cognitive Load Index (effective CLI) after accounting for
    teacher customization and student-specific behavioral scaffolding.
    """
    delta = 0.0

    # 1. Scaffolding Granularity: 3-tier fine chunking lowers executive overload
    if settings.step_granularity == 'MAXIMAL_THREE_TIER':
        delta -= 0.40
    else:
        delta -= 0.15

    # 2. Distractor count adjustments (visual search & working memory load)
    if settings.distractor_count == 2:
        delta -= 0.20
    elif settings.distractor_count == 4:
        delta += 0.25

    # 3. Visual clutter filter
    if settings.visual_clutter_filter:
        delta -= 0.25
    else:
        delta += 0.15

    # 4. Stimulus density
    if settings.stimulus_density == 'LOW':
        delta -= 0.15

    # 5. Timer and time pressure
    if settings.timer_enabled:
        delta += 0.45
    else:
        delta -= 0.10

    # 6. Behavioral profile interaction adjustments
    if behavior_profile:
        if behavior_profile.working_memory_support:
            delta -= 0.15
        if behavior_profile.inattention_level == 'HIGH' and not settings.visual_clutter_filter:
            delta += 0.30
        if behavior_profile.impulsivity_level == 'HIGH' and settings.timer_enabled:
            delta += 0.35

    effective_cli = max(1.0, min(5.0, base_cli + delta))
    return round(effective_cli, 2)


def build_custom_adhd_game_settings(
    cli_score: float,
    adhd_risk_level: str = "MEDIUM",
    custom_settings: Optional[CustomADHDGameSettings] = None,
    behavior_profile: Optional[StudentBehaviorProfile] = None,
) -> Tuple[ADHDGameSettings, bool]:
    """
    Produces final ADHDGameSettings by combining baseline heuristics with
    student behavioral traits and explicit teacher customization overrides.
    Returns (settings, is_customized).
    """
    # Start with baseline
    baseline = derive_adhd_game_settings(cli_score, adhd_risk_level)
    is_customized = False

    # Apply behavioral profile heuristics first if available
    granularity = baseline.step_granularity
    distractors = baseline.distractor_count
    density = baseline.stimulus_density
    clutter = baseline.visual_clutter_filter
    timer = baseline.timer_enabled

    if behavior_profile:
        is_customized = True
        if behavior_profile.inattention_level == 'HIGH':
            distractors = 2
            clutter = True
        if behavior_profile.impulsivity_level == 'HIGH':
            timer = False
            granularity = 'MAXIMAL_THREE_TIER'
        if behavior_profile.working_memory_support:
            granularity = 'MAXIMAL_THREE_TIER'
        if behavior_profile.activity_pace == 'CALM_STEP_BY_STEP':
            timer = False
            density = 'LOW'

    # Apply explicit teacher overrides
    if custom_settings:
        is_customized = True
        if custom_settings.step_granularity is not None:
            granularity = custom_settings.step_granularity
        if custom_settings.distractor_count is not None:
            distractors = custom_settings.distractor_count
        if custom_settings.stimulus_density is not None:
            density = custom_settings.stimulus_density
        if custom_settings.visual_clutter_filter is not None:
            clutter = custom_settings.visual_clutter_filter
        if custom_settings.timer_enabled is not None:
            timer = custom_settings.timer_enabled

    final_settings = ADHDGameSettings(
        step_granularity=granularity,
        distractor_count=distractors,
        stimulus_density=density,
        visual_clutter_filter=clutter,
        timer_enabled=timer,
    )

    return final_settings, is_customized
