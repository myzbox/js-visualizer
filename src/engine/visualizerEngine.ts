export type TaskType = "timeout" | "fetch" | "promise" | "event";

export interface VisualizerStep {
  callStack: string[];
  microtasks: string[];
  macrotasks: string[];
  webAPIs: {
    id: string;
    label: string;
    type: TaskType;
    delay?: number;
    remaining?: number;
    isLoading?: boolean;
    completionLabel?: string;
  }[];
  console: { type: "log" | "error"; message: string }[];
  description: string;
  autoAdvanceDelay?: number;
}

export class VisualizerEngine {
  private steps: VisualizerStep[] = [];
  private currentStepIndex = 0;
  private codeContent: string;

  constructor(code: string) {
    this.codeContent = code;
    this.generateSteps();
  }

  private generateSteps() {
    const state: VisualizerStep = {
      callStack: [],
      microtasks: [],
      macrotasks: [],
      webAPIs: [],
      console: [],
      description: "Initial state",
    };

    const variables: Record<string, string | number | boolean> = {};
    const functions: Record<string, string> = {};
    const capturedLogs: Array<{ type: "log" | "error"; message: string }> = [];
    const executionSteps: string[] = [];

    // Execute code to capture actual console output and track execution
    const originalLog = console.log;
    const originalError = console.error;
    const originalDir = console.dir;
    const originalTable = console.table;

    try {
      console.log = (...args) => {
        const message = args.join(" ");
        capturedLogs.push({ type: "log", message });
        executionSteps.push(`console.log: ${message}`);
      };
      console.error = (...args) => {
        const message = args.join(" ");
        capturedLogs.push({ type: "error", message });
        executionSteps.push(`console.error: ${message}`);
      };
      console.dir = (...args) => {
        const message = String(args[0]);
        capturedLogs.push({ type: "log", message });
        executionSteps.push(`console.dir: ${message}`);
      };
      console.table = (...args) => {
        const message = String(args[0]);
        capturedLogs.push({ type: "log", message });
        executionSteps.push(`console.table: ${message}`);
      };
      new Function(this.codeContent)();
    } catch (err: unknown) {
      const error = err instanceof Error ? err.message : String(err);
      capturedLogs.push({ type: "error", message: error });
      executionSteps.push(`ERROR: ${error}`);
    } finally {
      console.log = originalLog;
      console.error = originalError;
      console.dir = originalDir;
      console.table = originalTable;
    }

    const pushStep = (desc: string) => {
      this.steps.push({
        ...JSON.parse(JSON.stringify(state)),
        description: desc,
      });
    };

    const resolveLogValue = (args: string) => {
      return args
        .split(",")
        .map((arg) => {
          const trimmed = arg.trim();
          const stringMatch = trimmed.match(/^(['"`])(.*)\1$/);
          if (stringMatch) return stringMatch[2];
          const num = Number(trimmed);
          if (!isNaN(num) && trimmed !== "") return num;
          if (trimmed in variables) return variables[trimmed];
          return trimmed;
        })
        .join(" ");
    };

    const lines = this.codeContent.split("\n");
    const findLogInCallback = (startIndex: number) => {
      // Scan up to 20 lines to find the relevant console.log
      // We don't stop at '}' immediately because chained promises (.then) might follow.
      for (
        let i = startIndex;
        i < Math.min(startIndex + 20, lines.length);
        i++
      ) {
        const m = lines[i].match(/console\.log\((.*)\)/);
        if (m) return resolveLogValue(m[1]);
        // Only break if we see a '}' at the start of a line that likely closes the whole block,
        // but even that is risky with chaining. Ideally we scan enough lines.
        // For this simple visualizer, just scanning 20 lines is safer than breaking early.
      }
      return null;
    };

    pushStep("Environment initialized.");
    state.callStack = ["main()"];
    pushStep("main() enters call stack");

    let braceLevel = 0;
    let skipUntilLevel = -1;

    // 1. Synchronous Execution Phase - Enhanced to handle more JS scenarios
    lines.forEach((line: string, index: number) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("//")) return;

      // Skip multi-line comments
      if (trimmed.startsWith("/*")) return;
      if (trimmed.endsWith("*/")) return;

      // Detect Chained Methods (e.g. .then, .catch)
      if (
        trimmed.startsWith(".") &&
        (trimmed.includes("then") ||
          trimmed.includes("catch") ||
          trimmed.includes("finally"))
      ) {
        if (trimmed.includes("{") && !trimmed.includes("}")) {
          if (skipUntilLevel === -1) {
            skipUntilLevel = braceLevel;
          }
          braceLevel++;
        }
        return;
      }

      // Detect Async Registrations (setTimeout, fetch, promises)
      if (
        trimmed.includes("setTimeout") ||
        (trimmed.includes("Promise.resolve") && trimmed.includes(".then")) ||
        trimmed.includes("fetch(") ||
        trimmed.includes(".then(") ||
        trimmed.includes(".catch(")
      ) {
        const isTimeout = trimmed.includes("setTimeout");
        const isFetch = trimmed.includes("fetch(");

        if (isTimeout) {
          state.callStack.push("setTimeout(...)");
          pushStep("Registering timer");
        } else if (isFetch) {
          state.callStack.push("fetch(...)");
          pushStep("Initiating network request");
        } else {
          state.callStack.push("Promise(...)");
          pushStep("Scheduling microtask");
        }

        const msg =
          findLogInCallback(index) ||
          (isTimeout
            ? "Timeout callback"
            : isFetch
              ? "Fetch callback"
              : "Promise callback");

        if (isTimeout) {
          // Extract delay from setTimeout(callback, delay)
          // tailored for multi-line support
          let delay = 0;
          const currentLineMatch = trimmed.match(
            /setTimeout\s*\([^,]+,\s*(\d+)\s*\)/,
          );

          if (currentLineMatch) {
            delay = parseInt(currentLineMatch[1]);
          } else {
            // Look ahead for the closing brace and delay
            for (let i = index; i < Math.min(index + 20, lines.length); i++) {
              const nextLine = lines[i].trim();
              const endMatch = nextLine.match(/\},\s*(\d+)\s*\);?/);
              if (endMatch) {
                delay = parseInt(endMatch[1]);
                break;
              }
            }
          }

          state.webAPIs.push({
            id: `t${Math.random()}`,
            label: msg,
            type: "timeout",
            delay: delay,
            remaining: delay,
          });
        } else if (isFetch) {
          // Parse URL for label
          const urlMatch = trimmed.match(/fetch\(['"`](.*)['"`]\)/);
          const url = urlMatch ? urlMatch[1] : "Network Request";
          // Simulate 1.5s network delay
          const networkDelay = 1500;

          state.webAPIs.push({
            id: `f${Math.random()}`,
            label: `fetch(${url})`,
            type: "fetch",
            delay: networkDelay,
            remaining: networkDelay,
            completionLabel: msg, // Store the callback/log message for later execution
          });
        } else {
          state.microtasks.push(msg);
        }

        state.callStack.pop();
        pushStep("Registration complete");

        if (trimmed.includes("{") && !trimmed.includes("}")) {
          // If the async call opens a block (e.g. setTimeout(() => {), skip it
          skipUntilLevel = braceLevel;
          braceLevel++;
        }
        return;
      }

      // Track braces for nesting level
      if (trimmed.includes("{")) braceLevel++;

      // Process normal sync code if NOT inside a callback block
      if (skipUntilLevel === -1) {
        // Function Declaration
        if (trimmed.startsWith("function") || trimmed.includes("=>")) {
          const funcMatch = trimmed.match(
            /(?:function\s+(\w+)|const\s+(\w+)\s*=|let\s+(\w+)\s*=|var\s+(\w+)\s*=)/,
          );
          if (funcMatch) {
            const funcName =
              funcMatch[1] || funcMatch[2] || funcMatch[3] || funcMatch[4];
            functions[funcName!] = trimmed;
            pushStep(`Function ${funcName} declared`);
          }
          return;
        }

        // Class Declaration
        if (trimmed.startsWith("class")) {
          const classMatch = trimmed.match(/class\s+(\w+)/);
          if (classMatch) {
            pushStep(`Class ${classMatch[1]} declared`);
          }
          return;
        }

        // Variable Declaration - Enhanced to handle more patterns
        const varPatterns = [
          /^(const|let|var)\s+(\w+)\s*=\s*(.+);?$/, // Simple assignment
          /^(const|let|var)\s+\{([^}]+)\}\s*=\s*(.+);?$/, // Destructuring
          /^(const|let|var)\s+\[([^\]]+)\]\s*=\s*(.+);?$/, // Array destructuring
        ];

        for (const pattern of varPatterns) {
          const varMatch = trimmed.match(pattern);
          if (varMatch) {
            const [, type, nameOrDestructure, value] = varMatch;
            const valTrim = value?.trim().replace(/;$/, "") || "";

            // Try to resolve the value
            let resolvedValue: string | number | boolean = valTrim;
            const num = Number(valTrim);
            if (!isNaN(num) && valTrim !== "") {
              resolvedValue = num;
            } else if (valTrim === "true" || valTrim === "false") {
              resolvedValue = valTrim === "true";
            } else if (
              valTrim.startsWith("'") ||
              valTrim.startsWith('"') ||
              valTrim.startsWith("`")
            ) {
              resolvedValue = valTrim.replace(/^(['"`])(.*)\1$/, "$2");
            }

            if (
              nameOrDestructure.includes("{") ||
              nameOrDestructure.includes("[")
            ) {
              pushStep(
                `Destructuring assignment: ${nameOrDestructure} from ${valTrim}`,
              );
            } else {
              variables[nameOrDestructure] = resolvedValue;
              pushStep(`${type} ${nameOrDestructure} = ${resolvedValue}`);
            }
            return;
          }
        }

        // Function/Method Calls
        if (trimmed.endsWith(");") || trimmed.endsWith(")")) {
          if (trimmed.match(/^\w+\(.*\);?$/) || trimmed.includes(".")) {
            const callMatch = trimmed.match(/(\w+)\(/);
            if (
              callMatch &&
              callMatch[1] !== "function" &&
              callMatch[1] !== "class"
            ) {
              state.callStack.push(`${callMatch[1]}()`);
              pushStep(`Calling ${callMatch[1]}()`);
              state.callStack.pop();
              pushStep(`${callMatch[1]}() returned`);
            }
          }
        }

        // Control Flow - if/else
        if (
          trimmed.startsWith("if") ||
          trimmed.startsWith("else") ||
          trimmed.startsWith("for") ||
          trimmed.startsWith("while")
        ) {
          const flowMatch = trimmed.match(/^(if|else|for|while|do)/);
          if (flowMatch) {
            pushStep(`${flowMatch[1]} statement executed`);
          }
        }

        // Try/Catch blocks
        if (
          trimmed.startsWith("try") ||
          trimmed.startsWith("catch") ||
          trimmed.startsWith("finally")
        ) {
          pushStep(`${trimmed.split(" ")[0]} block`);
        }

        // Synchronous console methods
        if (trimmed.includes("console.")) {
          const consoleMatch = trimmed.match(/console\.(\w+)\((.*)\);?/);
          if (consoleMatch) {
            const [, method, args] = consoleMatch;
            const resolved = resolveLogValue(args);
            state.callStack.push(`console.${method}(...)`);
            pushStep(`${method}: ${resolved}`);
            state.console.push({ type: "log", message: resolved });
            state.callStack.pop();
            pushStep(`${method} finished`);
          }
        }

        // Return statements
        if (trimmed.startsWith("return")) {
          pushStep(`Return: ${trimmed.substring(6)}`);
        }

        // Async/Await
        if (trimmed.includes("await")) {
          pushStep(`Awaiting: ${trimmed}`);
        }
      }

      // Handle closing braces and end skipping
      if (trimmed.includes("}")) {
        braceLevel = Math.max(0, braceLevel - 1);
        if (braceLevel <= skipUntilLevel) {
          skipUntilLevel = -1;
        }
      }
    });

    state.callStack.pop();
    // Only push independent "Stack Empty" step if NO WebAPIs are waiting.
    // If WebAPIs exist, the "Waiting" step will serve as the "Stack Empty" state, saving a click.
    if (state.webAPIs.length === 0) {
      pushStep("main() execution complete. Stack Empty.");
    }

    // 2. Web API -> Task Queue phase (with timer countdown)
    while (state.webAPIs.length > 0) {
      const api = state.webAPIs[0];

      // Handle delays for both timeout and fetch
      if (
        api &&
        (api.type === "timeout" || api.type === "fetch") &&
        api.delay &&
        api.delay > 0
      ) {
        // Create a SINGLE waiting step that auto-advances
        state.webAPIs[0] = {
          ...state.webAPIs[0],
          isLoading: true,
        };

        const desc =
          api.type === "fetch"
            ? `Network request in progress (${api.delay}ms)...`
            : `Timer waiting (${api.delay}ms)...`;

        this.steps.push({
          ...JSON.parse(JSON.stringify(state)),
          description: desc,
          autoAdvanceDelay: api.delay,
        });

        // Remove loading state for the next step (where it moves to queue)
        state.webAPIs[0] = { ...state.webAPIs[0], isLoading: false };
      }

      const completedApi = state.webAPIs.shift();
      if (completedApi) {
        if (completedApi.type === "timeout") {
          state.macrotasks.push(completedApi.label);
          pushStep(`Timer expired: handler moved to Macrotask Queue`);
        } else if (completedApi.type === "fetch") {
          // Fetch callbacks (Promises) go to Microtask Queue
          // Use completionLabel if available (the log message), otherwise fallback to label
          state.microtasks.push(
            completedApi.completionLabel || completedApi.label,
          );
          pushStep(
            `Network request complete: Promise resolved to Microtask Queue`,
          );
        }
      }
    }

    // 3. EVENT LOOP: Microtasks (Clear entire queue)
    while (state.microtasks.length > 0) {
      const taskMessage = state.microtasks.shift();
      state.callStack.push(`callback()`);
      pushStep(`Event Loop: Picking up Microtask`);
      state.console.push({ type: "log", message: taskMessage! });
      state.callStack.pop();
      pushStep("Microtask execution complete");
    }

    // 4. EVENT LOOP: Macrotasks (One per loop, but showing all for demo)
    while (state.macrotasks.length > 0) {
      const taskMessage = state.macrotasks.shift();
      state.callStack.push(`callback()`);
      pushStep(`Event Loop: Picking up Macrotask`);
      state.console.push({ type: "log", message: taskMessage! });
      state.callStack.pop();
      pushStep("Macrotask execution complete");
    }

    // Add any captured logs from actual code execution
    for (const log of capturedLogs) {
      if (!state.console.some((c) => c.message === log.message)) {
        state.console.push(log);
        pushStep(`Console output: ${log.message}`);
      }
    }

    pushStep("All tasks cleared. Simulation complete.");
  }

  isAtEnd(): boolean {
    return this.currentStepIndex === this.steps.length - 1;
  }

  getCurrentStep(): VisualizerStep {
    return (
      this.steps[this.currentStepIndex] || this.steps[this.steps.length - 1]
    );
  }

  nextStep(): VisualizerStep {
    if (this.currentStepIndex < this.steps.length - 1) {
      this.currentStepIndex++;
    }
    return this.getCurrentStep();
  }

  prevStep(): VisualizerStep {
    if (this.currentStepIndex > 0) {
      this.currentStepIndex--;
    }
    return this.getCurrentStep();
  }

  reset() {
    this.currentStepIndex = 0;
  }
}
