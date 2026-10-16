import type { DistractorType, GameMicroStep, GameTheme } from '../../types';
import type { Lang, Line } from '../gameKit';

export interface MechanicProps {
  step: GameMicroStep;
  question: string;
  theme: GameTheme;
  isMoney: boolean;
  lang: Lang;
  calm: boolean;
  /** Learner made a mistake. `hint` lets the mechanic choose what Gaja says. */
  onWrong: (label: string, distractor: DistractorType | null | undefined, hint?: Line) => void;
  /** Learner solved the step. */
  onCorrect: (label: string) => void;
  /** Mechanic wants Gaja to say something (e.g. phase change), without scoring. */
  onSay: (line: Line) => void;
}

export const OP_SYMBOL: Record<string, string> = {
  ADD: '+',
  SUB: '−',
  MUL: '×',
  DIV: '÷',
  COUNT: '#',
  COMPARE: '≶',
  IDENTIFY: '=',
};
