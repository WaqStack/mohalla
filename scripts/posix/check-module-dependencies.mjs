import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * ARCHITECTURE GUARD - module dependency direction.
 *
 * Enforces docs/architecture/06-backend-modules.md section 3:
 *
 *     Admin  ->  Product  ->  Platform  ->  (nothing)
 *
 * A module may import from its own tier or any tier BELOW it. Never above.
 *
 * WHY THIS IS A BUILD FAILURE
 *
 * Two developers working with AI agents will implement 124 requirements. The
 * largest maintainability risk is an agent asked to fix messaging reaching into
 * moderation because the import compiled. NestJS stops the *injection*, but
 * nothing stops the *import* - so the import is what this checks.
 *
 * It also fails on any module directory missing from the registry, so a new
 * module cannot appear outside the tier system.
 */
const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, '../..');
const modulesRoot = resolve(repoRoot, 'apps/api/src/modules');
const registryPath = join(modulesRoot, 'modules.registry.ts');

const RANK = { platform: 0, product: 1, admin: 2 };

// Read the registry as text rather than importing it - this script runs before
// any TypeScript build step exists.
const registrySrc = readFileSync(registryPath, 'utf8');

function parseTier(tier) {
  const m = new RegExp(`${tier}:\\s*\\[([^\\]]*)\\]`).exec(registrySrc);
  if (!m) {
    console.error(`FAIL: tier '${tier}' not found in modules.registry.ts`);
    process.exit(2);
  }
  // Accept either quote style. Prettier normalises this file to single quotes,
  // and a guard that silently reports "no modules registered" after a formatting
  // pass is worse than no guard at all - it fails open.
  return [...m[1].matchAll(/['"]([^'"]+)['"]/g)].map((x) => x[1]);
}

const declared = {
  platform: parseTier('platform'),
  product: parseTier('product'),
  admin: parseTier('admin'),
};

/** module name -> tier */
const tierOf = new Map();
for (const [tier, names] of Object.entries(declared)) {
  for (const n of names) tierOf.set(n, tier);
}

// ---------------------------------------------------------- registry vs disk
const onDisk = [];
for (const tier of Object.keys(RANK)) {
  const dir = join(modulesRoot, tier);
  let entries = [];
  try {
    entries = readdirSync(dir).filter((e) => statSync(join(dir, e)).isDirectory());
  } catch {
    console.error(`FAIL: missing tier directory apps/api/src/modules/${tier}`);
    process.exit(1);
  }
  for (const e of entries) onDisk.push([tier, e]);
}

const violations = [];

for (const [tier, name] of onDisk) {
  if (!declared[tier].includes(name)) {
    violations.push(
      `unregistered module: apps/api/src/modules/${tier}/${name} is not listed in modules.registry.ts`,
    );
  }
}
for (const [tier, names] of Object.entries(declared)) {
  for (const n of names) {
    if (!onDisk.some(([t, d]) => t === tier && d === n)) {
      violations.push(`registered module has no directory: ${tier}/${n}`);
    }
  }
}

// ------------------------------------------------------------ import scanning
function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (p.endsWith('.ts')) out.push(p);
  }
  return out;
}

const IMPORT_RE = /(?:import|export)[^'"]*from\s+['"]([^'"]+)['"]/g;

for (const [tier, name] of onDisk) {
  const dir = join(modulesRoot, tier, name);
  for (const file of walk(dir)) {
    const src = readFileSync(file, 'utf8');
    for (const m of src.matchAll(IMPORT_RE)) {
      const spec = m[1];

      // Only relative imports can reach another module directory.
      if (!spec.startsWith('.')) continue;

      const target = resolve(dirname(file), spec);
      if (!target.startsWith(modulesRoot)) continue;

      const rel = target.slice(modulesRoot.length + 1).split(/[\\/]/);
      const [targetTier, targetName] = rel;
      if (!targetTier || !targetName) continue;
      if (targetTier === tier && targetName === name) continue;

      const from = RANK[tier];
      const to = RANK[targetTier];
      if (to === undefined) continue;

      if (to > from) {
        const shown = file.slice(repoRoot.length + 1);
        violations.push(
          `${shown}\n    ${tier}/${name} (tier ${tier}) imports ${targetTier}/${targetName} (tier ${targetTier})\n    Dependencies point downward only: admin -> product -> platform.`,
        );
      }
    }
  }
}

if (violations.length > 0) {
  console.error(`FAIL: ${violations.length} module dependency violation(s)\n`);
  for (const v of violations) console.error(`  - ${v}\n`);
  process.exit(1);
}

const total = onDisk.length;
console.log(
  `OK: ${total} modules (${declared.platform.length} platform, ${declared.product.length} product, ${declared.admin.length} admin) - dependency direction clean`,
);
