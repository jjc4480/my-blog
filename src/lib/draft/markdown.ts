import { Marked } from 'marked';

export async function renderMarkdown(source: string): Promise<string> {
	const marked = new Marked({
		renderer: {
			code({ text, lang }: { text: string; lang?: string }) {
				const escaped = text
					.replace(/&/g, '&amp;')
					.replace(/</g, '&lt;')
					.replace(/>/g, '&gt;');
				return `<pre><code class="language-${lang || 'text'}">${escaped}</code></pre>`;
			}
		}
	});

	return await marked.parse(source);
}
