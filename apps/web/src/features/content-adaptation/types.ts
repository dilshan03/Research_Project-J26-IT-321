// Mirrors services/content-adaptation-service/app/schemas/game_blueprint.py
export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH';
export type GameTheme = 'VILLAGE_MARKET' | 'JUNGLE_ADVENTURE' | 'SPACE_QUEST';
export type BlueprintStatus = 'draft' | 'approved' | 'rejected';
export type VisualAssetTag =
  | 'COIN_BAG' | 'FRUIT_BASKET' | 'OPERATOR_CHEST' | 'NUMBER_BLOCK' | 'CHARACTER_AVATAR';
export type DistractorType = 'IMPULSIVITY' | 'WORKING_MEMORY_OVERFLOW' | 'MAGNITUDE_SLIP' | 'NONE';

export interface GameChoiceOption {
  text_si: string;
  text_en: string;
  numeric_value?: number | null;
  is_correct: boolean;
  distractor_type?: DistractorType | null;
  distractor_rationale?: string | null;
}

export interface GameMicroStep {
  step_order: number;
  action_type: 'IDENTIFY_ENTITY' | 'SELECT_OPERATOR' | 'CALCULATE_MICROSTEP';
  instruction_si: string;
  instruction_en: string;
  target_visual_asset: VisualAssetTag;
  correct_target_value: string;
  game_options: GameChoiceOption[];
}

export interface ADHDGameSettings {
  step_granularity: 'TWO_TIER' | 'MAXIMAL_THREE_TIER';
  distractor_count: number;
  stimulus_density: 'LOW' | 'MEDIUM';
  visual_clutter_filter: boolean;
  timer_enabled: boolean;
}

export interface GameActivityBlueprint {
  activity_id: string;
  source_question_id: string;
  grade: number;
  topic: string;
  game_theme: GameTheme;
  adhd_game_settings: ADHDGameSettings;
  micro_steps: GameMicroStep[];
  status: BlueprintStatus;
}

export interface BlueprintEnvelope {
  cli_score: number;
  raw_sinhala_question: string;
  blueprint: GameActivityBlueprint;
}

export interface GenerateBlueprintRequest {
  source_question_id: string;
  grade: number;
  topic: string;
  raw_sinhala_question: string;
  adhd_risk_level: RiskLevel;
  operation_hint?: 'ADD' | 'SUB' | 'MUL' | 'DIV' | null;
  game_theme?: GameTheme | null;
}

export interface SampleQuestion {
  source_question_id: string;
  grade: number;
  topic: string;
  raw_sinhala_question: string;
  translation_en: string;
}
