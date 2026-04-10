export const siteConfig = {
	title: '개발 블로그',
	description: '개발하면서 겪은 고민과 기록을 남기는 공간.',
	url: 'https://blog.jcjang.dev',
	author: {
		name: 'jcjang',
		bio: '웹 기술 전반을 좋아하는 개발자. 요즘은 AI와 Agent 쪽도 파고 있습니다. 개발하면서 겪은 고민과 삽질을 기록합니다.',
		email: 'jongchangjang90@gmail.com'
	},
	defaultOgImage: '/og-default.png',
	locale: 'ko_KR',
	language: 'ko',
	postsPerPage: 10
} as const;

export { siteConfig as SITE_CONFIG };
