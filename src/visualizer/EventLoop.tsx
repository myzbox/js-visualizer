export function MicrotaskQueue({ items }: { items: string[] }) {
  return (
    <div className="glass-panel queue-panel microtasks">
      <div className="panel-header">
        Microtask Queue
        <span className="queue-badge micro">Promise</span>
      </div>
      <div className="queue-list">
        {items.length === 0 && <div className="empty-state">Empty</div>}
        {items.map((m, i) => (
          <div key={i} className="queue-item micro">{m}</div>
        ))}
      </div>
    </div>
  );
}

export function MacrotaskQueue({ items }: { items: string[] }) {
  return (
    <div className="glass-panel queue-panel macrotasks">
      <div className="panel-header">
        Task Queue (Macrotasks)
        <span className="queue-badge macro">Timeout</span>
      </div>
      <div className="queue-list">
        {items.length === 0 && <div className="empty-state">Empty</div>}
        {items.map((m, i) => (
          <div key={i} className="queue-item macro">{m}</div>
        ))}
      </div>
    </div>
  );
}

export function EventLoopSpinner({ isActive = true }: { isActive?: boolean }) {
  return (
    <div className="event-loop-visual">
       <div className="event-loop-spinner">
          <div className={`spinner-inner ${isActive ? 'spinning' : 'stopped'}`}></div>
          <div className="spinner-center">↺</div>
       </div>
       <div className="spinner-label">Event Loop</div>
    </div>
  );
}

export default function EventLoopView({
  micro,
  macro,
}: {
  micro: string[];
  macro: string[];
}) {
  return (
    <div className="event-loop-container">
      <div className="queues-row">
        <MicrotaskQueue items={micro} />
        <MacrotaskQueue items={macro} />
      </div>
      <EventLoopSpinner />
    </div>
  );
}
