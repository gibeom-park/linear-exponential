import type { PromptFile, PromptMetadata, PromptVars, RenderedPrompt } from './types.ts';

const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/;
const SYSTEM_HEADER_RE = /^#\s+System\s*$/m;
const USER_HEADER_RE = /^#\s+User\s*$/m;
const VAR_RE = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g;

const REQUIRED_META_KEYS = [
  'id',
  'version',
  'description',
  'input_vars',
  'output_schema',
  'model',
] as const;

export function parsePrompt(raw: string): PromptFile {
  const m = FRONTMATTER_RE.exec(raw);
  if (!m) throw new Error('prompt: frontmatter (--- ... ---) 누락');
  const frontStr = m[1] ?? '';
  const body = m[2] ?? '';
  const metadata = parseFrontmatter(frontStr);
  const { system, user } = splitBody(body);
  return { metadata, system, user, raw };
}

export function render(file: PromptFile, vars: PromptVars): RenderedPrompt {
  const missing = file.metadata.input_vars.filter((v) => !(v in vars));
  if (missing.length > 0) {
    throw new Error(`prompt[${file.metadata.id}]: 누락된 입력 변수: ${missing.join(', ')}`);
  }
  return {
    metadata: file.metadata,
    system: substitute(file.system, vars, file.metadata.id),
    user: substitute(file.user, vars, file.metadata.id),
  };
}

export async function hashPrompt(file: PromptFile): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(file.raw));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function parseFrontmatter(src: string): PromptMetadata {
  const obj: Record<string, unknown> = {};
  for (const rawLine of src.split(/\r?\n/)) {
    const line = rawLine.replace(/\s+$/, '');
    const trimmed = line.trim();
    if (trimmed === '' || trimmed.startsWith('#')) continue;
    const idx = line.indexOf(':');
    if (idx === -1) throw new Error(`prompt: invalid frontmatter line: ${rawLine}`);
    const key = line.slice(0, idx).trim();
    if (key === '') throw new Error(`prompt: empty frontmatter key: ${rawLine}`);
    obj[key] = parseValue(line.slice(idx + 1).trim());
  }

  for (const key of REQUIRED_META_KEYS) {
    if (!(key in obj)) throw new Error(`prompt: frontmatter 필수 키 누락: ${key}`);
  }

  const id = expectString(obj, 'id');
  const version = expectNumber(obj, 'version');
  const description = expectString(obj, 'description');
  const input_vars = expectStringArray(obj, 'input_vars');
  const output_schema = expectString(obj, 'output_schema');
  const model = expectString(obj, 'model');
  return { id, version, description, input_vars, output_schema, model };
}

function parseValue(raw: string): unknown {
  if (raw.startsWith('[') && raw.endsWith(']')) {
    const inner = raw.slice(1, -1).trim();
    if (inner === '') return [];
    return inner.split(',').map((s) => stripQuotes(s.trim()));
  }
  if (/^-?\d+$/.test(raw)) return Number(raw);
  return stripQuotes(raw);
}

function stripQuotes(s: string): string {
  if (s.length >= 2) {
    const first = s[0];
    const last = s[s.length - 1];
    if ((first === '"' && last === '"') || (first === "'" && last === "'")) {
      return s.slice(1, -1);
    }
  }
  return s;
}

function splitBody(body: string): { system: string; user: string } {
  const sys = SYSTEM_HEADER_RE.exec(body);
  const usr = USER_HEADER_RE.exec(body);
  if (!sys) throw new Error('prompt: "# System" 섹션 누락');
  if (!usr) throw new Error('prompt: "# User" 섹션 누락');
  if (usr.index < sys.index) {
    throw new Error('prompt: "# System" 은 "# User" 보다 먼저 와야 함');
  }
  const system = body.slice(sys.index + sys[0].length, usr.index).trim();
  const user = body.slice(usr.index + usr[0].length).trim();
  return { system, user };
}

function substitute(template: string, vars: PromptVars, promptId: string): string {
  return template.replace(VAR_RE, (_, name: string) => {
    const v = vars[name];
    if (v === undefined) {
      throw new Error(`prompt[${promptId}]: 본문 {{${name}}} 가 vars 에 없음`);
    }
    return String(v);
  });
}

function expectString(obj: Record<string, unknown>, key: string): string {
  const v = obj[key];
  if (typeof v !== 'string') {
    throw new Error(`prompt: frontmatter "${key}" 는 문자열이어야 함 (got ${typeof v})`);
  }
  return v;
}

function expectNumber(obj: Record<string, unknown>, key: string): number {
  const v = obj[key];
  if (typeof v !== 'number') {
    throw new Error(`prompt: frontmatter "${key}" 는 정수여야 함 (got ${typeof v})`);
  }
  return v;
}

function expectStringArray(obj: Record<string, unknown>, key: string): string[] {
  const v = obj[key];
  if (!Array.isArray(v) || v.some((x) => typeof x !== 'string')) {
    throw new Error(`prompt: frontmatter "${key}" 는 문자열 배열이어야 함`);
  }
  return v as string[];
}
