export interface ConsoleMessage {
  type: "log" | "error";
  message: string;
}

export default function ConsolePanel({ logs }: { logs: ConsoleMessage[] }) {
  return (
    <div className="console">
      <h3>Console</h3>
      {logs.map((log, i) => (
        <div key={i} className={log.type}>
          {log.message}
        </div>
      ))}
    </div>
  );
}
