import { array, boolean, mixed, number, object, string } from "yup";
import { fit as FitEnum } from "sharp";

const sourceFormats = [
  "avif",
  "dz",
  "fits",
  "gif",
  "heif",
  "input",
  "jpeg",
  "jpg",
  "jp2",
  "jxl",
  "magick",
  "openslide",
  "pdf",
  "png",
  "ppm",
  "raw",
  "svg",
  "tiff",
  "tif",
  "v",
  "webp",
];

const outputFormats = [
  "original",
  "avif",
  "webp",
  "jpeg",
  "jpg",
  "png",
  "jxl",
];

const positions = [
  "top",
  "right top",
  "right",
  "right bottom",
  "bottom",
  "left bottom",
  "left",
  "left top",
  "center",
  "entropy",
  "attention",
];

const compressShape = object({
  quality: number().min(0).max(100),
  lossless: boolean(),
  effort: number().min(0).max(10),
  subsample: mixed().oneOf(["4:2:0", "4:2:2", "4:4:4"]),
  tune: mixed().oneOf(["auto", "psnr", "ssim"]),
}).noUnknown(true);

const outputFormatShape = object({
  format: mixed().oneOf(outputFormats).required(),
  compress: compressShape.optional(),
}).noUnknown(true);

const configSchema = object({
  additionalResolutions: array().of(number().positive()),
  exclude: array().of(mixed().oneOf(sourceFormats)),
  include: array().of(mixed().oneOf(sourceFormats)),
  sizes: array()
    .of(
      object({
        name: string().required(),
        width: number().positive(),
        height: number().positive(),
        fit: mixed().oneOf(Object.values(FitEnum)),
        position: mixed().oneOf(positions),
        withoutEnlargement: boolean(),
      }).noUnknown(true)
    )
    .required(),
  formats: array().of(outputFormatShape),
  compress: compressShape.optional(),
}).noUnknown(true);

export default configSchema;
