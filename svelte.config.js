import adapter from '@sveltejs/adapter-cloudflare';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import { mdsvex } from 'mdsvex';
import remarkGfm from 'remark-gfm';
import { rehypeImageOptimize } from './src/lib/plugins/rehype-image-optimize.js';
import { createHighlighter } from 'shiki';

const shiki = await createHighlighter({
	themes: ['github-light', 'github-dark'],
	langs: ['javascript', 'typescript', 'css', 'html', 'svelte', 'bash', 'shell', 'json', 'yaml', 'markdown', 'diff', 'go', 'graphql', 'sql', 'protobuf']
});

/** @type {import('@sveltejs/kit').Config} */
const config = {
	extensions: ['.svelte', '.md'],
	preprocess: [
		vitePreprocess(),
		mdsvex({
			extensions: ['.md'],
			remarkPlugins: [remarkGfm],
			rehypePlugins: [rehypeImageOptimize],
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
					return `{@html \`${html.replace(/`/g, '\\`').replace(/\{/g, '&#123;').replace(/\}/g, '&#125;')}\`}`;
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
