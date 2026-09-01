import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Regenerates the token package from the approved prototype.
 *
 * The prototype is an approved Stage 3 artefact and is never modified. This
 * script only reads it. If a token value must change, the change belongs in the
 * design specification and the prototype - not here.
 */
const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, '../../..');
const proto = readFileSync(resolve(repoRoot, 'docs/prototype.html'), 'utf8');

const rootBlock = /:root\s*\{([\s\S]*?)\}/.exec(proto);
if (!rootBlock) {
  console.error('FAIL: no :root block found in docs/prototype.html');
  process.exit(1);
}

const decls = [...rootBlock[1].matchAll(/(--[a-z0-9-]+)\s*:\s*([^;]+);/g)].map((m) => [
  m[1],
  m[2].trim(),
]);

if (decls.length === 0) {
  console.error('FAIL: no token declarations extracted');
  process.exit(1);
}

const css = `/*\n * GENERATED from docs/prototype.html (approved Stage 3). Do not edit by hand.\n */\n:root {\n${decls
  .map(([k, v]) => `  ${k}: ${v};`)
  .join('\n')}\n}\n`;

mkdirSync(resolve(here, '../src'), { recursive: true });
writeFileSync(resolve(here, '../src/tokens.css'), css, 'utf8');
console.log(`regenerated ${decls.length} tokens`);
