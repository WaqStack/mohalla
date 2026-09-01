import { readdirSync, readFileSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * LOCALIZATION GUARD - English/Urdu key parity.
 *
 * Enforces LOCALE-FR-001 and REL-002: Urdu is a peer language, not a fallback.
 *
 * WHY THIS IS A BUILD FAILURE
 *
 * DEP-011 (OD-016) is roughly 400 Urdu strings owned by Shehersaaz and still
 * open. Without this gate, a release could ship with English keys silently
 * rendering in an Urdu interface and nobody would notice until a user did.
 * With it, a missing Urdu key stops the build - so the dependency stays visible
 * instead of quietly becoming a defect.
 */
const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, '../..');
const base = resolve(repoRoot, 'packages/localization/src');

function load(locale) {
  const dir = join(base, locale);
  const out = new Map();
  let files;
  try {
    files = readdirSync(dir).filter((f) => f.endsWith('.json'));
  } catch {
    console.error(`FAIL: missing catalogue directory packages/localization/src/${locale}`);
    process.exit(1);
  }
  for (const f of files) {
    const json = JSON.parse(readFileSync(join(dir, f), 'utf8'));
    for (const [k, v] of Object.entries(json)) out.set(`${f}:${k}`, v);
  }
  return out;
}

const en = load('en');
const ur = load('ur');

const missingUr = [...en.keys()].filter((k) => !ur.has(k));
const orphanUr = [...ur.keys()].filter((k) => !en.has(k));
const emptyUr = [...ur.entries()].filter(([, v]) => typeof v !== 'string' || v.trim() === '');

let failed = false;

if (missingUr.length > 0) {
  failed = true;
  console.error(`FAIL: ${missingUr.length} key(s) present in en but missing in ur:`);
  for (const k of missingUr) console.error(`  ${k}`);
}
if (orphanUr.length > 0) {
  failed = true;
  console.error(`FAIL: ${orphanUr.length} key(s) present in ur but missing in en:`);
  for (const k of orphanUr) console.error(`  ${k}`);
}
if (emptyUr.length > 0) {
  failed = true;
  console.error(`FAIL: ${emptyUr.length} Urdu value(s) are empty:`);
  for (const [k] of emptyUr) console.error(`  ${k}`);
}

if (failed) process.exit(1);

console.log(`OK: ${en.size} keys, en/ur parity complete`);
