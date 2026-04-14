import { browser } from '$app/environment';

let listeners: Array<() => void> = [];
let currentDark = false;

if (browser) {
	currentDark = document.documentElement.classList.contains('dark');
}

export function isDark(): boolean {
	return currentDark;
}

export function toggleTheme(): void {
	currentDark = !currentDark;
	applyTheme();
}

function applyTheme(): void {
	if (!browser) return;
	document.documentElement.classList.toggle('dark', currentDark);
	localStorage.setItem('theme', currentDark ? 'dark' : 'light');
	listeners.forEach((fn) => fn());
}

export function onThemeChange(fn: () => void): () => void {
	listeners.push(fn);
	return () => {
		listeners = listeners.filter((l) => l !== fn);
	};
}
