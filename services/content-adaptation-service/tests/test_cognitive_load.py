from app.services.cognitive_load import compute_cli, derive_adhd_game_settings


def test_cognitive_load_simple_addition():
    # Problem 1: Simple direct addition (Grade 1/2)
    # Translation: "Mala has 5 apples. Nimal gave her 3 apples. How many apples does Mala have now?"
    text_1 = "මාලාට ඇපල් 5 ක් ඇත. නිමල් ඇයට ඇපල් 3 ක් දුන්නේය. දැන් මාලාට ඇපල් කීයක් තිබේද?"
    
    cli = compute_cli(text_1, operation_count=1)
    
    # 15-16 words, 2 numbers -> Linguistic Extraneous = 7.5 to 8.0
    # CLI = (0.4 * 1) + (0.3 * 7.5 or 8.0) + (0.3 * 0) = 2.65 or 2.80
    assert round(cli, 2) in (2.65, 2.8)
    
    settings = derive_adhd_game_settings(cli, adhd_risk_level='LOW')
    assert settings.step_granularity == 'TWO_TIER'
    assert settings.distractor_count == 3
    assert settings.stimulus_density == 'MEDIUM'
    assert settings.timer_enabled is False


def test_cognitive_load_multi_step_money():
    # Problem 2: Multi-step money word problem (Grade 3/4)
    # Translation: "Kamal bought a book for 50 rupees and a pen for 20 rupees. He gave 100 rupees to the shopkeeper. How much is the balance?"
    text_2 = "කමල් රුපියල් 50 කට පොතක් සහ රුපියල් 20 කට පෑනක් මිලදී ගත්තේය. ඔහු කඩකාරයාට රුපියල් 100 ක් දුන්නේය. ඉතිරිය කොපමණද?"
    
    cli = compute_cli(text_2, operation_count=2)
    
    # 19-20 words, 3 numbers -> Linguistic Extraneous = 6.33 to 6.67
    # CLI = (0.4 * 2) + (0.3 * 6.33 or 6.67) + (0.3 * 1) = 3.00 or 3.10
    assert round(cli, 2) in (3.00, 3.1)
    
    # Since CLI is >= 3.0, it should trigger HIGH risk settings regardless of provided risk level
    settings = derive_adhd_game_settings(cli, adhd_risk_level='MEDIUM')
    assert settings.step_granularity == 'MAXIMAL_THREE_TIER'
    assert settings.distractor_count == 2
    assert settings.stimulus_density == 'LOW'


def test_cognitive_load_high_adhd_risk_override():
    # Problem 3: Short problem but the learner has HIGH ADHD risk
    # Translation: "10 minus 4 is how much?"
    text_3 = "10 න් 4 ක් අඩු කළ විට කීයද?"
    
    cli = compute_cli(text_3, operation_count=1)
    
    # 7-8 words, 2 numbers -> Linguistic Extraneous = 3.5 to 4.0
    # CLI = (0.4 * 1) + (0.3 * 3.5 or 4.0) + (0.3 * 0) = 1.45 or 1.60
    assert round(cli, 2) in (1.45, 1.6)
    
    # Despite low CLI, HIGH risk forces max settings
    settings = derive_adhd_game_settings(cli, adhd_risk_level='HIGH')
    assert settings.step_granularity == 'MAXIMAL_THREE_TIER'
    assert settings.distractor_count == 2
    assert settings.stimulus_density == 'LOW'
