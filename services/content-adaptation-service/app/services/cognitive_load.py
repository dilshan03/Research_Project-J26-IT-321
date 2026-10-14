import re
from app.schemas.game_blueprint import ADHDGameSettings


def compute_cli(raw_sinhala_text: str, operation_count: int = 1) -> float:
    """
    Computes the Cognitive Load Index (CLI) for a given math problem.
    
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
        linguistic_extraneous = total_words # Fallback if no explicit numbers are present
        
    executive_interactivity = max(0, operation_count - 1)
    
    cli_score = (0.4 * intrinsic_complexity) + (0.3 * linguistic_extraneous) + (0.3 * executive_interactivity)
    
    return cli_score


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
