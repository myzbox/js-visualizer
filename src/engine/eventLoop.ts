export class EventLoop {
  callStack: string[] = [];
  microtasks: string[] = [];
  macrotasks: string[] = [];

  runMicrotasks() {
    while (this.microtasks.length) {
      this.callStack.push(this.microtasks.shift()!);
      this.callStack.pop();
    }
  }

  runMacrotask() {
    if (this.macrotasks.length) {
      this.callStack.push(this.macrotasks.shift()!);
      this.callStack.pop();
    }
  }
}
