# @mohalla/config

Shared TypeScript presets.

| Preset | For |
|---|---|
| `tsconfig.node.json` | Node applications that emit JavaScript — `apps/api`, `apps/worker` |
| `tsconfig.lib.json` | Type-only shared packages consumed from source |

The apps currently extend `tsconfig.base.json` directly. These presets exist so
that a per-app compiler option added later has one place to live rather than
being copied into each app's `tsconfig.json` and drifting.

**No ESLint or Prettier preset lives here.** Both are configured once at the
repository root — `eslint.config.mjs` and `.prettierrc.json` — because flat
ESLint config and Prettier both resolve from the root and a second copy would
only create disagreement about which one applies.
