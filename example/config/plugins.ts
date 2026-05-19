export default ({ env }) => ({
  "image-optimizer": {
    enabled: true,
    config: {
      include: ["jpeg", "jpg", "png"],
      exclude: ["gif"],
      formats: [
        {
          format: "avif",
          compress: {
            quality: 85,
            lossless: false,
            effort: 4,
            subsample: "4:4:4",
            tune: "ssim",
          },
        },
        { format: "webp" },
        { format: "original" },
      ],
      sizes: [
        {
          name: "xs",
          width: 300,
        },
        {
          name: "sm",
          width: 768,
        },
        {
          name: "md",
          width: 1280,
        },
        {
          name: "lg",
          width: 1920,
        },
        {
          name: "xl",
          width: 2840,
          // Won't create an image larger than the original size
          withoutEnlargement: true,
        },
        {
          // Uses original size but still transforms for formats
          name: "original",
        },
      ],
      additionalResolutions: [1.5, 2],
      compress: {
        quality: 75,
        lossless: false,
        effort: 4,
      },
    },
  },
});
