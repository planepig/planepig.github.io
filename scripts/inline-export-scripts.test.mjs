import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import { inlineExport, inlineStartupScripts } from './inline-export-scripts.mjs';

test('startup runs without requesting chunks and preserves static content and metadata', async () => {
  const src = '/_next/static/chunks/page.js';
  const html = `<html><head><title>Junyi Zhou</title><link rel="canonical" href="https://planepig.github.io/"/><link rel="preload" as="script" href="${src}"/><link rel="preload" as="image" href="/portrait.jpg"/></head><body><h1>Junyi Zhou</h1><script src="${src}" async=""></script></body></html>`;
  const result = await inlineStartupScripts(html, async () => 'globalThis.ready = true;');
  assert.equal(result.count, 1);
  assert.ok(result.html.includes('<h1>Junyi Zhou</h1>'));
  assert.ok(result.html.includes('<link rel="canonical" href="https://planepig.github.io/"/>'));
  assert.ok(result.html.includes('as="image"'));
  assert.ok(!result.html.includes('as="script"'));
  assert.ok(!result.html.includes('<script src='));
  const context = vm.createContext({});
  vm.runInContext(result.html.match(/<script[^>]*>([\s\S]*?)<\/script>/)[1], context);
  assert.equal(context.ready, true);
});

test('embedded script content cannot close its HTML element', async () => {
  const result = await inlineStartupScripts('<script src="/_next/static/chunks/a.js"></script>', async () => 'globalThis.value = "</script><h1>unsafe</h1>";');
  assert.equal((result.html.match(/<\/script>/g) || []).length, 1);
  const context = vm.createContext({});
  vm.runInContext(result.html.match(/<script[^>]*>([\s\S]*?)<\/script>/)[1], context);
  assert.equal(context.value, '</script><h1>unsafe</h1>');
});

test('preserves existing inline code and third-party scripts; processing is idempotent', async () => {
  const html = '<script>globalThis.theme = "light";</script><script src="https://example.com/stats.js" async></script><script nomodule="" src="/_next/static/chunks/polyfills.js"></script>';
  const first = await inlineStartupScripts(html, async () => 'globalThis.legacy = true;');
  assert.ok(first.html.startsWith('<script>globalThis.theme = "light";</script>'));
  assert.ok(first.html.includes('src="https://example.com/stats.js"'));
  assert.ok(first.html.includes('nomodule=""'));
  const second = await inlineStartupScripts(first.html, async () => { throw new Error('Unexpected read'); });
  assert.equal(second.html, first.html);
  assert.equal(second.count, 0);
});

test('processes all exported routes, retaining chunks for navigation', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'junyi-export-'));
  try {
    await mkdir(path.join(root, '_next/static/chunks'), { recursive: true });
    await mkdir(path.join(root, 'publications'));
    const asset = path.join(root, '_next/static/chunks/a.js');
    await writeFile(asset, 'globalThis.ready = true;');
    for (const file of ['index.html', 'publications/index.html']) await writeFile(path.join(root, file), '<script src="/_next/static/chunks/a.js" async></script>');
    assert.deepEqual(await inlineExport(root), { files: 2, scripts: 2 });
    assert.equal(await readFile(asset, 'utf8'), 'globalThis.ready = true;');
    assert.ok((await readFile(path.join(root, 'publications/index.html'), 'utf8')).includes('globalThis.ready'));
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('fails the build when a referenced startup script is missing', async () => {
  await assert.rejects(inlineStartupScripts('<script src="/_next/static/chunks/missing.js"></script>', async () => { throw new Error('Missing asset'); }), /Missing asset/);
});
