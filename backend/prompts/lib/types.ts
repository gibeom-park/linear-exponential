export interface PromptMetadata {
  id: string;
  version: number;
  description: string;
  input_vars: readonly string[];
  output_schema: string;
  model: string;
}

export interface PromptFile {
  metadata: PromptMetadata;
  system: string;
  user: string;
  raw: string;
}

export interface RenderedPrompt {
  metadata: PromptMetadata;
  system: string;
  user: string;
}

export type PromptVars = Record<string, string | number>;
