#!/usr/bin/env node
import sharp from 'sharp';
import { readdir, stat, mkdir } from 'node:fs/promises';
import { join, extname, basename, dirname, relative } from 'node:path';

const CONTENT_DIR = 'content';
const OUTPUT_DIR = 'static/optimized';
const WIDTHS = [640, 960, 1280];
const QUALITY = 80;
const IMAGE_EXTS = new Set(['.png', '.jpg', '.jpeg', '.gif']);

async function findImages(dir) {
	const entries = await readdir(dir, { withFileTypes: true });
	const files = [];
	for (const entry of entries) {
		const full = join(dir, entry.name);
		if (entry.isDirectory()) {
			files.push(...(await findImages(full)));
		} else if (IMAGE_EXTS.has(extname(entry.name).toLowerCase())) {
			files.push(full);
		}
	}
	return files;
}

async function optimizeImage(inputPath) {
	const rel = relative(CONTENT_DIR, inputPath);
	const name = basename(rel, extname(rel));
	const dir = dirname(rel);
	const outDir = join(OUTPUT_DIR, dir);
	await mkdir(outDir, { recursive: true });

	const img = sharp(inputPath);
	const meta = await img.metadata();

	for (const w of WIDTHS) {
		if (meta.width && w > meta.width) continue;
		const outPath = join(outDir, `${name}-${w}w.webp`);
		await sharp(inputPath).resize(w).webp({ quality: QUALITY }).toFile(outPath);
		console.log(`  ${outPath}`);
	}

	const fullWebp = join(outDir, `${name}.webp`);
	await sharp(inputPath).webp({ quality: QUALITY }).toFile(fullWebp);
	console.log(`  ${fullWebp}`);
}

async function main() {
	try {
		await stat(CONTENT_DIR);
	} catch {
		console.log('No content directory found');
		return;
	}

	const images = await findImages(CONTENT_DIR);
	if (images.length === 0) {
		console.log('No images found to optimize');
		return;
	}

	console.log(`Found ${images.length} image(s)`);
	await mkdir(OUTPUT_DIR, { recursive: true });

	for (const img of images) {
		console.log(`Optimizing: ${img}`);
		await optimizeImage(img);
	}
	console.log('Done!');
}

main().catch(console.error);
