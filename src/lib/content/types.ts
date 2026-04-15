export interface Post {
	title: string;
	date: string;
	description: string;
	tags: string[];
	category: string;
	thumbnail?: string;
	published?: boolean;
	secret?: boolean;
	series?: string;
	seriesOrder?: number;
	slug: string;
	content: string;
	readingTime?: number;
}
