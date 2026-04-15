import { describe, it, expect } from 'vitest';
import { getReadingTime } from './reading-time';

describe('getReadingTime', () => {
	it('returns 1 for short text', () => {
		expect(getReadingTime('짧은 글')).toBe(1);
	});

	it('calculates Korean prose at ~2000 chars/min', () => {
		const text = '가'.repeat(4000);
		expect(getReadingTime(text)).toBe(2);
	});

	it('calculates code blocks at slower rate', () => {
		const code = '```js\n' + 'x'.repeat(2000) + '\n```';
		expect(getReadingTime(code)).toBe(2);
	});

	it('handles mixed Korean prose and code', () => {
		const prose = '가'.repeat(2000);
		const code = '```ts\n' + 'x'.repeat(1000) + '\n```';
		// 2000/2000 = 1min prose + 1000/1000 = 1min code = 2min
		expect(getReadingTime(prose + '\n' + code)).toBe(2);
	});

	it('strips markdown formatting from prose count', () => {
		const text = '# 제목\n\n**굵은 글씨** 그리고 [링크](http://example.com)\n\n![이미지](img.png)';
		const result = getReadingTime(text);
		expect(result).toBe(1);
	});

	it('returns at least 1 minute', () => {
		expect(getReadingTime('')).toBe(1);
	});
});
