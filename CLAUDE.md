# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `yarn build` / `npm run build` — compile TypeScript from `server/` to `dist/` (this is what gets published and what `strapi-server.js` loads at runtime).
- `yarn develop` / `npm run develop` — `tsc -w` watch mode; use this while iterating against the example app.
- `npm_config_build_from_source=true yarn install` (or the `install:apple_arm` script) — on Apple Silicon, native deps (sharp) sometimes need a from-source build.
- Node engine is pinned to `>=18 <=20.x`. Newer Node will be rejected by `engines`.
- No test runner is configured. `tsconfig.json` excludes `**/*.test.ts` but no scripts run them.

There is no lint script. A `.prettierrc` is present but not wired to any command.

## Architecture

This is a Strapi v4 plugin that replaces image processing in Strapi's built-in `upload` plugin. Two things are non-obvious and worth knowing before changing code:

### Runtime entry point is the compiled output

`package.json#main` is `strapi-server.js`, which simply `require("./dist/server")`. Strapi loads `dist/`, not `server/`. **You must run `tsc` (or have `develop` running) for source changes to take effect** — editing `server/*.ts` alone does nothing at runtime. The example app and downstream consumers both load from `dist/`.

### The plugin works by being injected into Strapi's upload plugin

This plugin does **not** expose its service through normal Strapi plugin wiring. Instead, consumers add a Strapi extension at `./src/extensions/upload/strapi-server.ts` that swaps `plugin.services["image-manipulation"]` with the service exported from `strapi-plugin-image-optimizer/dist/server/services/image-optimizer-service`. See the README "Extend Strapi's upload plugin" section.

The exported service factory (`server/services/image-optimizer-service.ts`) spreads the **original** `image-manipulation` service from `@strapi/plugin-upload/strapi-server` and overrides only `generateResponsiveFormats`. That key is the specific hook Strapi's upload pipeline calls during image processing — everything else (thumbnail generation, format detection, etc.) is preserved by the spread. If Strapi renames or restructures `generateResponsiveFormats`, this plugin breaks; the README explicitly warns this API is semi-internal.

### How `generateResponsiveFormats` works

For each uploaded `SourceFile` it produces a cartesian product:

```
formats × sizes × (1 + additionalResolutions)
```

Each combination becomes one `StrapiImageFormat { key, file }`. The `key` (e.g. `md_2x_webp`) is what Strapi stores in the `formats` JSON column of the media library. `resizeFileTo` pipes the source stream through `sharp`, writes to `sourceFile.tmpWorkingDirectory`, then reads back to extract metadata. The format `"original"` skips `sharp.toFormat()` entirely so the source mime/ext is preserved.

`sharpAddFormatSettings` always chains `.jpeg().png().webp().avif().heif().tiff()` with `force: false` — sharp only applies the matching one to whichever format `toFormat()` selected (or kept from the source). Don't "simplify" this by branching on `format`; the `force: false` pattern is intentional.

### Config

Config is read at call time via `strapi.config.get('plugin.image-optimizer')` (see `settings-service.ts`). `server/config/schema.ts` is a yup schema run by Strapi's `validator` hook (`server/config/index.ts`). The TypeScript `Config` interface in `server/models/config.ts` and the yup schema must be kept in sync — they are two parallel declarations of the same shape and there is no codegen between them.

`exclude` takes precedence over `include`. Both are matched against the lowercased file extension (without the dot).

## Repository layout notes

- `server/` — TS sources; compiled to `dist/server/` by `tsc`.
- `example/` — a standalone Strapi app used to dogfood the plugin locally. It is not part of the published package (`.npmignore`).
- `assets/` — logo/screenshots used in the README.
- There is no `admin/` directory; this is a server-only plugin (no admin UI). `tsconfig.json` excludes `admin/` defensively.

## Publishing

Releases run via semantic-release through `.github/workflows/` (branches `main` and `beta`). Don't manually bump `package.json#version`.
