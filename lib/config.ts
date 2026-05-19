import fs from "fs";
import path from "path";
import { Config } from "./types";

const CONFIG_PATH = path.join(process.cwd(), "config.json");

export function loadConfig(): Config {
  return JSON.parse(fs.readFileSync(CONFIG_PATH, "utf-8"));
}

export function saveConfig(config: Config): void {
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
}
