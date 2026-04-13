import adapter from '@sveltejs/adapter-cloudflare';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import { mdsvex } from 'mdsvex';
import remarkGfm from 'remark-gfm';
import { createHighlighter } from 'shiki';

const shiki = await createHighlighter({
	themes: ['github-light', 'github-dark'],
	langs: ['javascript', 'typescript', 'css', 'html', 'svelte', 'bash', 'shell', 'json', 'yaml', 'markdown', 'diff']
});

/** @type {import('@sveltejs/kit').Config} */
const config = {
	extensions: ['.svelte', '.md'],
	preprocess: [
		vitePreprocess(),
		mdsvex({
			extensions: ['.md'],
			remarkPlugins: [remarkGfm],
			highlight: {
				highlighter: (code, lang) => {
					const html = shiki.codeToHtml(code, {
						lang: lang || 'text',
						themes: {
							light: 'github-light',
							dark: 'github-dark'
						}
					});
					// mdsvex wraps in its own <pre>, so we return the shiki output directly
					// shiki outputs: <pre class="shiki ..."><code>...</code></pre>
					return `{@html \`${html.replace(/`/g, '\\`')}\`}`;
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
		adapter: adapter({
			routes: {
				include: ['/*'],
				exclude: ['<all>']
			}
		})
	}
};

export default config;
