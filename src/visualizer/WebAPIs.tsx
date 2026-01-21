interface WebAPITask {
  id: string;
  label: string;
  type: "timeout" | "fetch" | "promise" | "event";
}

export default function WebAPIs({ tasks }: { tasks: WebAPITask[] }) {
  return (
    <div className="glass-panel api-container">
      <div className="panel-header">Web APIs / Environment</div>
      <div className="api-list">
        {tasks.length === 0 && (
          <div className="empty-state">No pending tasks</div>
        )}
        {tasks.map((task) => (
          <div key={task.id} className={`api-item ${task.type}`}>
            <span className="api-icon">{getIcon(task.type)}</span>
            <span className="api-label">{task.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function getIcon(type: string) {
  switch (type) {
    case "timeout":
      return "🕒";
    case "fetch":
      return "🌐";
    case "promise":
      return "🤝";
    default:
      return "⚡";
  }
}
