export interface ConsoleMessage {
  type: "log" | "error";
  message: string;
}

export default function ConsolePanel({ logs }: { logs: ConsoleMessage[] }) {
  return (
    <div className="console">
      {logs.map((log, i) => (
        <div key={i} className={`console-msg ${log.type}`}>
          <span className="msg-icon">❯</span>
          <span className="msg-text">{log.message}</span>
        </div>
      ))}
    </div>
  );
}
