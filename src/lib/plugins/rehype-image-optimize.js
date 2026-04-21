// @ts-nocheck
export function rehypeImageOptimize() {
	return (tree) => {
		visit(tree, 'element', (node) => {
			if (node.tagName !== 'img') return;
			const props = node.properties ?? {};

			props.loading = 'lazy';
			props.decoding = 'async';

			const src = typeof props.src === 'string' ? props.src : '';
			const alt = typeof props.alt === 'string' ? props.alt : '';
			const isDecorative = /icon|logo|avatar|emoji|favicon/i.test(src) || /icon|logo|avatar/i.test(alt);

			if (!isDecorative && !props.width && !props.height) {
				// Use aspect-ratio CSS for content images so intrinsic ratio from the
				// file is preserved once the browser decodes it, while reserving
				// 16/9 space up front to minimize CLS.
				props.style = 'aspect-ratio: 16 / 9; max-width: 100%; height: auto;';
			} else if (!props.style) {
				props.style = 'max-width: 100%; height: auto;';
			}

			node.properties = props;
		});
	};
}

function visit(tree, type, fn) {
	if (!tree || !tree.children) return;
	for (const child of tree.children) {
		if (child.type === type) fn(child);
		visit(child, type, fn);
	}
}
