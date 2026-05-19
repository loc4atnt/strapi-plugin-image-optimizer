import sharp from "sharp";
import { file as fileUtils } from "@strapi/utils";

import { CompressOptions, ImageSize, SourceFile } from "../../models";
import { EncodeResult } from "./types";

// "original" path: keep the source format (no codec swap), but still apply resize
// and the configured quality. This mirrors v2 behaviour (sharp full pipeline) for
// users who want to re-emit JPGs as JPGs at the configured quality.
export async function encodeOriginal(
  sourceFile: SourceFile,
  size: ImageSize,
  resizeFactor: number,
  options: CompressOptions
): Promise<EncodeResult> {
  const sourceBuffer = await fileUtils.streamToBuffer(sourceFile.getStream());

  let pipeline = sharp(sourceBuffer);

  const { width, height } = resolveTargetDimensions(size, resizeFactor, sourceFile);
  if (width !== undefined || height !== undefined) {
    pipeline = pipeline.resize({
      width,
      height,
      fit: size.fit,
      position: size.position === "center" ? undefined : size.position,
      withoutEnlargement: size.withoutEnlargement,
    });
  }

  const quality = options.quality ?? 85;
  // Chain every codec with `force: false` so only the matching one fires for
  // the detected source format. Mirrors the original sharpAddFormatSettings
  // pattern. heif requires `compression` since sharp 0.33 — we don't ship a
  // heif output, so omit it.
  pipeline = pipeline
    .jpeg({ quality, progressive: true, force: false })
    .png({
      compressionLevel: Math.floor((quality / 100) * 9),
      progressive: true,
      force: false,
    })
    .webp({ quality, force: false })
    .avif({ quality, force: false })
    .tiff({ quality, force: false });

  const { data: buffer, info } = await pipeline.toBuffer({
    resolveWithObject: true,
  });

  return {
    buffer,
    width: info.width,
    height: info.height,
    ext: sourceFile.ext,
    mime: sourceFile.mime,
  };
}

function resolveTargetDimensions(
  size: ImageSize,
  factor: number,
  sourceFile: SourceFile
): { width: number | undefined; height: number | undefined } {
  const noConfiguredSize = !size.width && !size.height;
  const sourceWidth = (sourceFile as SourceFile & { width?: number }).width;
  const sourceHeight = (sourceFile as SourceFile & { height?: number }).height;
  const baseWidth = noConfiguredSize ? sourceWidth : size.width;
  const baseHeight = noConfiguredSize ? sourceHeight : size.height;
  return {
    width: baseWidth ? Math.round(baseWidth * factor) : undefined,
    height: baseHeight ? Math.round(baseHeight * factor) : undefined,
  };
}
