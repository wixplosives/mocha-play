import type { ParseArgsConfig } from 'node:util';

export interface ExtendedParseOptions {
  /** for help menu */
  description: string;
  /** used in help menu for --flag <valueDescription> */
  valueDescription?: string;
  /** is it a number (default won't be quoted) */
  numeric?: boolean;
}

export type CliOptions = ParseArgsConfig['options'] & Record<string, ExtendedParseOptions>;

export function optionsToHelpContent(options: CliOptions): Array<{ flags: string; description: string }> {
  const simplifiedOptions: Array<{ flags: string; description: string }> = [];
  for (const [optionName, optionDescriptor] of Object.entries(options)) {
    let flags = optionDescriptor.short ? `-${optionDescriptor.short}, --${optionName}` : `    --${optionName}`;
    if (optionDescriptor.type === 'string') {
      flags += ` <${optionDescriptor.valueDescription ?? (optionDescriptor.numeric ? 'number' : optionName)}>`;
    }
    let description = optionDescriptor.description ?? '';
    if (optionDescriptor.default !== undefined) {
      const defaultValue =
        Array.isArray(optionDescriptor.default) || (optionDescriptor.type === 'string' && !optionDescriptor.numeric)
          ? JSON.stringify(optionDescriptor.default)
          : String(optionDescriptor.default);
      const defaultLabel = `(default: ${defaultValue})`;
      description += description ? ` ${defaultLabel}` : defaultLabel;
    }
    simplifiedOptions.push({ flags, description });
  }
  return simplifiedOptions;
}
