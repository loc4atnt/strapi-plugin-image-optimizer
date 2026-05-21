import sharp from "sharp";
import { CompressOptions } from "../../models";
import { RawImage } from "./types";

// AVIF is encoded with sharp's native libvips/libaom encoder instead of the
// @jsquash/avif WASM codec. The WASM encoder is single-threaded and runs
// synchronously on the Node event loop, so a full-resolution upload could spend
// minutes encoding and FREEZE the whole Strapi server for that entire duration
// (e.g. POST /upload (217898 ms)). sharp produces an equivalent file at the
// same quality settings, far faster, and runs in libvips' threadpool, so it
// never blocks the event loop.
//
// `image` is the already-resized sRGB RGBA buffer produced by `resizeToRaw`, so
// we hand it to sharp as raw pixel data and only run the encode step here.
export async function encodeAvif(
  image: RawImage,
  options: CompressOptions
): Promise<Buffer> {
  const { data, width, height } = image;
  const raw = Buffer.from(data.buffer, data.byteOffset, data.byteLength);
  return sharp(raw, { raw: { width, height, channels: 4 } })
    .avif({
      quality: options.quality ?? 85,
      lossless: options.lossless ?? false,
      // sharp's effort is 0-9 (higher = slower/smaller); clamp to keep it valid.
      effort: clamp(options.effort ?? 4, 0, 9),
      chromaSubsampling: mapSubsample(options.subsample),
    })
    .toBuffer();
}

// sharp's AVIF only supports 4:4:4 and 4:2:0; collapse anything chroma-subsampled
// (e.g. 4:2:2) to 4:2:0 and keep 4:4:4 as-is. `tune` has no sharp equivalent and
// is intentionally dropped — the quality target (quality + subsampling) is kept.
function mapSubsample(s: CompressOptions["subsample"]): "4:4:4" | "4:2:0" {
  return s === "4:4:4" ? "4:4:4" : "4:2:0";
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}
