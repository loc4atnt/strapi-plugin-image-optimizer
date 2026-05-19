import { readFile } from "fs/promises";
import path from "path";
import { CompressOptions } from "../../models";
import { RawImage } from "./types";

// jSquash's Emscripten codec tries to fetch its `.wasm` via `import.meta.url`,
// which is polyfilled to `https://localhost` under Node and fails with
// `TypeError: fetch failed`. Pre-load the binary and hand it to `init` instead.
let modPromise: Promise<any> | null = null;
function getModule() {
  if (!modPromise) {
    modPromise = (async () => {
      // The package's index.js only re-exports `encode` (default), not `init`.
      // Import the encode entry directly so we can call `init` ourselves.
      const mod: any = await import("@jsquash/avif/encode.js");
      const pkgRoot = path.dirname(
        require.resolve("@jsquash/avif/package.json")
      );
      const wasmBinary = await readFile(
        path.join(pkgRoot, "codec/enc/avif_enc.wasm")
      );
      await mod.init(undefined, { wasmBinary });
      return mod;
    })();
  }
  return modPromise;
}

export async function encodeAvif(
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
    qualityAlpha: -1,
    speed: clamp(opts.effort ?? 4, 0, 10),
    subsample: subsampleToInt(opts.subsample),
    tune: tuneToInt(opts.tune),
    lossless: opts.lossless ?? false,
  };
}

function subsampleToInt(s: CompressOptions["subsample"]): number {
  switch (s) {
    case "4:2:0":
      return 0;
    case "4:2:2":
      return 1;
    case "4:4:4":
      return 2;
    default:
      return 2;
  }
}

function tuneToInt(t: CompressOptions["tune"]): number {
  switch (t) {
    case "psnr":
      return 1;
    case "ssim":
      return 2;
    case "auto":
    default:
      return 0;
  }
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}
