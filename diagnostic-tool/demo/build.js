// Builds the browser demo: one HTML file that runs the app's real page code
// with made-up data. Nothing is saved or sent.
//
//   npm run build:demo     -> demo/dist/continuum-demo.html
import { build } from 'esbuild';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const here = (file) => fileURLToPath(new URL(file, import.meta.url));
const stub = here('./stub.js'); // replaces email sending and file writing in the browser

const result = await build({
  entryPoints: [here('./entry.js')],
  bundle: true,
  format: 'iife',
  platform: 'browser',
  minify: true,
  write: false,
  loader: { '.css': 'text' },
  alias: { nodemailer: stub, 'node:fs': stub },
  banner: { js: 'var process={env:{}}; globalThis.__noAutoSkip=true;' },
});
const bundle = result.outputFiles[0].text;
const page = readFileSync(here('./template.html'), 'utf8').replace('/*BUNDLE*/', () => bundle);
mkdirSync(here('./dist'), { recursive: true });
writeFileSync(here('./dist/continuum-demo.html'), page);
console.log(`demo/dist/continuum-demo.html (${Math.round(page.length / 1024)} kB)`);
