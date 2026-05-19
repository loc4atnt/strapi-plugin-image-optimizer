import { readFile } from "fs/promises";
import path from "path";
import { CompressOptions } from "../../models";
import { RawImage } from "./types";

let modPromise: Promise<any> | null = null;
function getModule() {
  if (!modPromise) {
    modPromise = (async () => {
      const mod: any = await import("@jsquash/webp/encode.js");
      const pkgRoot = path.dirname(
        require.resolve("@jsquash/webp/package.json")
      );
      const wasmBinary = await readFile(
        path.join(pkgRoot, "codec/enc/webp_enc.wasm")
      );
      await mod.init(undefined, { wasmBinary });
      return mod;
    })();
  }
  return modPromise;
}

export async function encodeWebp(
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
    method: clamp(opts.effort ?? 4, 0, 6),
    lossless: opts.lossless ? 1 : 0,
  };
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}
