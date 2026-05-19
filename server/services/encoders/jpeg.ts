import { readFile } from "fs/promises";
import path from "path";
import { CompressOptions } from "../../models";
import { RawImage } from "./types";

let modPromise: Promise<any> | null = null;
function getModule() {
  if (!modPromise) {
    modPromise = (async () => {
      const mod: any = await import("@jsquash/jpeg/encode.js");
      const pkgRoot = path.dirname(
        require.resolve("@jsquash/jpeg/package.json")
      );
      const wasmBinary = await readFile(
        path.join(pkgRoot, "codec/enc/mozjpeg_enc.wasm")
      );
      await mod.init(undefined, { wasmBinary });
      return mod;
    })();
  }
  return modPromise;
}

export async function encodeJpeg(
  image: RawImage,
  options: CompressOptions
): Promise<Buffer> {
  const mod = await getModule();
  const result: ArrayBuffer = await mod.default(image, mapOptions(options));
  return Buffer.from(result);
}

function mapOptions(opts: CompressOptions) {
  const explicitSubsample = opts.subsample !== undefined;
  return {
    quality: opts.quality ?? 85,
    progressive: true,
    optimize_coding: true,
    auto_subsample: !explicitSubsample,
    chroma_subsample: subsampleToMozjpeg(opts.subsample),
  };
}

// MozJPEG's chroma_subsample uses an inverted scale: 1 = 4:4:4 (no chroma reduction),
// 2 = 4:2:0 (most reduction). 4:2:2 doesn't have a discrete value — fall back to 2.
function subsampleToMozjpeg(s: CompressOptions["subsample"]): number {
  switch (s) {
    case "4:4:4":
      return 1;
    case "4:2:2":
    case "4:2:0":
      return 2;
    default:
      return 2;
  }
}
