import { Config } from "../models";
import configSchema from "./schema";

export default {
  default: {},
  async validator(config: Config) {
    // v2 → v3: the top-level `quality` field is gone. Surface a clear migration
    // error here instead of letting yup silently strip it (noUnknown by default).
    if (config && "quality" in config) {
      throw new Error(
        'image-optimizer: top-level `quality` was removed in v3. Move it into `compress.quality` (global default) or `formats[i].compress.quality` (per-format). See README "Breaking changes in v3".'
      );
    }
    await configSchema.validate(config, { strict: true });
  },
};
