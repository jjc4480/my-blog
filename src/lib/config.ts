export const siteConfig = {
	title: '개발 블로그',
	description: '개발 경험과 기술적 고민을 기록하는 블로그',
	url: 'https://blog.jcjang.dev',
	author: {
		name: 'jcjang',
		bio: '풀스택 개발자. 웹 기술과 시스템 설계에 관심이 많습니다.',
		twitter: '@jcjang'
	},
	social: {
		github: 'https://github.com/jcjang',
		twitter: 'https://twitter.com/jcjang'
	},
	defaultOgImage: '/og-default.png',
	locale: 'ko_KR',
	language: 'ko',
	postsPerPage: 10
} as const;

export { siteConfig as SITE_CONFIG };
