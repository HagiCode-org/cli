import { readFile } from 'node:fs/promises';
import { stdin as input } from 'node:process';
import { CliUsageError } from './errors';

async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];

  for await (const chunk of input) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }

  return Buffer.concat(chunks).toString('utf8');
}

export async function loadStructuredJson<T>(source: string): Promise<T> {
  const normalizedSource = source.trim();
  if (!normalizedSource) {
    throw new CliUsageError('Provide --input <file> or --input - for stdin.');
  }

  const raw = normalizedSource === '-'
    ? await readStdin()
    : await readFile(normalizedSource, 'utf8');

  try {
    return JSON.parse(raw) as T;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new CliUsageError(`Invalid JSON input from ${normalizedSource}: ${message}`);
  }
}
