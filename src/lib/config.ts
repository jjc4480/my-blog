export const siteConfig = {
	title: 'jcjang의 블로그',
	description: '개발하면서 겪은 고민들과 기록들을 남기는 공간.',
	url: 'https://jcjang-blog.pages.dev',
	author: {
		name: 'jcjang',
		bio: '웹 기술 전반을 좋아하는 개발자. 요즘은 AI와 Agent에도 관심을 가지고 있습니다.',
		email: 'jongchangjang90@gmail.com'
	},
	defaultOgImage: '/og-default.png',
	locale: 'ko_KR',
	language: 'ko',
	postsPerPage: 10
} as const;

export { siteConfig as SITE_CONFIG };
