export default function CallStack({ stack }: { stack: string[] }) {
  return (
    <div className="glass-panel stack-container">
      <div className="panel-header">Call Stack</div>
      <div className="stack-list">
        {stack.length === 0 && <div className="empty-state">Stack is empty</div>}
        {[...stack].reverse().map((item, i) => (
          <div key={i} className="stack-frame">
            <span className="frame-arrow">→</span>
            {item}
          </div>
        ))}
      </div>
    </div>
  );
}
