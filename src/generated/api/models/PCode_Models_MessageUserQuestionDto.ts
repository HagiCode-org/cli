/* Hand-maintained with the proto message MessageUserQuestionDto (protos/hagicode/session/v1/session_messaging.proto).
 * Keep the field names equal to the REST JSON names; see the generated-models note in AGENTS.md. */

/** The question of a message: its state, questions, stored answers and the limits an answer is checked against. */
export type PCode_Models_MessageUserQuestionDto = {
  questionId: string;
  runId?: string;
  /** `pending`, `answered`, `expired` or `cancelled`. An unknown value is read-only. */
  state: string;
  questions: Array<PCode_Models_MessageUserQuestionItemDto>;
  answers?: Array<PCode_Models_MessageUserQuestionAnswerDto>;
  answeredAt?: string;
  limits: PCode_Models_MessageUserQuestionLimitsDto;
};

/** One question of a prompt. `question` is also the key of its answer. */
export type PCode_Models_MessageUserQuestionItemDto = {
  question: string;
  header: string;
  multiSelect: boolean;
  options: Array<PCode_Models_MessageUserQuestionOptionDto>;
  allowCustomAnswer: boolean;
  isSecret?: boolean;
};

export type PCode_Models_MessageUserQuestionOptionDto = {
  label: string;
  description: string;
};

/** The values of one question: chosen option labels or free text. `rejected` is set only when the user declined it. */
export type PCode_Models_MessageUserQuestionAnswerDto = {
  question: string;
  values: Array<string>;
  rejected?: boolean;
};

export type PCode_Models_MessageUserQuestionLimitsDto = {
  maxAnswerLength: number;
  maxValuesPerQuestion: number;
};
