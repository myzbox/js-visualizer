export type TaskType = 'timeout' | 'fetch' | 'promise' | 'event';

export interface VisualizerStep {
  callStack: string[];
  microtasks: string[];
  macrotasks: string[];
  webAPIs: { id: string; label: string; type: TaskType }[];
  console: { type: 'log' | 'error'; message: string }[];
  description: string;
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
    let state: VisualizerStep = {
      callStack: [],
      microtasks: [],
      macrotasks: [],
      webAPIs: [],
      console: [],
      description: 'Initial state'
    };

    const variables: Record<string, any> = {};
    const pushStep = (desc: string) => {
      this.steps.push({ ...JSON.parse(JSON.stringify(state)), description: desc });
    };

    const resolveLogValue = (args: string) => {
      return args.split(',').map(arg => {
        const trimmed = arg.trim();
        const stringMatch = trimmed.match(/^(['"`])(.*)\1$/);
        if (stringMatch) return stringMatch[2];
        const num = Number(trimmed);
        if (!isNaN(num) && trimmed !== '') return num;
        if (variables.hasOwnProperty(trimmed)) return variables[trimmed];
        return trimmed;
      }).join(' ');
    };

    const lines = this.codeContent.split('\n');
    const findLogInCallback = (startIndex: number) => {
      for (let i = startIndex; i < Math.min(startIndex + 10, lines.length); i++) {
        const m = lines[i].match(/console\.log\((.*)\)/);
        if (m) return resolveLogValue(m[1]);
        if (lines[i].includes('}')) break;
      }
      return null;
    };

    pushStep('Environment initialized.');
    state.callStack = ['main()'];
    pushStep('main() enters call stack');

    let braceLevel = 0;
    let skipUntilLevel = -1;

    // 1. Synchronous Execution Phase
    lines.forEach((line: string, index: number) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('//')) return;

      // Detect Async Registrations
      if (trimmed.includes('setTimeout') || (trimmed.includes('Promise.resolve') && trimmed.includes('.then'))) {
        const isTimeout = trimmed.includes('setTimeout');
        state.callStack.push(isTimeout ? 'setTimeout(...)' : 'Promise.resolve().then(...)');
        pushStep(isTimeout ? 'Registering timer' : 'Scheduling microtask');
        
        const msg = findLogInCallback(index) || (isTimeout ? 'Timeout callback' : 'Promise callback');
        
        if (isTimeout) {
          state.webAPIs.push({ id: `t${Math.random()}`, label: msg, type: 'timeout' });
        } else {
          state.microtasks.push(msg);
        }
        
        state.callStack.pop();
        pushStep('Registration complete');

        if (trimmed.includes('{') && !trimmed.includes('}')) {
          skipUntilLevel = braceLevel;
          braceLevel++;
        }
        return;
      }

      // Track braces for nesting level
      if (trimmed.includes('{')) braceLevel++;

      // Process normal sync code if NOT inside a callback block
      if (skipUntilLevel === -1) {
        // Variable Assignment
        const varMatch = trimmed.match(/^(const|let|var)\s+(\w+)\s*=\s*(.+);?$/);
        if (varMatch) {
          const [_, type, name, value] = varMatch;
          const valTrim = value.trim().replace(/;$/, '');
          const num = Number(valTrim);
          variables[name] = !isNaN(num) && valTrim !== '' ? num : valTrim.replace(/^(['"`])(.*)\1$/, '$2');
          pushStep(`${type} ${name} assigned`);
          return;
        }

        // Synchronous console.log
        if (trimmed.includes('console.log')) {
          const logMatch = trimmed.match(/console\.log\((.*)\);?/);
          if (logMatch) {
            const resolved = resolveLogValue(logMatch[1]);
            state.callStack.push(`console.log(...)`);
            pushStep(`Logging: ${resolved}`);
            state.console.push({ type: 'log', message: resolved });
            state.callStack.pop();
            pushStep(`Log finished`);
          }
        }
      }

      // Handle closing braces and end skipping
      if (trimmed.includes('}')) {
        braceLevel = Math.max(0, braceLevel - 1);
        if (braceLevel <= skipUntilLevel) {
          skipUntilLevel = -1;
        }
      }
    });

    state.callStack.pop();
    pushStep('main() execution complete. Stack Empty.');

    // 2. Web API -> Task Queue phase
    while (state.webAPIs.length > 0) {
      const api = state.webAPIs.shift();
      if (api) {
        state.macrotasks.push(api.label);
        pushStep(`Timer expired: handler moved to Macrotask Queue`);
      }
    }

    // 3. EVENT LOOP: Microtasks (Clear entire queue)
    while (state.microtasks.length > 0) {
      const taskMessage = state.microtasks.shift();
      state.callStack.push(`callback()`);
      pushStep(`Event Loop: Picking up Microtask`);
      state.console.push({ type: 'log', message: taskMessage! });
      state.callStack.pop();
      pushStep('Microtask execution complete');
    }

    // 4. EVENT LOOP: Macrotasks (One per loop, but showing all for demo)
    while (state.macrotasks.length > 0) {
      const taskMessage = state.macrotasks.shift();
      state.callStack.push(`callback()`);
      pushStep(`Event Loop: Picking up Macrotask`);
      state.console.push({ type: 'log', message: taskMessage! });
      state.callStack.pop();
      pushStep('Macrotask execution complete');
    }

    pushStep('All tasks cleared. Simulation complete.');
  }

  isAtEnd(): boolean {
    return this.currentStepIndex === this.steps.length - 1;
  }

  getCurrentStep(): VisualizerStep {
    return this.steps[this.currentStepIndex] || this.steps[this.steps.length - 1];
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
