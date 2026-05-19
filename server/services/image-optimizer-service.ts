import { createReadStream } from "fs";
import { writeFile } from "fs/promises";
import { createRequire } from "module";
import { join } from "path";

import { file as fileUtils } from "@strapi/utils";

// Strapi v5 ships the upload plugin as `@strapi/upload`; v4 uses
// `@strapi/plugin-upload`. The two also differ in how the image-manipulation
// service is exposed: v4 exports a factory, v5 exports the service object
// directly. Normalise both into a `() => serviceObject` factory.
//
// When this plugin is consumed via `npm install file:...` (or yarn link), the
// plugin lives outside the consumer's project tree, so its own `require` can't
// resolve `@strapi/*`. Build a require rooted at the consumer (require.main =
// the strapi CLI entry inside the consumer's node_modules) and fall back to
// our own require for the rare case main isn't set (tests, REPL).
function loadImageManipulation(): () => Record<string, unknown> {
  const candidates: NodeRequire[] = [];
  const mainFile = require.main?.filename;
  if (mainFile) {
    try {
      candidates.push(createRequire(mainFile));
    } catch {}
  }
  try {
    candidates.push(createRequire(join(process.cwd(), "package.json")));
  } catch {}
  candidates.push(require);

  let pluginUpload: any;
  let lastErr: unknown;
  outer: for (const r of candidates) {
    for (const id of [
      "@strapi/upload/strapi-server",
      "@strapi/plugin-upload/strapi-server",
    ]) {
      try {
        pluginUpload = r(id);
        break outer;
      } catch (e) {
        lastErr = e;
      }
    }
  }
  if (!pluginUpload) {
    throw new Error(
      `[strapi-plugin-image-optimizer] Could not locate the upload plugin. ` +
        `Tried @strapi/upload and @strapi/plugin-upload from ${candidates.length} require roots. ` +
        `Last error: ${(lastErr as Error)?.message ?? lastErr}`
    );
  }
  pluginUpload = pluginUpload?.default ?? pluginUpload;
  const svc = pluginUpload().services["image-manipulation"];
  return typeof svc === "function" ? svc : () => svc;
}
const imageManipulation = loadImageManipulation();

import {
  CompressOptions,
  Config,
  File,
  ImageSize,
  OutputFormat,
  OutputFormatConfig,
  SourceFile,
  SourceFormat,
  StrapiImageFormat,
} from "../models";
import { encodeOriginal, encodeRgba } from "./encoders";
import { resizeToRaw } from "./resize";
import settingsService from "./settings-service";

const DEFAULT_FORMATS: OutputFormatConfig[] = [{ format: "avif" }];
const DEFAULT_INCLUDE: SourceFormat[] = ["jpeg", "jpg", "png"];
const DEFAULT_COMPRESS: Required<CompressOptions> = {
  quality: 85,
  lossless: false,
  effort: 4,
  subsample: "4:4:4",
  tune: "ssim",
};

async function optimizeImage(file: SourceFile): Promise<StrapiImageFormat[]> {
  const {
    exclude = [],
    formats = DEFAULT_FORMATS,
    include = DEFAULT_INCLUDE,
    sizes,
    additionalResolutions,
    compress: globalCompress,
  } = settingsService.settings as Config;

  const sourceFileType = file.ext.replace(".", "").toLowerCase() as SourceFormat;
  if (exclude.includes(sourceFileType) || !include.includes(sourceFileType)) {
    return [];
  }

  const promises: Promise<StrapiImageFormat>[] = [];
  for (const formatConfig of formats) {
    const effectiveCompress: CompressOptions = {
      ...DEFAULT_COMPRESS,
      ...globalCompress,
      ...formatConfig.compress,
    };
    for (const size of sizes) {
      promises.push(generateImage(file, formatConfig.format, size, effectiveCompress));
      if (additionalResolutions) {
        for (const factor of additionalResolutions) {
          promises.push(
            generateImage(file, formatConfig.format, size, effectiveCompress, factor)
          );
        }
      }
    }
  }
  return Promise.all(promises);
}

async function generateImage(
  sourceFile: SourceFile,
  format: OutputFormat,
  size: ImageSize,
  compress: CompressOptions,
  resizeFactor = 1
): Promise<StrapiImageFormat> {
  const sizePart = resizeFactor === 1 ? size.name : `${size.name}_${resizeFactor}x`;
  const formatPart = format === "original" ? "" : `_${format}`;
  const key = `${sizePart}${formatPart}`;

  const result =
    format === "original"
      ? await encodeOriginal(sourceFile, size, resizeFactor, compress)
      : await encodeRgba(format, await resizeToRaw(sourceFile, size, resizeFactor), compress);

  const imageHash = `${key}_${sourceFile.hash}`;
  const filePath = join(sourceFile.tmpWorkingDirectory, imageHash);
  await writeFile(filePath, result.buffer);

  const file: File = {
    name: buildFileName(sourceFile, sizePart),
    hash: imageHash,
    ext: result.ext,
    mime: result.mime,
    path: sourceFile.path,
    width: result.width,
    height: result.height,
    size: fileUtils.bytesToKbytes(result.buffer.byteLength),
    getStream: () => createReadStream(filePath),
  };

  return { key, file };
}

function buildFileName(sourceFile: File, sizeName: string): string {
  const stem = sourceFile.name.replace(/\.[^./]+$/, "");
  return `${sizeName}_${stem}`;
}

export default () => ({
  ...imageManipulation(),
  generateResponsiveFormats: optimizeImage,
});
