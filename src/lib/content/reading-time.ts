const KOREAN_CPM = 2000;
const CODE_CPM = 1000;

export function getReadingTime(text: string): number {
	const codeBlocks: string[] = [];
	const withoutCode = text.replace(/```[\s\S]*?```/g, (match) => {
		codeBlocks.push(match);
		return '';
	});

	const prose = withoutCode
		.replace(/`[^`]+`/g, '')
		.replace(/!\[.*?\]\(.*?\)/g, '')
		.replace(/\[([^\]]+)\]\(.*?\)/g, '$1')
		.replace(/#{1,6}\s+/g, '')
		.replace(/[*_~]{1,3}/g, '')
		.replace(/\s+/g, '');

	const codeText = codeBlocks.join('').replace(/```\w*\n?|```/g, '').replace(/\s+/g, '');

	const proseMinutes = prose.length / KOREAN_CPM;
	const codeMinutes = codeText.length / CODE_CPM;

	return Math.max(1, Math.ceil(proseMinutes + codeMinutes));
}
