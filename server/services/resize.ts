import sharp from "sharp";
import { file as fileUtils } from "@strapi/utils";

import { ImageSize, SourceFile } from "../models";
import { RawImage } from "./encoders/types";

export async function resizeToRaw(
  sourceFile: SourceFile,
  size: ImageSize,
  resizeFactor: number
): Promise<RawImage> {
  const sourceBuffer = await fileUtils.streamToBuffer(sourceFile.getStream());

  // Force sRGB before ensureAlpha so greyscale sources widen to RGBA, not GA.
  // jSquash codecs always expect 4-channel RGBA pixel data.
  let pipeline = sharp(sourceBuffer).toColorspace("srgb").ensureAlpha();

  const { width, height } = resolveTargetDimensions(size, resizeFactor, sourceFile);
  if (width !== undefined || height !== undefined) {
    pipeline = pipeline.resize({
      width,
      height,
      fit: size.fit,
      // "center" is sharp's default — passing it would override an "entropy"/"attention" intent.
      position: size.position === "center" ? undefined : size.position,
      withoutEnlargement: size.withoutEnlargement,
    });
  }

  const { data, info } = await pipeline
    .raw()
    .toBuffer({ resolveWithObject: true });

  return {
    data: new Uint8ClampedArray(data.buffer, data.byteOffset, data.byteLength),
    width: info.width,
    height: info.height,
  };
}

function resolveTargetDimensions(
  size: ImageSize,
  factor: number,
  sourceFile: SourceFile
): { width: number | undefined; height: number | undefined } {
  const noConfiguredSize = !size.width && !size.height;
  // Falls back to source dimensions × factor when the size has no width/height —
  // matches v2 passthrough behaviour for the "original" size entry.
  const sourceWidth = (sourceFile as SourceFile & { width?: number }).width;
  const sourceHeight = (sourceFile as SourceFile & { height?: number }).height;
  const baseWidth = noConfiguredSize ? sourceWidth : size.width;
  const baseHeight = noConfiguredSize ? sourceHeight : size.height;
  return {
    width: baseWidth ? Math.round(baseWidth * factor) : undefined,
    height: baseHeight ? Math.round(baseHeight * factor) : undefined,
  };
}
