import { SITE_CONFIG } from './config';

export interface SEOProps {
	title?: string;
	description?: string;
	ogImage?: string;
	canonicalUrl?: string;
	type?: 'website' | 'article';
	publishedTime?: string;
	modifiedTime?: string;
	tags?: string[];
	noindex?: boolean;
}

export function buildSEO(props: SEOProps = {}) {
	const {
		title,
		description = SITE_CONFIG.description,
		ogImage = SITE_CONFIG.defaultOgImage,
		canonicalUrl,
		type = 'website',
		publishedTime,
		modifiedTime,
		tags = [],
		noindex = false
	} = props;

	const fullTitle = title ? `${title} | ${SITE_CONFIG.title}` : SITE_CONFIG.title;
	const fullOgImage = ogImage.startsWith('http') ? ogImage : `${SITE_CONFIG.url}${ogImage}`;

	return {
		title: fullTitle,
		description,
		ogImage: fullOgImage,
		canonicalUrl,
		type,
		publishedTime,
		modifiedTime,
		tags,
		noindex,
		siteName: SITE_CONFIG.title,
		locale: SITE_CONFIG.locale,
		author: SITE_CONFIG.author.name,
		twitterSite: SITE_CONFIG.author.twitter
	};
}

// JSON-LD Structured Data helpers

export function buildWebSiteSchema() {
	return {
		'@context': 'https://schema.org',
		'@type': 'WebSite',
		name: SITE_CONFIG.title,
		description: SITE_CONFIG.description,
		url: SITE_CONFIG.url,
		author: {
			'@type': 'Person',
			name: SITE_CONFIG.author.name
		},
		potentialAction: {
			'@type': 'SearchAction',
			target: {
				'@type': 'EntryPoint',
				urlTemplate: `${SITE_CONFIG.url}/search?q={search_term_string}`
			},
			'query-input': 'required name=search_term_string'
		}
	};
}

export function buildArticleSchema(post: {
	title: string;
	description: string;
	url: string;
	publishedTime: string;
	modifiedTime?: string;
	ogImage?: string;
	tags?: string[];
}) {
	return {
		'@context': 'https://schema.org',
		'@type': 'Article',
		headline: post.title,
		description: post.description,
		url: post.url,
		datePublished: post.publishedTime,
		dateModified: post.modifiedTime ?? post.publishedTime,
		image: post.ogImage ? (post.ogImage.startsWith('http') ? post.ogImage : `${SITE_CONFIG.url}${post.ogImage}`) : `${SITE_CONFIG.url}${SITE_CONFIG.defaultOgImage}`,
		author: {
			'@type': 'Person',
			name: SITE_CONFIG.author.name,
			url: SITE_CONFIG.url
		},
		publisher: {
			'@type': 'Person',
			name: SITE_CONFIG.author.name,
			url: SITE_CONFIG.url
		},
		keywords: post.tags?.join(', ') ?? ''
	};
}

export function buildCollectionPageSchema(params: {
	title: string;
	description: string;
	url: string;
}) {
	return {
		'@context': 'https://schema.org',
		'@type': 'CollectionPage',
		name: params.title,
		description: params.description,
		url: params.url,
		isPartOf: {
			'@type': 'WebSite',
			name: SITE_CONFIG.title,
			url: SITE_CONFIG.url
		}
	};
}

export function buildBreadcrumbSchema(items: { name: string; url: string }[]) {
	return {
		'@context': 'https://schema.org',
		'@type': 'BreadcrumbList',
		itemListElement: items.map((item, i) => ({
			'@type': 'ListItem',
			position: i + 1,
			name: item.name,
			item: item.url
		}))
	};
}
