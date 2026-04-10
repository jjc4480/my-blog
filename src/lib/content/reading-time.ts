/** Estimate reading time for Korean text (~500 chars/min) */
export function getReadingTime(text: string): number {
	const cleaned = text
		.replace(/```[\s\S]*?```/g, '')
		.replace(/`[^`]+`/g, '')
		.replace(/!\[.*?\]\(.*?\)/g, '')
		.replace(/\[([^\]]+)\]\(.*?\)/g, '$1')
		.replace(/#{1,6}\s+/g, '')
		.replace(/[*_~]{1,3}/g, '')
		.replace(/\s+/g, '');
	const minutes = Math.ceil(cleaned.length / 500);
	return Math.max(1, minutes);
}
