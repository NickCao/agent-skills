import type { Plugin } from "@opencode-ai/plugin";
import path from "path";
import { fileURLToPath } from "url";
import { quote } from "shell-quote";
import { guard as noTailGuard } from "./guards/no-tail";
import { setupWorkflow } from "./workflow/index.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const AgentSkillsPlugin: Plugin = async ({ directory, client }) => {
  const skillsDir = path.resolve(__dirname, "../skills");
  const agentBySession = new Map<string, string>();
  const workflow = setupWorkflow(directory, client);

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

      // Register workflow phase agents if .workflow/workflow.yaml exists
      if (workflow) {
        for (const [name, agentConfig] of Object.entries(workflow.agents)) {
          config.agent[name] = agentConfig;
        }

        // Default new sessions to the first workflow phase agent
        const firstPhase = workflow.config.phases[0];
        if (firstPhase) {
          config.default_agent = `workflow-${firstPhase.id}`;
        }
      }
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

    // Register workflow tools if .workflow/workflow.yaml exists
    ...(workflow ? { tool: workflow.tools } : {}),
  };
};
