import { Marked } from 'marked';
import { common, createLowlight } from 'lowlight';
import { toHtml } from 'hast-util-to-html';

const lowlight = createLowlight(common);

export async function renderMarkdown(source: string): Promise<string> {
	const marked = new Marked({
		renderer: {
			code({ text, lang }: { text: string; lang?: string }) {
				try {
					const tree = lang && lowlight.listLanguages().includes(lang)
						? lowlight.highlight(lang, text)
						: lowlight.highlightAuto(text);
					const html = toHtml(tree);
					return '<pre><code class="hljs">' + html + '</code></pre>';
				} catch {
					const escaped = text
						.replace(/&/g, '&amp;')
						.replace(/</g, '&lt;')
						.replace(/>/g, '&gt;');
					return '<pre><code>' + escaped + '</code></pre>';
				}
			}
		}
	});

	return await marked.parse(source);
}
