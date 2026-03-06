import * as esbuild from 'esbuild';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { argv } from 'process';

const watch = argv.includes('--watch');

const ctx = await esbuild.context({
  entryPoints: ['src/widget.ts'],
  bundle: true,
  minify: !watch,
  format: 'iife',
  outfile: '../dist/eral-widget.js',
  platform: 'browser',
  target: ['es2020', 'chrome80', 'firefox75', 'safari14'],
  define: { 'process.env.NODE_ENV': watch ? '"development"' : '"production"' },
  banner: {
    js: '/* Eral Widget v0.2.0 — eral.wokspec.org — MIT */',
  },
});

if (watch) {
  await ctx.watch();
  console.log('Watching for changes...');
} else {
  await ctx.rebuild();
  await mkdir('../dist', { recursive: true });
  const bundle = await readFile('../dist/eral-widget.js', 'utf8');
  await writeFile('../dist/eral-widget.txt', bundle, 'utf8');
  await ctx.dispose();
  console.log('Built: ../dist/eral-widget.js and ../dist/eral-widget.txt');
}
