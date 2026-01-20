import { useState } from "react";
import CodeEditor from "../editor/CodeEditor";
import ConsolePanel, { ConsoleMessage } from "../console/ConsolePanel";
import { validateJS } from "../engine/jsValidator";
import { executeCode } from "../engine/executor";

export default function App() {
  const [code, setCode] = useState(`console.log("Hello JS Visualizer");`);
  const [logs, setLogs] = useState<ConsoleMessage[]>([]);

  const run = () => {
    setLogs([]);
    const error = validateJS(code);
    if (error) {
      setLogs([{ type: "error", message: error }]);
      return;
    }

    executeCode(code, (log) =>
      setLogs((prev) => [...prev, log])
    );
  };

  return (
    <div className="layout">
      <div className="editor">
        <button onClick={run}>▶ Run</button>
        <CodeEditor code={code} onChange={setCode} />
      </div>
      <ConsolePanel logs={logs} />
    </div>
  );
}
