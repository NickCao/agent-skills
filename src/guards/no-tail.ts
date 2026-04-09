import { parse } from "shell-quote";

const TRUNCATION_COMMANDS = new Set(["tail", "head"]);

export function findPipeTruncation(command: string): string | null {
  let tokens;
  try {
    tokens = parse(command);
  } catch {
    return null;
  }

  let afterPipe = false;
  for (const token of tokens) {
    if (typeof token === "object" && token !== null && "op" in token) {
      afterPipe = token.op === "|" || token.op === "|&";
      continue;
    }
    if (afterPipe && typeof token === "string") {
      const cmd = token.split("/").pop()!;
      if (TRUNCATION_COMMANDS.has(cmd)) {
        return cmd;
      }
      afterPipe = false;
    }
  }

  return null;
}

export function guard(command: string): void {
  const cmd = findPipeTruncation(command);
  if (cmd) {
    throw new Error(
      `Blocked: piping output through \`${cmd}\` permanently discards data. Load the no-tail skill for guidance.`,
    );
  }
}
