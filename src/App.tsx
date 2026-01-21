import { useState, useEffect, useRef } from "react";
import "./App.css";
import CodeEditor from "./editor/CodeEditor";
import ConsolePanel from "./console/ConsolePanel";
import CallStack from "./visualizer/CallStack";
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
        <div className="visualizer-main-grid">
          <div className="visualizer-column left">
            <CallStack stack={currentStep?.callStack || []} />
            <EventLoopSpinner isActive={engine ? !engine.isAtEnd() : false} />
          </div>

          {/* Right Column: Web API + Queues */}
          <div className="visualizer-column right">
            <WebAPIs tasks={currentStep?.webAPIs || []} />
            <div className="queues-v-stack">
              <MicrotaskQueue items={currentStep?.microtasks || []} />
              <MacrotaskQueue items={currentStep?.macrotasks || []} />
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
    </div>
  );
}
