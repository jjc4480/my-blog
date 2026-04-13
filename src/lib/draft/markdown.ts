import { Marked } from 'marked';
import { createHighlighter, type Highlighter } from 'shiki';

let highlighter: Highlighter | null = null;

const SHIKI_LANGS = [
	'javascript',
	'typescript',
	'css',
	'html',
	'svelte',
	'bash',
	'shell',
	'json',
	'yaml',
	'markdown',
	'diff'
] as const;

const SHIKI_THEMES = { light: 'github-light', dark: 'github-dark' } as const;

async function getHighlighter(): Promise<Highlighter> {
	if (!highlighter) {
		highlighter = await createHighlighter({
			themes: [SHIKI_THEMES.light, SHIKI_THEMES.dark],
			langs: [...SHIKI_LANGS]
		});
	}
	return highlighter;
}

export async function renderMarkdown(source: string): Promise<string> {
	const hl = await getHighlighter();

	const marked = new Marked({
		renderer: {
			code({ text, lang }: { text: string; lang?: string }) {
				const language = lang && hl.getLoadedLanguages().includes(lang) ? lang : 'text';
				return hl.codeToHtml(text, {
					lang: language,
					themes: SHIKI_THEMES
				});
			}
		}
	});

	return await marked.parse(source);
}
