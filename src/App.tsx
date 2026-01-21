import { useState, useEffect, useRef } from "react";
import "./App.css";
import CodeEditor from "./editor/CodeEditor";
import ConsolePanel from "./console/ConsolePanel";
import CallStack from "./visualizer/CallStack";
import EventLoopView from "./visualizer/EventLoop";
import WebAPIs from "./visualizer/WebAPIs";
import { VisualizerEngine } from "./engine/visualizerEngine";
import type { VisualizerStep } from "./engine/visualizerEngine";
import { validateJS } from "./engine/jsValidator";
import { SAMPLES } from "./data/samples";
import type { SampleName } from "./data/samples";
import "./visualizer/Visualizer.css";
import { 
  MicrotaskQueue, 
  MacrotaskQueue, 
  EventLoopSpinner 
} from "./visualizer/EventLoop";

export default function App() {
  const [code, setCode] = useState<string>(SAMPLES["Event Loop Basics"]);
  const [engine, setEngine] = useState<VisualizerEngine | null>(null);
  const [currentStep, setCurrentStep] = useState<VisualizerStep | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const playbackRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadSample = (name: SampleName) => {
    resetSimulation();
    setCode(SAMPLES[name]);
  };

  const startSimulation = () => {
    playbackRef.current && clearInterval(playbackRef.current);
    setIsPlaying(false);
    
    const syntaxError = validateJS(code);
    if (syntaxError) {
      setError(`Syntax Error: ${syntaxError}`);
      setEngine(null);
      setCurrentStep(null);
      return;
    }
    
    setError(null);
    const newEngine = new VisualizerEngine(code);
    setEngine(newEngine);
    setCurrentStep(newEngine.getCurrentStep());
  };

  const resetSimulation = () => {
    playbackRef.current && clearInterval(playbackRef.current);
    setIsPlaying(false);
    setEngine(null);
    setCurrentStep(null);
    setError(null);
  };

  const nextStep = () => {
    if (engine) {
      const step = engine.nextStep();
      setCurrentStep({ ...step });
      if (engine.isAtEnd()) {
        setIsPlaying(false);
      }
    }
  };

  const prevStep = () => {
    if (engine) {
      setCurrentStep({ ...engine.prevStep() });
    }
  };

  const togglePlay = () => {
    if (!engine) return;
    setIsPlaying(!isPlaying);
  };

  useEffect(() => {
    if (isPlaying && engine && !engine.isAtEnd()) {
      playbackRef.current = setInterval(() => {
        nextStep();
      }, 700);
    } else {
      playbackRef.current && clearInterval(playbackRef.current);
    }
    return () => {
      if (playbackRef.current) clearInterval(playbackRef.current);
    };
  }, [isPlaying, engine]);

  return (
    <div className="app-container">
      <header className="header">
        <div className="logo-section">
          <div className="logo-text">JS Visualizer</div>
        </div>
        
        <div className="sample-selector">
          <span className="label">Samples:</span>
          {Object.keys(SAMPLES).map((name) => (
            <button key={name} onClick={() => loadSample(name as keyof typeof SAMPLES)} className="btn-sample">
              {name}
            </button>
          ))}
        </div>

        <div className="controls">
          <button onClick={startSimulation} className="btn-run">
            <span>▶</span> {engine ? 'Restart' : 'Run Simulation'}
          </button>
          
          <div className="step-controls">
            <button onClick={prevStep} disabled={!engine}>
              <span>←</span>
            </button>
            <button 
              onClick={togglePlay} 
              disabled={!engine || (engine?.isAtEnd() && !isPlaying)}
              className={isPlaying ? 'btn-active' : ''}
            >
              {isPlaying ? '⏸ Pause' : '⏵ Play'}
            </button>
            <button onClick={nextStep} disabled={!engine || engine.isAtEnd()}>
              <span>→</span>
            </button>
          </div>

          <button onClick={resetSimulation} className="btn-reset">
            ↺ Reset
          </button>
        </div>
      </header>

      <section className="editor-section">
        <div className="panel-header">
          Editor
          {error && <span className="error-badge">! Syntax Error</span>}
        </div>
        <div className="editor-wrapper">
          <CodeEditor code={code} onChange={setCode} />
        </div>
        {error && <div className="error-banner">{error}</div>}
      </section>

      <section className="visualizer-section">
        <div className="visualizer-layout">
          <div className="left-panel">
            <CallStack stack={currentStep?.callStack || []} />
          </div>
          <div className="right-panel">
            <div className="api-section">
              <WebAPIs tasks={currentStep?.webAPIs || []} />
            </div>
            <div className="queue-section">
              <EventLoopView 
                micro={currentStep?.microtasks || []} 
                macro={currentStep?.macrotasks || []} 
              />
            </div>
          </div>
        </div>
        {currentStep && (
          <div className="glass-panel description-panel">
            <div className="panel-header">Step Description</div>
            <div className="description-text">{currentStep.description}</div>
          </div>
        )}
      </section>

      <section className="console-section">
        <div className="panel-header">Output</div>
        <ConsolePanel logs={currentStep?.console || []} />
      </section>

      <style>{`
        .sample-selector {
          display: flex;
          gap: 8px;
          align-items: center;
          margin: 0 20px;
          padding: 4px 12px;
          background: rgba(255, 255, 255, 0.03);
          border-radius: 20px;
          border: 1px solid var(--border-subtle);
        }
        .sample-selector .label {
          font-size: 0.75rem;
          color: var(--text-secondary);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .btn-sample {
          background: transparent;
          border: none;
          color: var(--text-secondary);
          font-size: 0.75rem;
          padding: 4px 8px;
          border-radius: 4px;
          cursor: pointer;
          transition: all 0.2s;
        }
        .btn-sample:hover {
          background: rgba(255, 255, 255, 0.05);
          color: var(--accent-primary);
        }
        .visualizer-layout {
          display: grid;
          grid-template-columns: 200px 1fr;
          gap: 20px;
          flex: 1;
          min-height: 0;
        }
        .left-panel {
          height: 100%;
          display: flex;
          flex-direction: column;
        }
        .right-panel {
          display: flex;
          flex-direction: column;
          gap: 20px;
          min-height: 0;
        }
        .api-section {
          flex: 0 0 auto;
        }
        .queue-section {
          flex: 1;
          min-height: 0;
          overflow-y: auto;
        }
        .console-section .console {
          padding-left: 20px;
          padding-top: 10px;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .description-panel {
          margin-top: auto;
          padding-bottom: 12px;
        }
        .description-text {
          padding: 16px;
          color: var(--accent-info);
          font-style: italic;
        }
        .btn-run {
          background: var(--accent-primary);
          border: none;
        }
        .btn-run:hover {
          background: rgba(99, 102, 241, 0.9);
        }
        .btn-reset {
          color: var(--text-secondary);
        }
        .step-controls {
          display: flex;
          background: var(--bg-elevated);
          border-radius: 8px;
          border: 1px solid var(--border-subtle);
        }
        .step-controls button {
          border: none;
          background: transparent;
        }
        .step-controls button:not(:last-child) {
          border-right: 1px solid var(--border-subtle);
        }
        .btn-active {
          color: var(--accent-primary);
          background: rgba(99, 102, 241, 0.1) !important;
        }
        .editor-wrapper {
          flex: 1;
          position: relative;
        }
        .error-badge {
          color: var(--accent-error);
          font-size: 0.7rem;
          margin-left: 8px;
        }
        .error-banner {
          padding: 12px;
          background: rgba(239, 68, 68, 0.1);
          color: var(--accent-error);
          font-family: var(--font-mono);
          font-size: 0.8rem;
          border-top: 1px solid var(--border-strong);
        }
      `}</style>
    </div>
  );
}
