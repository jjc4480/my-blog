import TurndownService from 'turndown';

const turndown = new TurndownService({
	headingStyle: 'atx',
	codeBlockStyle: 'fenced',
	fence: '```',
	bulletListMarker: '-',
	emDelimiter: '*'
});

turndown.addRule('strikethrough', {
	filter: ['del', 's'],
	replacement: (content) => `~~${content}~~`
});

export function htmlToMarkdown(html: string): string {
	return turndown.turndown(html);
}
