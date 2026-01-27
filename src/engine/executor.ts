import type { ConsoleMessage } from "../console/ConsolePanel";

export function executeCode(
  code: string,
  onLog: (log: ConsoleMessage) => void,
) {
  const originalLog = console.log;
  const originalError = console.error;

  console.log = (...args) => onLog({ type: "log", message: args.join(" ") });

  console.error = (...args) =>
    onLog({ type: "error", message: args.join(" ") });

  try {
    new Function(code)();
  } catch (err: any) {
    onLog({ type: "error", message: err.message });
  }

  console.log = originalLog;
  console.error = originalError;
}
