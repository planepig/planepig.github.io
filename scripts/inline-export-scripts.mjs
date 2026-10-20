import { readFile, readdir, realpath, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// A static academic page should survive a crawler declining separate JS fetches.
// Keep the chunk files for client-side navigation, but embed each page's startup
// scripts in its HTML so hydration cannot discard its content on a ChunkLoadError.
export async function inlineStartupScripts(html, readAsset) {
  const scripts = [...html.matchAll(/<script\b([^>]*?)\bsrc="(\/_next\/static\/[^"\s]+\.js)"([^>]*)><\/script>/g)];
  const sources = new Set(scripts.map((match) => match[2]));
  const code = new Map(await Promise.all([...sources].map(async (src) => [src, await readAsset(src)])));

  let result = html.replace(/<script\b([^>]*?)\bsrc="(\/_next\/static\/[^"\s]+\.js)"([^>]*)><\/script>/g,
    (_, before, src, after) => {
      const escaped = code.get(src).replace(/<\/script/gi, '<\\/script');
      return `<script${before}data-export-src="${src}"${after}>${escaped}\n//# sourceURL=${src}\n</script>`;
    });

  // These scripts are now inline; preloading their old URLs would waste requests.
  result = result.replace(/<link\b[^>]*>/g, (tag) => {
    const href = tag.match(/\bhref="([^"]+)"/)?.[1];
    return /\brel="preload"/.test(tag) && /\bas="script"/.test(tag) && sources.has(href) ? '' : tag;
  });
  return { html: result, count: scripts.length };
}

async function htmlFiles(directory) {
  const result = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const filename = path.join(directory, entry.name);
    if (entry.isDirectory()) result.push(...await htmlFiles(filename));
    else if (entry.isFile() && entry.name.endsWith('.html')) result.push(filename);
  }
  return result;
}

export async function inlineExport(directory) {
  const output = await realpath(directory);
  const assets = await realpath(path.join(output, '_next', 'static'));
  let count = 0;
  const files = await htmlFiles(output);
  for (const filename of files) {
    const result = await inlineStartupScripts(await readFile(filename, 'utf8'), async (src) => {
      const asset = await realpath(path.resolve(output, src.slice(1)));
      if (!asset.startsWith(`${assets}${path.sep}`)) throw new Error('Script is outside exported assets');
      return readFile(asset, 'utf8');
    });
    if (result.count) await writeFile(filename, result.html);
    count += result.count;
  }
  return { files: files.length, scripts: count };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = await inlineExport(path.resolve('out'));
  console.log(`Embedded ${result.scripts} startup scripts across ${result.files} exported HTML pages.`);
}
