export const siteConfig = {
	title: '개발 블로그',
	description: '개발하면서 겨은 고민들과 기록을 남기는 공간.',
	url: 'https://blog.jcjang.dev',
	author: {
		name: 'jcjang',
		bio: '웹 개발자. 웹 전반의 기술에 관심이 많고, 최근에는 AI와 Agent에도 관심을 갖고 있다.',
		email: 'jongchangjang90@gmail.com'
	},
	defaultOgImage: '/og-default.png',
	locale: 'ko_KR',
	language: 'ko',
	postsPerPage: 10
} as const;

export { siteConfig as SITE_CONFIG };
