import { CliUsageError } from '../../../runtime/errors';
import { formatJson } from '../../../formatters/json';
import {
  formatMonoSpecsDocumentHuman,
  toMonoSpecsDocumentPayload,
} from '../../../formatters/monospecs';
import type { CommandContext } from '../../../runtime/commandContext';
import type { PCode_Application_Contracts_Dto_MonoSpecsManagementDto } from '../../../generated/api/models/PCode_Application_Contracts_Dto_MonoSpecsManagementDto';

/** Writes a management document as JSON, or as the human summary preceded by an optional heading. */
export function writeMonoSpecsDocument(
  context: CommandContext,
  document: PCode_Application_Contracts_Dto_MonoSpecsManagementDto,
  options: { yaml?: boolean; heading?: string } = {},
): void {
  const payload = toMonoSpecsDocumentPayload(document);
  if (context.outputJson) {
    context.io.stdout(formatJson(payload));
    return;
  }

  const heading = options.heading ? `${options.heading}\n` : '';
  context.io.stdout(`${heading}${formatMonoSpecsDocumentHuman(payload, { yaml: options.yaml })}`);
}

/** Commander accumulator for repeatable options. */
export function collectOptionValue(value: string, previous: string[]): string[] {
  return [...previous, value];
}

/** Trims, turns backslashes into slashes and drops a leading `./` and trailing slashes. Empty input is a usage error. */
export function normalizeRepositoryPath(value: string): string {
  const normalized = value.trim().replace(/\\/g, '/').replace(/^(\.\/)+/, '').replace(/\/+$/, '');
  if (!normalized || normalized === '.') {
    throw new CliUsageError(`Repository path must name a directory below the project root: "${value}".`);
  }

  return normalized;
}
