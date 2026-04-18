import { describe, expect, it } from 'vitest';

import { hashPrompt, parsePrompt, render } from './render.ts';

const SAMPLE = `---
id: coach_linear
version: 3
description: Linear periodization 블럭 생성
input_vars: [weeks, days_per_week, squat_1rm]
output_schema: shared/validators/llm/coach_output.ts
model: gemini-3-flash-preview
---

# System

당신은 파워리프팅 코치입니다.

# User

{{weeks}}주짜리 프로그램. 주 {{days_per_week}}일. 스쿼트 {{squat_1rm}} kg.
`;

describe('parsePrompt', () => {
  it('frontmatter 와 body 를 분리하고 메타데이터를 파싱한다', () => {
    const file = parsePrompt(SAMPLE);
    expect(file.metadata).toEqual({
      id: 'coach_linear',
      version: 3,
      description: 'Linear periodization 블럭 생성',
      input_vars: ['weeks', 'days_per_week', 'squat_1rm'],
      output_schema: 'shared/validators/llm/coach_output.ts',
      model: 'gemini-3-flash-preview',
    });
    expect(file.system).toBe('당신은 파워리프팅 코치입니다.');
    expect(file.user).toContain('{{weeks}}주짜리 프로그램');
  });

  it('frontmatter 가 없으면 에러', () => {
    expect(() => parsePrompt('# System\nx\n# User\ny')).toThrow(/frontmatter/);
  });

  it('# System 섹션이 없으면 에러', () => {
    const raw = SAMPLE.replace('# System', '# Other');
    expect(() => parsePrompt(raw)).toThrow(/# System/);
  });

  it('# User 섹션이 없으면 에러', () => {
    const raw = SAMPLE.replace('# User', '# Other');
    expect(() => parsePrompt(raw)).toThrow(/# User/);
  });

  it('frontmatter 필수 키가 빠지면 에러', () => {
    const raw = SAMPLE.replace('version: 3\n', '');
    expect(() => parsePrompt(raw)).toThrow(/version/);
  });

  it('따옴표를 스트립한다', () => {
    const raw = SAMPLE.replace(
      'description: Linear periodization 블럭 생성',
      'description: "Linear quoted"',
    );
    const file = parsePrompt(raw);
    expect(file.metadata.description).toBe('Linear quoted');
  });

  it('빈 input_vars 도 허용한다', () => {
    const raw = SAMPLE.replace(
      'input_vars: [weeks, days_per_week, squat_1rm]',
      'input_vars: []',
    ).replace(
      '{{weeks}}주짜리 프로그램. 주 {{days_per_week}}일. 스쿼트 {{squat_1rm}} kg.',
      '고정 본문',
    );
    const file = parsePrompt(raw);
    expect(file.metadata.input_vars).toEqual([]);
  });
});

describe('render', () => {
  it('{{var}} 를 치환한다 (숫자 → 문자열)', () => {
    const file = parsePrompt(SAMPLE);
    const out = render(file, { weeks: 8, days_per_week: 4, squat_1rm: 180 });
    expect(out.user).toBe('8주짜리 프로그램. 주 4일. 스쿼트 180 kg.');
    expect(out.system).toBe('당신은 파워리프팅 코치입니다.');
    expect(out.metadata.id).toBe('coach_linear');
  });

  it('input_vars 누락 시 에러 (호출 시점)', () => {
    const file = parsePrompt(SAMPLE);
    expect(() => render(file, { weeks: 8, days_per_week: 4 })).toThrow(/squat_1rm/);
  });

  it('본문에 vars 에 없는 {{var}} 가 있으면 에러', () => {
    const raw = SAMPLE.replace(
      '스쿼트 {{squat_1rm}} kg.',
      '스쿼트 {{squat_1rm}} kg. 알 수 없음 {{ghost}}',
    );
    const file = parsePrompt(raw);
    expect(() => render(file, { weeks: 8, days_per_week: 4, squat_1rm: 180 })).toThrow(/ghost/);
  });

  it('vars 에 추가 키가 있어도 무시한다', () => {
    const file = parsePrompt(SAMPLE);
    const out = render(file, { weeks: 8, days_per_week: 4, squat_1rm: 180, extra: 'ignored' });
    expect(out.user).not.toContain('ignored');
  });
});

describe('hashPrompt', () => {
  it('동일 입력에 동일 hash, 변경 시 hash 변화', async () => {
    const file = parsePrompt(SAMPLE);
    const h1 = await hashPrompt(file);
    const h2 = await hashPrompt(file);
    expect(h1).toBe(h2);
    expect(h1).toMatch(/^[0-9a-f]{64}$/);

    const file2 = parsePrompt(SAMPLE.replace('version: 3', 'version: 4'));
    const h3 = await hashPrompt(file2);
    expect(h3).not.toBe(h1);
  });
});
