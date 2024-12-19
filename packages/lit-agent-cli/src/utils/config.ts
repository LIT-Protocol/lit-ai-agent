import fs from "fs";
import path from "path";
import os from "os";

import { InitConfig } from "../commands/init";

export const CONFIG_DIR = path.join(os.homedir(), ".lit-agent");
export const CONFIG_PATH = path.join(CONFIG_DIR, "config.json");

export const ConfigManager = {
  ensureConfigDirExists(): void {
    if (!fs.existsSync(CONFIG_DIR)) {
      fs.mkdirSync(CONFIG_DIR, { recursive: true });
    }
  },

  async loadConfig(): Promise<Partial<InitConfig>> {
    try {
      if (!fs.existsSync(CONFIG_PATH)) {
        return {};
      }
      const configData = fs.readFileSync(CONFIG_PATH, "utf-8");
      return JSON.parse(configData);
    } catch (error) {
      console.warn("Failed to load config:", error);
      return {};
    }
  },

  async saveConfig(config: Partial<InitConfig>): Promise<void> {
    try {
      this.ensureConfigDirExists();
      // Load existing config and merge with new config
      const existingConfig = await this.loadConfig();
      const updatedConfig = { ...existingConfig, ...config };

      fs.writeFileSync(
        CONFIG_PATH,
        JSON.stringify(updatedConfig, null, 2),
        "utf-8"
      );
    } catch (error) {
      console.error("Failed to save config:", error);
      throw error;
    }
  },

  async clearConfig(): Promise<void> {
    try {
      if (fs.existsSync(CONFIG_PATH)) {
        fs.unlinkSync(CONFIG_PATH);
      }
    } catch (error) {
      console.error("Failed to clear config:", error);
      throw error;
    }
  },

  getConfigPath(): string {
    return CONFIG_PATH;
  },
} as const;
