import { readFile } from "fs/promises";
import path from "path";
import { CompressOptions } from "../../models";
import { RawImage } from "./types";

let modPromise: Promise<any> | null = null;
function getModule() {
  if (!modPromise) {
    modPromise = (async () => {
      const mod: any = await import("@jsquash/jxl/encode.js");
      const pkgRoot = path.dirname(
        require.resolve("@jsquash/jxl/package.json")
      );
      const wasmBinary = await readFile(
        path.join(pkgRoot, "codec/enc/jxl_enc.wasm")
      );
      await mod.init(undefined, { wasmBinary });
      return mod;
    })();
  }
  return modPromise;
}

export async function encodeJxl(
  image: RawImage,
  options: CompressOptions
): Promise<Buffer> {
  const mod = await getModule();
  const result: ArrayBuffer = await mod.default(image, mapOptions(options));
  return Buffer.from(result);
}

function mapOptions(opts: CompressOptions) {
  return {
    quality: opts.quality ?? 85,
    // JXL effort range is 1-9; our config exposes 0-10, clamp into JXL's range.
    effort: clamp(opts.effort ?? 4, 1, 9),
    progressive: false,
    lossless: opts.lossless ?? false,
  };
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}
