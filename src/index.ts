import type { Plugin } from "@opencode-ai/plugin";
import path from "path";
import { fileURLToPath } from "url";
import { guard as noTailGuard } from "./guards/no-tail";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const AgentSkillsPlugin: Plugin = async () => {
  const skillsDir = path.resolve(__dirname, "../skills");

  return {
    config: async (config) => {
      config.skills = config.skills || {};
      config.skills.paths = config.skills.paths || [];
      if (!config.skills.paths.includes(skillsDir)) {
        config.skills.paths.push(skillsDir);
      }
    },

    "tool.execute.before": async (input, output) => {
      if (input.tool === "bash") {
        noTailGuard(output.args.command);
      }
    },
  };
};
