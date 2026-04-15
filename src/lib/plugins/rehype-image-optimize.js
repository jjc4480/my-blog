export function rehypeImageOptimize() {
	return (tree) => {
		visit(tree, 'element', (node) => {
			if (node.tagName !== 'img') return;
			const props = node.properties ?? {};
			props.loading = 'lazy';
			props.decoding = 'async';
			if (!props.width) props.width = '800';
			if (!props.height) props.height = '450';
			props.style = 'max-width: 100%; height: auto;';
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
