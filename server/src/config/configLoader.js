import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import yaml from "js-yaml";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CONFIG_PATH = process.env.SITES_CONFIG || path.join(__dirname, "sites.yaml");

let cached = null;

export function loadConfig() {
  const raw = fs.readFileSync(CONFIG_PATH, "utf8");
  cached = yaml.load(raw);
  return cached;
}

export function getConfig() {
  if (!cached) loadConfig();
  return cached;
}

export function saveConfig(config) {
  const yamlStr = yaml.dump(config, { noRefs: true, lineWidth: 100 });
  fs.writeFileSync(CONFIG_PATH, yamlStr, "utf8");
  cached = config;
}

export function watchConfig(onChange) {
  fs.watchFile(CONFIG_PATH, { interval: 1000 }, () => {
    try {
      loadConfig();
      console.log("Reloaded site config from", CONFIG_PATH);
      onChange?.(cached);
    } catch (err) {
      console.error("Failed to reload config:", err.message);
    }
  });
}
