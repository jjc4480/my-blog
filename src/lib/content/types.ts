export interface Post {
	title: string;
	date: string;
	description: string;
	tags: string[];
	category: string;
	thumbnail?: string;
	published?: boolean;
	slug: string;
	content: string;
}
