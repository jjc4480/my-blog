export const siteConfig = {
	title: 'jcjang의 블로그',
	description: '프론트엔드, 백엔드, 시스템 설계, AI 활용까지. 개발하면서 겪은 고민과 기록을 정리하는 블로그.',
	url: 'https://jcjang-blog.pages.dev',
	author: {
		name: 'jcjang',
		bio: '웹 기술 전반을 좋아하는 개발자. 요즘은 AI와 Agent에도 관심을 가지고 있습니다.',
		email: 'jongchangjang90@gmail.com',
		twitter: '@jcjang90'
	},
	defaultOgImage: '/og-default.png',
	locale: 'ko_KR',
	language: 'ko',
	postsPerPage: 10
} as const;

export { siteConfig as SITE_CONFIG };
