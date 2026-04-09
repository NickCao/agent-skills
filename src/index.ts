import type { Plugin } from "@opencode-ai/plugin";
import path from "path";
import { fileURLToPath } from "url";
import { quote } from "shell-quote";
import { guard as noTailGuard } from "./guards/no-tail";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const AgentSkillsPlugin: Plugin = async ({ directory }) => {
  const skillsDir = path.resolve(__dirname, "../skills");
  const agentBySession = new Map<string, string>();

  return {
    config: async (config) => {
      config.skills = config.skills || {};
      config.skills.paths = config.skills.paths || [];
      if (!config.skills.paths.includes(skillsDir)) {
        config.skills.paths.push(skillsDir);
      }

      config.agent = config.agent || {};
      config.agent.sandbox = config.agent.sandbox || {
        description:
          "Full development with kernel-sandboxed bash execution via bubblewrap",
        mode: "primary",
        color: "success",
      };
    },

    "chat.message": async (input) => {
      if (input.agent && input.sessionID) {
        agentBySession.set(input.sessionID, input.agent);
      }
    },

    "tool.execute.before": async (input, output) => {
      if (input.tool === "bash") {
        noTailGuard(output.args.command);

        if (agentBySession.get(input.sessionID) === "sandbox") {
          output.args.command = quote([
            "bwrap",
            "--ro-bind", "/", "/",
            "--dev", "/dev",
            "--bind", directory, directory,
            "--tmpfs", "/tmp",
            "--die-with-parent",
            "--",
            "bash", "-c", output.args.command,
          ]);
        }
      }
    },
  };
};
