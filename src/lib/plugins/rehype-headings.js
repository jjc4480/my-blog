function toSlug(text) {
	return text
		.toLowerCase()
		.trim()
		.replace(/[^a-z0-9\uac00-\ud7a3\s-]/g, '')
		.replace(/\s+/g, '-')
		.replace(/-+/g, '-')
		.replace(/^-|-$/g, '');
}

function extractText(node) {
	if (!node) return '';
	if (node.type === 'text') return node.value;
	if (node.children) return node.children.map(extractText).join('');
	return '';
}

function el(tagName, properties, children = []) {
	return { type: 'element', tagName, properties, children };
}

function anchorSvg() {
	return el(
		'svg',
		{
			xmlns: 'http://www.w3.org/2000/svg',
			width: 18,
			height: 18,
			viewBox: '0 0 24 24',
			fill: 'none',
			stroke: 'currentColor',
			strokeWidth: 2,
			strokeLinecap: 'round',
			strokeLinejoin: 'round'
		},
		[
			el('path', { d: 'M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71' }),
			el('path', { d: 'M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71' })
		]
	);
}

function walk(node, seen) {
	if (!node) return;
	if (node.type === 'element' && /^h[1-6]$/.test(node.tagName)) {
		const props = (node.properties ??= {});
		const text = extractText(node).trim();
		if (!props.id) {
			const base = toSlug(text) || 'section';
			const count = seen.get(base) ?? 0;
			props.id = count > 0 ? `${base}-${count}` : base;
			seen.set(base, count + 1);
		}
		const level = Number(node.tagName[1]);
		if (level === 2 || level === 3) {
			const classes = Array.isArray(props.className) ? props.className : [];
			if (!classes.includes('heading-with-anchor')) classes.push('heading-with-anchor');
			props.className = classes;
			const alreadyAnchored = node.children?.some(
				(c) =>
					c.type === 'element' &&
					c.tagName === 'a' &&
					Array.isArray(c.properties?.className) &&
					c.properties.className.includes('heading-anchor')
			);
			if (!alreadyAnchored) {
				const anchor = el(
					'a',
					{
						href: `#${props.id}`,
						className: ['heading-anchor'],
						'aria-label': `${text} 섹션 링크`,
						tabIndex: -1
					},
					[anchorSvg()]
				);
				node.children = [anchor, ...(node.children || [])];
			}
		}
	}
	if (node.children) for (const c of node.children) walk(c, seen);
}

export function rehypeHeadings() {
	return (tree) => {
		walk(tree, new Map());
	};
}
