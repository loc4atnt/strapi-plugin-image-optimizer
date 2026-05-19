# ⚠️ Looking for a Maintainer ⚠️

Hi there, I do not use Strapi anymore (Actually I never really used it). I evaluated Strapi as a headless CMS a while ago and since I was missing a functionallity to scale and format uploaded images, I was happy to find that [@nicolashmln](https://github.com/nicolashmln) already created a great plugin for this. Nevertheless, it has only one issue (at least it was an issue for me): The image sizes and format to transform the uploaded images to could not be declared in code. Therefore, I created a fork which I then published. Since I expected to use Strapi as CMS (because it made a good impression) I thought it makes sense to share this with the world.

However, some weeks later I decided to move from Strapi due to a bunch of reasons which are not really important at this point (self-hosting, etc.). This plugin however is forced to use a semi-internal Strapi API which was and is sometimes subject to changes (because this is the only reason to hook into the upload process). Therefore, sometimes changes are required or otherwise the plugin even breaks with minor changes (which is pretty bad☹️). However, since I do not use Strapi anymore I think it is better to pass this plugin to somebody who knows Strapi better than I do. **If you use Strapi and this plugin regularly and feel confident to take over the maintainership of this repo contact me on LinkedIn or Instagram under @marlokessler.**

Thank you!

Cheers
Marlo

---

<img src="assets/logo.png" alt="image optimizer logo" width="75"/>

# Strapi plugin image optimizer

![Version](https://img.shields.io/npm/v/strapi-plugin-image-optimizer?label=strapi-plugin-image-optimizer)
[![License](https://img.shields.io/github/license/marlokessler/strapi-plugin-image-optimizer)](https://github.com/marlokessler/strapi-plugin-image-optimizer/blob/main/LICENSE)
![Dependencies](https://img.shields.io/librariesio/github/marlokessler/strapi-plugin-image-optimizer)
[![Deploy](https://github.com/marlokessler/strapi-plugin-image-optimizer/actions/workflows/deploy.yml/badge.svg)](https://github.com/marlokessler/strapi-plugin-image-optimizer/actions/workflows/deploy.yml)
[![All Contributors](https://img.shields.io/github/all-contributors/marlokessler/strapi-plugin-image-optimizer)](#contributors-)

## Table of contents

- [Breaking changes in v3](#breaking-changes-in-v3)
- [Requirements](#requirements)
- [Installation](#installation)
  - [1. Install package](#1-install-package)
  - [2. Extend Strapi's upload plugin](#2-extend-strapis-upload-plugin)
  - [3. Add config options](#3-add-config-options)
- [Config options](#config-options)
  - [Object `Config`](#object-config)
  - [Object `OutputFormatConfig`](#object-outputformatconfig)
  - [Object `CompressOptions`](#object-compressoptions)
  - [Object `ImageSize`](#object-imagesize)
  - [Type `SourceFormat`](#type-sourceformat)
  - [Type `OutputFormat`](#type-outputformat)
  - [Type `ImageFit`](#type-imagefit)
  - [Type `ImagePosition`](#type-imageposition)
  - [Example config](#example-config)
- [Usage](#usage)
- [Found a bug?](#found-a-bug)
- [Contributors](#contributors-)

## Breaking changes in v3

v3 swaps the encoding backend from sharp to [jSquash](https://github.com/jamsinclair/jSquash) (the WASM ports of Google Squoosh's codecs). Sharp is still used for resizing, since jSquash has no fit-mode resize.

What changed:

- **`quality: number`** at the top level of `config` is **removed**. Use `compress: { quality, ... }` (global default) and/or per-format `formats: [{ format, compress: {...} }]` instead. Old configs will fail validation.
- **`formats`** changed from `string[]` (e.g. `["original", "avif"]`) to `OutputFormatConfig[]` (e.g. `[{ format: "avif", compress: {...} }]`).
- **`OutputFormat`** is narrower: `"original" | "avif" | "webp" | "jpeg" | "jpg" | "png" | "jxl"`. The other sharp formats (`heif`, `tiff`, `gif`, `svg`, `dz`, etc.) were dropped because jSquash does not encode them. They are still allowed in `SourceFormat` for include/exclude filtering.
- New per-codec controls: `lossless`, `effort`, `subsample` (AVIF/JPEG), `tune` (AVIF). Defaults match Squoosh's app: `quality: 85`, `lossless: false`, `effort: 4`, `subsample: "4:4:4"`, `tune: "ssim"`. Default formats: `[{ format: "avif" }]`.
- Node engine widened to `>=18.0.0` (was capped at `<=20.x.x`).

## Requirements

Strapi version >= v4.11.7. Node 18+.

## Note

v3 uses [jSquash](https://github.com/jamsinclair/jSquash) (the WASM ports of Google Squoosh's codecs) for encoding and [sharp](https://sharp.pixelplumbing.com/) for resizing. Sharp is declared as a `peerDependency` and is satisfied transitively by Strapi's upload plugin. Resize options (`fit`, `position`, `withoutEnlargement`) follow sharp's [resize API](https://sharp.pixelplumbing.com/api-resize). Encode options follow each jSquash codec's defaults.

Animated source images (animated GIF/WebP) are encoded as a single still frame — sharp decodes only the first frame by default, and jSquash's encoders are still-image only.

## Installation

### 1. Install package

Install the package via `npm install strapi-plugin-image-optimizer` or `yarn add strapi-plugin-image-optimizer`.

### 2. Extend Strapi's upload plugin

To make this plugin work, you need to enter the following code to `./src/extensions/upload/strapi-server.ts`. If file and folders do not exist, you need to create them. This code overrides the default image manipulation service of Strapi's `upload` plugin.

```typescript
// ./src/extensions/upload/strapi-server.ts

import imageOptimizerService from "strapi-plugin-image-optimizer/dist/server/services/image-optimizer-service";

module.exports = (plugin) => {
  plugin.services["image-manipulation"] = imageOptimizerService;
  return plugin;
};
```

### 3. Add config options

Configure the plugin in the `config/plugins.(js/ts)` file of your Strapi project.

## Config options

### Object `Config`

| Option                  | Type                                                       | Description                                                                                                                                       |
| ----------------------- | ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `additionalResolutions` | `number[]`                                                 | Extra resolution multipliers (e.g. `[1.5, 2]` for retina). Default is `[]`.                                                                       |
| `compress`              | [`CompressOptions`](#object-compressoptions)               | Default compress settings merged into every output format. Per-format `compress` overrides any matching key here. See defaults below.             |
| `exclude`               | [`SourceFormat`](#type-sourceformat)`[]`                   | Source formats to skip. Takes precedence over `include`. Default is `[]`.                                                                         |
| `formats`               | [`OutputFormatConfig`](#object-outputformatconfig)`[]`     | Output formats to generate, with optional per-format compress. Default is `[{ format: "avif" }]`.                                                 |
| `include`               | [`SourceFormat`](#type-sourceformat)`[]`                   | Source formats to optimize. Default is `["jpeg", "jpg", "png"]`.                                                                                  |
| `sizes`<sup>\*</sup>    | [`ImageSize`](#object-imagesize)`[]`                       | (required) - Sizes to which the uploaded image should be resized.                                                                                 |

### Object `OutputFormatConfig`

| Option                  | Type                                              | Description                                                                                                                       |
| ----------------------- | ------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `format`<sup>\*</sup>   | [`OutputFormat`](#type-outputformat)              | (required) - The output format. `"original"` re-encodes in the source format without conversion.                                  |
| `compress`              | [`CompressOptions`](#object-compressoptions)      | Compress settings for this format. Merged on top of the global `compress` and the built-in defaults.                              |

### Object `CompressOptions`

Effective options per format are resolved as `{ ...defaults, ...config.compress, ...formatConfig.compress }`. Built-in defaults match Squoosh's UI:

```
quality: 85, lossless: false, effort: 4, subsample: "4:4:4", tune: "ssim"
```

| Option       | Type                                  | Applies to              | Description                                                                                                                                  |
| ------------ | ------------------------------------- | ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `quality`    | `number` <br/> 0-100                  | AVIF, WebP, JPEG, JXL   | Encoding quality. Higher = better quality, larger file. Ignored for `png` (lossless) and `original` (uses sharp's source-format settings).    |
| `lossless`   | `boolean`                             | AVIF, WebP, JXL         | If `true`, encode losslessly. Ignored for codecs that don't support it.                                                                       |
| `effort`     | `number` <br/> 0-10                   | AVIF, WebP, PNG, JXL    | Encoding effort. Higher = slower, smaller. Mapped to AVIF `speed`, WebP `method`, oxipng `level`, JXL `effort` per codec. Ignored for JPEG.   |
| `subsample`  | `"4:2:0" \| "4:2:2" \| "4:4:4"`       | AVIF, JPEG              | Chroma subsampling. Ignored for other codecs.                                                                                                |
| `tune`       | `"auto" \| "psnr" \| "ssim"`          | AVIF                    | AVIF tuning metric. Ignored for other codecs.                                                                                                |

### Object `ImageSize`

| Option               | Type                                   | Description                                                                                                                                                                                                               |
| -------------------- | -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `fit`                | [`ImageFit`](#type-imagefit)           | The image fit mode if both width and height are specified. Default is `cover`.                                                                                                                                            |
| `height`             | `number` <br/> Min: 0                  | The height of the output image in pixels. If only height is specified then the width is calculated with the original aspect ratio. If neither width nor height are set, the output will be the same size as the original. |
| `name`<sup>\*</sup>  | `string` <br/> Min: 0                  | (required) - The name of the size. This will be used as part of generated image's name and url.                                                                                                                           |
| `position`           | [`ImagePosition`](#type-imageposition) | The position of the image within the output image. This option is only used when fit is cover or contain. Default is `center`.                                                                                            |
| `width`              | `number` <br/> Min: 0                  | The width of the output image in pixels. If only width is specified then the height is calculated with the original aspect ratio. If neither width nor height are set, the output will be the same size as the original.  |
| `withoutEnlargement` | `boolean`                              | When true, the image will not be enlarged if the input image is already smaller than the required dimensions. Default is `false`.                                                                                         |

### Type `SourceFormat`

```typescript
type SourceFormat =
  | "avif"
  | "dz"
  | "fits"
  | "gif"
  | "heif"
  | "input"
  | "jpeg"
  | "jpg"
  | "jp2"
  | "jxl"
  | "magick"
  | "openslide"
  | "pdf"
  | "png"
  | "ppm"
  | "raw"
  | "svg"
  | "tiff"
  | "tif"
  | "v"
  | "webp";
```

### Type `OutputFormat`

```typescript
type OutputFormat =
  | "original"
  | "avif"
  | "webp"
  | "jpeg"
  | "jpg"
  | "png"
  | "jxl";
```

Narrower than `SourceFormat` because jSquash only encodes these formats. `heif`, `tiff`, `gif`, `svg`, etc. were dropped from output in v3.

### Type `ImageFit`

```typescript
type ImageFit = "contain" | "cover" | "fill" | "inside" | "outside";
```

### Type `ImagePosition`

```typescript
type ImagePosition =
  | "top"
  | "right top"
  | "right"
  | "right bottom"
  | "bottom"
  | "left bottom"
  | "left"
  | "left top"
  | "center"
  | "entropy" // only in combination with ImageFit cover
  | "attention"; // only in combination with ImageFit cover;
```

### Example config

The following config is a good starting point for your project.

```typescript
// ./config/plugins.ts

export default ({ env }) => ({
  // ...
  "image-optimizer": {
    enabled: true,
    config: {
      include: ["jpeg", "jpg", "png"],
      exclude: ["gif"],
      formats: [
        {
          format: "avif",
          compress: {
            quality: 85,
            lossless: false,
            effort: 4,
            subsample: "4:4:4",
            tune: "ssim",
          },
        },
        { format: "webp" },        // uses global compress + defaults
        { format: "original" },     // re-encodes in source format
      ],
      sizes: [
        { name: "xs", width: 300 },
        { name: "sm", width: 768 },
        { name: "md", width: 1280 },
        { name: "lg", width: 1920 },
        {
          name: "xl",
          width: 2840,
          // Won't create an image larger than the original size
          withoutEnlargement: true,
        },
        {
          // Uses original size but still transforms for formats
          name: "original",
        },
      ],
      additionalResolutions: [1.5, 2],
      // Global compress — merged into every format's options. Per-format
      // `compress` (above) overrides any matching key. Built-in defaults
      // already match Squoosh, so omitting this is fine.
      compress: {
        quality: 75,
        lossless: false,
        effort: 4,
      },
    },
  },
  // ...
});
```

If you want type safety, you can extend the configuration with our config typing.

With that approach, you will get the possibility for property IntelliSense and static string type values.

```typescript
import { Config as ImageOptimizerConfig } from "strapi-plugin-image-optimizer/dist/server/models/config";

// ...
export default ({ env }) => ({
  // ...
  "image-optimizer": {
    // ...
    config: {
      // ...
    } satisfies ImageOptimizerConfig,
  },
});
```

## Usage

When uploading an image in the media library, Image Optimizer resizes and converts the uploaded images as specified in the config.

## Found a bug?

If you found a bug or have any questions please [submit an issue](https://github.com/marlokessler/strapi-plugin-image-optimizer/issues). If you think you found a way how to fix it, please feel free to create a pull request!

## Contributors ✨

Thanks goes to these wonderful people ([emoji key](https://allcontributors.org/docs/en/emoji-key)):

<!-- ALL-CONTRIBUTORS-LIST:START - Do not remove or modify this section -->
<!-- prettier-ignore-start -->
<!-- markdownlint-disable -->
<table>
  <tbody>
    <tr>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/marlokessler"><img src="https://avatars.githubusercontent.com/u/48910761?v=4?s=100" width="100px;" alt="Marlo Kesser"/><br /><sub><b>Marlo Kesser</b></sub></a><br /><a href="https://github.com/marlokessler/strapi-plugin-image-optimizer/commits?author=marlokessler" title="Code">💻</a> <a href="https://github.com/marlokessler/strapi-plugin-image-optimizer/commits?author=marlokessler" title="Documentation">📖</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://www.linkedin.com/in/yaroslav-zakhidnyi/"><img src="https://avatars.githubusercontent.com/u/32482428?v=4?s=100" width="100px;" alt="Yaroslav Zakhidnyi"/><br /><sub><b>Yaroslav Zakhidnyi</b></sub></a><br /><a href="https://github.com/marlokessler/strapi-plugin-image-optimizer/issues?q=author%3Ayarikwest" title="Bug reports">🐛</a> <a href="https://github.com/marlokessler/strapi-plugin-image-optimizer/commits?author=yarikwest" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/JosefBredereck"><img src="https://avatars.githubusercontent.com/u/13408112?v=4?s=100" width="100px;" alt="Josef Bredreck"/><br /><sub><b>Josef Bredreck</b></sub></a><br /><a href="https://github.com/marlokessler/strapi-plugin-image-optimizer/commits?author=JosefBredereck" title="Code">💻</a> <a href="https://github.com/marlokessler/strapi-plugin-image-optimizer/commits?author=JosefBredereck" title="Documentation">📖</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://cretezy.com"><img src="https://avatars.githubusercontent.com/u/2672503?v=4?s=100" width="100px;" alt="Cretezy"/><br /><sub><b>Cretezy</b></sub></a><br /><a href="https://github.com/marlokessler/strapi-plugin-image-optimizer/commits?author=Cretezy" title="Code">💻</a> <a href="https://github.com/marlokessler/strapi-plugin-image-optimizer/commits?author=Cretezy" title="Documentation">📖</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/Lucurious"><img src="https://avatars.githubusercontent.com/u/6559860?v=4?s=100" width="100px;" alt="Lucurious"/><br /><sub><b>Lucurious</b></sub></a><br /><a href="https://github.com/marlokessler/strapi-plugin-image-optimizer/issues?q=author%3ALucurious" title="Bug reports">🐛</a> <a href="https://github.com/marlokessler/strapi-plugin-image-optimizer/commits?author=Lucurious" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://tyrola.dev"><img src="https://avatars.githubusercontent.com/u/779751?v=4?s=100" width="100px;" alt="Alexander Birkner"/><br /><sub><b>Alexander Birkner</b></sub></a><br /><a href="https://github.com/marlokessler/strapi-plugin-image-optimizer/issues?q=author%3ABirknerAlex" title="Bug reports">🐛</a> <a href="https://github.com/marlokessler/strapi-plugin-image-optimizer/commits?author=BirknerAlex" title="Code">💻</a></td>
    </tr>
  </tbody>
</table>

<!-- markdownlint-restore -->
<!-- prettier-ignore-end -->

<!-- ALL-CONTRIBUTORS-LIST:END -->

<!-- ALL-CONTRIBUTORS-LIST:START - Do not remove or modify this section -->
<!-- prettier-ignore-start -->
<!-- markdownlint-disable -->

<!-- markdownlint-restore -->
<!-- prettier-ignore-end -->

<!-- ALL-CONTRIBUTORS-LIST:END -->

This project follows the [all-contributors](https://github.com/all-contributors/all-contributors) specification. Contributions of any kind welcome!

A special thanks to [@nicolashmln](https://github.com/nicolashmln), whose package [strapi-plugin-responsive-image](https://github.com/nicolashmln/strapi-plugin-responsive-image) served as inspiration for this one.
