import { describe, expect, it } from 'vitest';
import { formatAnswerHuman } from '../../src/commands/session/sessionAnswer';

describe('formatAnswerHuman (src/commands/session/sessionAnswer.ts)', () => {
  it('prints one line per result, ending with a newline', () => {
    expect(formatAnswerHuman([{ questionId: 'q1', outcome: 'accepted' }], 1)).toBe('Question q1: accepted\n');
  });

  it('appends the reason in parentheses when the result has one', () => {
    expect(formatAnswerHuman([{ questionId: 'q1', outcome: 'invalid', reason: 'no such option' }], 1)).toBe(
      'Question q1: invalid (no such option)\n',
    );
  });

  it('appends the new question state after a semicolon', () => {
    expect(formatAnswerHuman([{ questionId: 'q1', outcome: 'accepted', state: 'answered' }], 1)).toBe(
      'Question q1: accepted; the question is now answered\n',
    );
  });

  it('puts the reason before the state when both are present', () => {
    expect(
      formatAnswerHuman([{ questionId: 'q1', outcome: 'stale', reason: 'already closed', state: 'expired' }], 1),
    ).toBe('Question q1: stale (already closed); the question is now expired\n');
  });

  it('omits empty reasons and states', () => {
    expect(formatAnswerHuman([{ questionId: 'q1', outcome: 'accepted', reason: '', state: '' }], 1)).toBe(
      'Question q1: accepted\n',
    );
  });

  it('lists several results in order and adds the batch summary when the prompt had several questions', () => {
    const text = formatAnswerHuman(
      [
        { questionId: 'q1', outcome: 'accepted' },
        { questionId: 'q2', outcome: 'invalid', reason: 'bad' },
      ],
      2,
    );

    expect(text).toBe(
      ['Question q1: accepted', 'Question q2: invalid (bad)', 'Answered 2 questions of the prompt in one call.'].join('\n') + '\n',
    );
  });

  it('does not add the batch summary for a single-question prompt', () => {
    expect(formatAnswerHuman([{ questionId: 'q1', outcome: 'accepted' }], 1)).not.toContain('Answered');
    expect(formatAnswerHuman([{ questionId: 'q1', outcome: 'accepted' }], 0)).not.toContain('Answered');
  });

  it('does not add the batch summary when there are no results, even for a multi-question prompt', () => {
    expect(formatAnswerHuman([], 3)).toBe('\n');
  });
});
