import { CompressOptions, OutputFormat } from "../../models";
import { encodeAvif } from "./avif";
import { encodeJpeg } from "./jpeg";
import { encodeJxl } from "./jxl";
import { encodePng } from "./png";
import { encodeWebp } from "./webp";
import { EncodeResult, RawImage } from "./types";

export { encodeOriginal } from "./original";
export type { EncodeResult, RawImage };

export async function encodeRgba(
  format: Exclude<OutputFormat, "original">,
  image: RawImage,
  options: CompressOptions
): Promise<EncodeResult> {
  const { width, height } = image;
  switch (format) {
    case "avif":
      return {
        buffer: await encodeAvif(image, options),
        width,
        height,
        ext: ".avif",
        mime: "image/avif",
      };
    case "webp":
      return {
        buffer: await encodeWebp(image, options),
        width,
        height,
        ext: ".webp",
        mime: "image/webp",
      };
    case "jpeg":
    case "jpg":
      return {
        buffer: await encodeJpeg(image, options),
        width,
        height,
        ext: ".jpg",
        mime: "image/jpeg",
      };
    case "png":
      return {
        buffer: await encodePng(image, options),
        width,
        height,
        ext: ".png",
        mime: "image/png",
      };
    case "jxl":
      return {
        buffer: await encodeJxl(image, options),
        width,
        height,
        ext: ".jxl",
        mime: "image/jxl",
      };
  }
}
