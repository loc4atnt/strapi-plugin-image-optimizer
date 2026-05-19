import { readFile } from "fs/promises";
import path from "path";
import { CompressOptions } from "../../models";
import { RawImage } from "./types";

// oxipng uses wasm-bindgen (not Emscripten); its `init(buffer)` accepts the
// raw bytes directly via `WebAssembly.instantiate`.
//
// `optimise` branches on `data instanceof ImageData`: the raw-RGBA path runs
// `optimise_raw`, the fallback treats `data` as PNG bytes and panics on
// arbitrary input. We must hand it a real ImageData — predefine the polyfill
// before any codec import so we share the same constructor identity.
if (!(globalThis as any).ImageData) {
  (globalThis as any).ImageData = class ImageData {
    data: Uint8ClampedArray;
    width: number;
    height: number;
    constructor(data: Uint8ClampedArray, width: number, height: number) {
      this.data = data;
      this.width = width;
      this.height = height;
    }
  };
}

let modPromise: Promise<any> | null = null;
function getModule() {
  if (!modPromise) {
    modPromise = (async () => {
      const mod: any = await import("@jsquash/oxipng/optimise.js");
      const pkgRoot = path.dirname(
        require.resolve("@jsquash/oxipng/package.json")
      );
      const wasmBinary = await readFile(
        path.join(pkgRoot, "codec/pkg/squoosh_oxipng_bg.wasm")
      );
      await mod.init(wasmBinary);
      return mod;
    })();
  }
  return modPromise;
}

// oxipng is lossless — `quality` is meaningless. `effort` (0-10) maps to oxipng `level` (0-6).
export async function encodePng(
  image: RawImage,
  options: CompressOptions
): Promise<Buffer> {
  const mod = await getModule();
  const ImageDataCtor = (globalThis as any).ImageData;
  const result: ArrayBuffer = await mod.default(
    new ImageDataCtor(image.data, image.width, image.height),
    {
      level: clamp(options.effort ?? 2, 0, 6),
      interlace: false,
    }
  );
  return Buffer.from(result);
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}
