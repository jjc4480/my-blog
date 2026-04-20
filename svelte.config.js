import adapter from '@sveltejs/adapter-cloudflare';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import { mdsvex } from 'mdsvex';
import remarkGfm from 'remark-gfm';
import { rehypeImageOptimize } from './src/lib/plugins/rehype-image-optimize.js';
import { rehypeHeadings } from './src/lib/plugins/rehype-headings.js';
import { createHighlighter } from 'shiki';

const shiki = await createHighlighter({
	themes: ['github-light', 'github-dark'],
	langs: ['javascript', 'typescript', 'css', 'html', 'svelte', 'bash', 'shell', 'json', 'yaml', 'markdown', 'diff', 'go', 'graphql', 'sql', 'protobuf']
});

const COPY_ICON =
	'<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>';

function wrapWithCopy(html) {
	return `<div class="code-block-wrapper relative group">${html}<button type="button" class="copy-btn" aria-label="코드 복사" data-copy-btn>${COPY_ICON}</button></div>`;
}

function escapeForTemplate(html) {
	return html.replace(/`/g, '\\`').replace(/\{/g, '&#123;').replace(/\}/g, '&#125;');
}

/** @type {import('@sveltejs/kit').Config} */
const config = {
	extensions: ['.svelte', '.md'],
	preprocess: [
		vitePreprocess(),
		mdsvex({
			extensions: ['.md'],
			remarkPlugins: [remarkGfm],
			rehypePlugins: [rehypeHeadings, rehypeImageOptimize],
			highlight: {
				highlighter: (code, lang) => {
					if (lang === 'mermaid') {
						return `<pre class="mermaid">${code}</pre>`;
					}
					const html = shiki.codeToHtml(code, {
						lang: lang || 'text',
						themes: {
							light: 'github-light',
							dark: 'github-dark'
						}
					});
					const wrapped = wrapWithCopy(html);
					return `{@html \`${escapeForTemplate(wrapped)}\`}`;
				}
			}
		})
	],
	compilerOptions: {
		runes: ({ filename }) => {
			if (filename?.split(/[/\\]/).includes('node_modules')) return undefined;
			if (filename?.endsWith('.md')) return false;
			return true;
		}
	},
	kit: {
		prerender: {
			handleHttpError: 'warn'
		},
		adapter: adapter({
			routes: {
				include: ['/*'],
				exclude: ['<all>']
			}
		})
	}
};

export default config;
