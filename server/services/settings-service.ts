import {} from "@strapi/strapi";
import { Config } from "../models";
import pluginId from "../utils/pluginId";

// Strapi v5 stores plugin config under `plugin::<name>` (double-colon);
// v4 uses `plugin.<name>` (dot). Try v5 first, fall back to v4.
class SettingsService {
  static get settings(): Config {
    return (
      strapi.config.get(`plugin::${pluginId}`) ??
      strapi.config.get(`plugin.${pluginId}`)
    );
  }
}

export default SettingsService;
