interface WebAPITask {
  id: string;
  label: string;
  type: "timeout" | "fetch" | "promise" | "event";
  delay?: number;
  remaining?: number;
  isLoading?: boolean;
  completionLabel?: string;
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
            <div className="api-content">
              <div className="api-header-row">
                <span className="api-label">{task.label}</span>
                {(task.type === 'timeout' || task.type === 'fetch') && task.delay !== undefined && (
                  <span className="delay-badge">{task.delay}ms</span>
                )}
              </div>
              {task.isLoading && (
                <div className="waiting-indicator">
                  <div className="mini-spinner"></div>
                  <span className="waiting-text">Waiting {task.delay}ms...</span>
                </div>
              )}
            </div>
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
