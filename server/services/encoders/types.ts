export interface RawImage {
  data: Uint8ClampedArray;
  width: number;
  height: number;
}

export interface EncodeResult {
  buffer: Buffer;
  width: number;
  height: number;
  ext: string;
  mime: string;
}
