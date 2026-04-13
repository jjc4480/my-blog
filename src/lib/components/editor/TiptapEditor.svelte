<script lang="ts">
	import { onDestroy } from 'svelte';
	import { Editor } from '@tiptap/core';
	import StarterKit from '@tiptap/starter-kit';
	import Link from '@tiptap/extension-link';
	import Placeholder from '@tiptap/extension-placeholder';
	import Image from '@tiptap/extension-image';
	import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
	import { common, createLowlight } from 'lowlight';

	interface Props {
		content: string;
		onUpdate: (html: string) => void;
	}

	let { content, onUpdate }: Props = $props();

	let element: HTMLDivElement | undefined = $state();
	let editor: Editor | undefined = $state();

	const lowlight = createLowlight(common);

	$effect(() => {
		if (!element) return;
		const e = new Editor({
			element,
			extensions: [
				StarterKit.configure({ codeBlock: false }),
				CodeBlockLowlight.configure({ lowlight }),
				Link.configure({ openOnClick: false }),
				Placeholder.configure({ placeholder: '\uBCF8\uBB38\uC744 \uC791\uC131\uD558\uC138\uC694...' }),
				Image
			],
			content,
			editorProps: {
				attributes: {
					class: 'prose prose-neutral dark:prose-invert max-w-none leading-[1.8] outline-none min-h-full p-6'
				}
			},
			onTransaction: () => {
				editor = e;
			},
			onUpdate: ({ editor: ed }) => {
				onUpdate(ed.getHTML());
			}
		});
		editor = e;

		return () => {
			e.destroy();
		};
	});

	function toggleBold() { editor?.chain().focus().toggleBold().run(); }
	function toggleItalic() { editor?.chain().focus().toggleItalic().run(); }
	function toggleStrike() { editor?.chain().focus().toggleStrike().run(); }
	function toggleCode() { editor?.chain().focus().toggleCode().run(); }
	function toggleCodeBlock() { editor?.chain().focus().toggleCodeBlock().run(); }
	function toggleHeading(level: 1 | 2 | 3) { editor?.chain().focus().toggleHeading({ level }).run(); }
	function toggleBulletList() { editor?.chain().focus().toggleBulletList().run(); }
	function toggleOrderedList() { editor?.chain().focus().toggleOrderedList().run(); }
	function toggleBlockquote() { editor?.chain().focus().toggleBlockquote().run(); }
	function setHorizontalRule() { editor?.chain().focus().setHorizontalRule().run(); }

	function toggleLink() {
		if (editor?.isActive('link')) {
			editor.chain().focus().unsetLink().run();
			return;
		}
		const url = window.prompt('URL');
		if (url) {
			editor?.chain().focus().setLink({ href: url }).run();
		}
	}

	function isActive(name: string, attrs?: Record<string, unknown>): boolean {
		return editor?.isActive(name, attrs) ?? false;
	}
</script>

<div class="flex flex-col h-full border border-border/50 rounded-lg overflow-hidden">
	<!-- Toolbar -->
	{#if editor}
		<div class="flex flex-wrap items-center gap-0.5 border-b border-border/50 bg-muted/30 px-2 py-1.5">
			<button onclick={() => toggleHeading(1)} class="toolbar-btn" class:active={isActive('heading', { level: 1 })} title="제목 1">H1</button>
			<button onclick={() => toggleHeading(2)} class="toolbar-btn" class:active={isActive('heading', { level: 2 })} title="제목 2">H2</button>
			<button onclick={() => toggleHeading(3)} class="toolbar-btn" class:active={isActive('heading', { level: 3 })} title="제목 3">H3</button>
			<span class="toolbar-sep"></span>
			<button onclick={toggleBold} class="toolbar-btn" class:active={isActive('bold')} title="굵게"><strong>B</strong></button>
			<button onclick={toggleItalic} class="toolbar-btn" class:active={isActive('italic')} title="기울임"><em>I</em></button>
			<button onclick={toggleStrike} class="toolbar-btn" class:active={isActive('strike')} title="취소선"><s>S</s></button>
			<button onclick={toggleCode} class="toolbar-btn" class:active={isActive('code')} title="인라인 코드">&lt;/&gt;</button>
			<span class="toolbar-sep"></span>
			<button onclick={toggleCodeBlock} class="toolbar-btn" class:active={isActive('codeBlock')} title="코드 블록">
				<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
			</button>
			<button onclick={toggleLink} class="toolbar-btn" class:active={isActive('link')} title="링크">
				<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
			</button>
			<span class="toolbar-sep"></span>
			<button onclick={toggleBulletList} class="toolbar-btn" class:active={isActive('bulletList')} title="비순서 목록">
				<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
			</button>
			<button onclick={toggleOrderedList} class="toolbar-btn" class:active={isActive('orderedList')} title="순서 목록">
				<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="10" y1="6" x2="21" y2="6"/><line x1="10" y1="12" x2="21" y2="12"/><line x1="10" y1="18" x2="21" y2="18"/><path d="M4 6h1v4"/><path d="M4 10h2"/><path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1"/></svg>
			</button>
			<button onclick={toggleBlockquote} class="toolbar-btn" class:active={isActive('blockquote')} title="인용구">
				<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V21z"/><path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3z"/></svg>
			</button>
			<button onclick={setHorizontalRule} class="toolbar-btn" title="구분선">
				<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="2" y1="12" x2="22" y2="12"/></svg>
			</button>
		</div>
	{/if}

	<!-- Editor area -->
	<div bind:this={element} class="flex-1 overflow-y-auto bg-background"></div>
</div>

<style>
	:global(.ProseMirror) {
		outline: none;
		min-height: 100%;
	}
	:global(.ProseMirror p.is-editor-empty:first-child::before) {
		content: attr(data-placeholder);
		float: left;
		color: var(--muted-foreground);
		pointer-events: none;
		height: 0;
	}
	:global(.ProseMirror pre) {
		background: var(--code-bg);
		color: var(--code-text);
		border-radius: 0.5rem;
		padding: 1rem;
		overflow-x: auto;
	}
	:global(.ProseMirror pre code) {
		background: none;
		padding: 0;
		font-size: 0.875rem;
	}
	.toolbar-btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 2rem;
		height: 2rem;
		border-radius: 0.375rem;
		font-size: 0.75rem;
		color: var(--muted-foreground);
		transition: all 150ms;
	}
	.toolbar-btn:hover {
		background: var(--secondary);
		color: var(--foreground);
	}
	.toolbar-btn.active {
		background: var(--secondary);
		color: var(--foreground);
	}
	.toolbar-sep {
		width: 1px;
		height: 1.25rem;
		background: var(--border);
		margin: 0 0.25rem;
	}
</style>
