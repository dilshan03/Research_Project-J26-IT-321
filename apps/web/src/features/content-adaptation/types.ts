// Mirrors services/content-adaptation-service/app/schemas/game_blueprint.py & syllabus.py
export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH';
export type GameTheme = 'VILLAGE_MARKET' | 'JUNGLE_ADVENTURE' | 'SPACE_QUEST';
export type BlueprintStatus = 'draft' | 'approved' | 'rejected';
export type VisualAssetTag =
  | 'COIN_BAG' | 'FRUIT_BASKET' | 'OPERATOR_CHEST' | 'NUMBER_BLOCK' | 'CHARACTER_AVATAR'
  | 'SHAPE_CARD' | 'PATTERN_TRAIN' | 'COMPARISON_SCALE';
export type DistractorType = 'IMPULSIVITY' | 'WORKING_MEMORY_OVERFLOW' | 'MAGNITUDE_SLIP' | 'NONE';

export interface GameChoiceOption {
  text_si: string;
  text_en: string;
  numeric_value?: number | null;
  is_correct: boolean;
  distractor_type?: DistractorType | null;
  distractor_rationale?: string | null;
  icon_or_shape?: string | null;
}

export interface GameMicroStep {
  step_order: number;
  action_type:
    | 'IDENTIFY_ENTITY'
    | 'SELECT_OPERATOR'
    | 'CALCULATE_MICROSTEP'
    | 'MATCH_SHAPE'
    | 'COMPLETE_PATTERN'
    | 'COMPARE_QUANTITY';
  instruction_si: string;
  instruction_en: string;
  target_visual_asset: VisualAssetTag;
  correct_target_value: string;
  game_options: GameChoiceOption[];
  operands?: number[] | null;
  operation?:
    | 'ADD' | 'SUB' | 'MUL' | 'DIV' | 'COUNT' | 'COMPARE' | 'IDENTIFY'
    | 'SHAPE' | 'PATTERN' | 'COLOR' | 'FRACTION' | 'TIME' | null;
  visual_props?: Record<string, any> | null;
}

export interface ADHDGameSettings {
  step_granularity: 'TWO_TIER' | 'MAXIMAL_THREE_TIER';
  distractor_count: number;
  stimulus_density: 'LOW' | 'MEDIUM';
  visual_clutter_filter: boolean;
  timer_enabled: boolean;
}

export interface GajaDialogue {
  intro: { si: string; en: string };
  hint: { si: string; en: string };
  praise: { si: string; en: string };
  retry: { si: string; en: string };
  celebrate: { si: string; en: string };
}

export interface StoryNarrative {
  title_si: string;
  title_en: string;
  backdrop_si: string;
  backdrop_en: string;
  quest_goal_si: string;
  quest_goal_en: string;
  gaja_dialogue: GajaDialogue;
}

export interface StudentBehaviorProfile {
  learner_id?: string;
  student_name?: string;
  archetype_id?: string;
  inattention_level: 'LOW' | 'MODERATE' | 'HIGH';
  impulsivity_level: 'LOW' | 'MODERATE' | 'HIGH';
  working_memory_support: boolean;
  activity_pace: 'CALM_STEP_BY_STEP' | 'REGULAR' | 'FLEXIBLE';
  visual_assistance: 'ALWAYS' | 'SOMETIMES' | 'MINIMAL';
  audio_assistance: 'READ_EVERYTHING' | 'READ_ON_CLICK' | 'OFF';
}

export interface CustomADHDGameSettings {
  step_granularity?: 'TWO_TIER' | 'MAXIMAL_THREE_TIER';
  distractor_count?: number;
  stimulus_density?: 'LOW' | 'MEDIUM';
  visual_clutter_filter?: boolean;
  timer_enabled?: boolean;
  preferred_distractor_types?: string[];
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
  story_narrative?: StoryNarrative | null;
  cli_score?: number | null;
  effective_cli_score?: number | null;
  raw_sinhala_question?: string | null;
  raw_english_question?: string | null;
  target_learner_id?: string | null;
  student_name?: string | null;
  customized_by_teacher?: boolean;
  behavior_profile?: Record<string, any> | null;
}

export interface BlueprintEnvelope {
  cli_score: number;
  raw_sinhala_question: string;
  raw_english_question?: string | null;
  blueprint: GameActivityBlueprint;
}

export interface SyllabusDocument {
  doc_id: string;
  filename: string;
  grade: number;
  subject: string;
  year: number;
  language: 'si' | 'en' | 'ta';
  page_count: number;
  file_size: number;
  status: 'uploaded' | 'extracting' | 'extracted' | 'error';
  extracted_problem_count: number;
  gridfs_id?: string | null;
  local_path?: string | null;
  created_at: string;
}

export interface CurriculumProblem {
  problem_id: string;
  doc_id?: string | null;
  grade: number;
  topic: string;
  competency_code?: string | null;
  competency_desc?: string | null;
  raw_problem_text: string;
  child_prompt_si?: string | null;
  child_prompt_en?: string | null;
  english_translation?: string | null;
  operands: number[];
  operation?:
    | 'ADD' | 'SUB' | 'MUL' | 'DIV' | 'COUNT' | 'COMPARE' | 'IDENTIFY'
    | 'SHAPE' | 'PATTERN' | 'COLOR' | 'FRACTION' | 'TIME' | null;
  expected_answer: number;
  visual_props?: Record<string, any> | null;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  page_number?: number | null;
  is_money: boolean;
  created_at: string;
}

export interface AdaptProblemRequest {
  adhd_risk_level: RiskLevel;
  game_theme?: GameTheme | null;
  custom_gaja_notes?: string | null;
  learner_id?: string | null;
  student_name?: string | null;
  behavior_profile?: StudentBehaviorProfile | null;
  custom_settings?: CustomADHDGameSettings | null;
}

export interface TuneBlueprintRequest {
  custom_settings: CustomADHDGameSettings;
  behavior_profile?: StudentBehaviorProfile | null;
  custom_gaja_notes?: string | null;
  game_theme?: GameTheme | null;
}

export interface CognitiveLoadPreviewResponse {
  base_cli: number;
  effective_cli: number;
  difference: number;
}


export interface DocumentUploadResponse {
  document: SyllabusDocument;
  message: string;
}

export interface SeedSyllabiResponse {
  imported_documents: number;
  extracted_problems: number;
  documents: SyllabusDocument[];
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
