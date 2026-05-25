import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  ChevronRight, 
  Binary, 
  CheckCircle,
  HelpCircle
} from 'lucide-react';

interface SystemAutomatonProps {
  expression: string;
  lang: 'en' | 'es';
}

interface DfaState {
  id: string;
  labelEn: string;
  labelEs: string;
  x: number;
  y: number;
  descEn: string;
  descEs: string;
}

interface DfaTransition {
  from: string;
  to: string;
  labelEn: string;
  labelEs: string;
  curve?: 'up' | 'down' | 'self' | 'none';
}

export default function SystemAutomaton({ expression, lang }: SystemAutomatonProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentState, setCurrentState] = useState('START');
  const [isPlaying, setIsPlaying] = useState(false);
  const [history, setHistory] = useState<{ index: number; state: string; char: string | null; tokenMsg: string }[]>([
    { index: 0, state: 'START', char: null, tokenMsg: 'Initial State' }
  ]);
  const [currentTokenBuffer, setCurrentTokenBuffer] = useState('');
  const [logs, setLogs] = useState<string[]>([]);

  const playTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Define nodes in visual space (SVG)
  const dfaStates: DfaState[] = [
    { id: 'START', labelEn: 'START', labelEs: 'INICIO', x: 100, y: 150, descEn: 'Initial entry point for character feed.', descEs: 'Punto de entrada inicial para los caracteres.' },
    { id: 'NUMBER', labelEn: 'NUMBER', labelEs: 'NÚMERO', x: 300, y: 70, descEn: 'Processing digits, decimal points.', descEs: 'Procesando dígitos y puntos decimales.' },
    { id: 'VARIABLE', labelEn: 'VARIABLE', labelEs: 'VARIABLE', x: 300, y: 230, descEn: 'Parsing identifiers / variables.', descEs: 'Analizando identificadores y variables.' },
    { id: 'STRING', labelEn: 'STRING', labelEs: 'CADENA', x: 500, y: 150, descEn: 'Processing letters inside string quotes.', descEs: 'Procesando caracteres dentro de las comillas.' },
    { id: 'OPERATOR', labelEn: 'OPERATOR', labelEs: 'OPERADOR', x: 180, y: 50, descEn: 'Instant single-character operators (+,-,*,/,^).', descEs: 'Operadores de un solo carácter (+,-,*,/,^).' },
    { id: 'PARENTHESIS', labelEn: 'PARENS', labelEs: 'PARÉNTESIS', x: 180, y: 250, descEn: 'Matched parenthesis syntax ( or ).', descEs: 'Sintaxis de paréntesis ( o ).' },
    { id: 'ERROR', labelEn: 'ERROR', labelEs: 'ERROR', x: 500, y: 300, descEn: 'Encountered unexpected lexical character.', descEs: 'Se encontró un carácter léxico inesperado.' }
  ];

  // Visual transitions between nodes
  const dfaTransitions: DfaTransition[] = [
    { from: 'START', to: 'NUMBER', labelEn: 'digit (0-9)', labelEs: 'dígito (0-9)', curve: 'none' },
    { from: 'START', to: 'VARIABLE', labelEn: 'letter (a-z)', labelEs: 'letra (a-z)', curve: 'none' },
    { from: 'START', to: 'STRING', labelEn: 'quote (")', labelEs: 'comillas (")', curve: 'up' },
    { from: 'START', to: 'OPERATOR', labelEn: '+, -, *, /, ^', labelEs: '+, -, *, /, ^', curve: 'none' },
    { from: 'START', to: 'PARENTHESIS', labelEn: '(', labelEs: '(', curve: 'none' },
    { from: 'NUMBER', to: 'NUMBER', labelEn: 'digit, "."', labelEs: 'dígito, "."', curve: 'self' },
    { from: 'VARIABLE', to: 'VARIABLE', labelEn: 'alphanucleic', labelEs: 'alfanumérico', curve: 'self' },
    { from: 'STRING', to: 'STRING', labelEn: 'non-quote', labelEs: 'no-comilla', curve: 'self' },
    { from: 'STRING', to: 'START', labelEn: 'closing quote', labelEs: 'comilla de cierre', curve: 'down' },
    { from: 'START', to: 'ERROR', labelEn: 'invalid char', labelEs: 'carácter inválido', curve: 'none' }
  ];

  // Logic to process one step corresponding to a custom character-by-character transition
  const getNextDfaState = (char: string | null, state: string) => {
    if (char === null) return { next: 'START', produce: true, tokenType: 'EOF' };

    // Handle initial state transitions
    if (state === 'START') {
      if (/\s/.test(char)) return { next: 'START', produce: false };
      if (/[0-9]/.test(char)) return { next: 'NUMBER', produce: false };
      if (/[a-zA-Z]/.test(char)) return { next: 'VARIABLE', produce: false };
      if (char === '"') return { next: 'STRING', produce: false };
      if (['+', '-', '*', '/', '^'].includes(char)) return { next: 'START', produce: true, tokenType: 'OPERATOR' };
      if (['(', ')'].includes(char)) return { next: 'START', produce: true, tokenType: 'PARENTHESIS' };
      return { next: 'ERROR', produce: false };
    }

    // Number state self loops or exits
    if (state === 'NUMBER') {
      if (/[0-9]/.test(char) || char === '.') {
        return { next: 'NUMBER', produce: false };
      }
      // Non-number ends the token, produces a number. Then recheck from START.
      const retransResult = getNextDfaState(char, 'START');
      return { next: retransResult.next, produce: true, tokenType: 'NUMBER', recheck: true };
    }

    // Variable state self loops or exits
    if (state === 'VARIABLE') {
      if (/[a-zA-Z0-9]/.test(char)) {
        return { next: 'VARIABLE', produce: false };
      }
      // Non-variable ends the token, produces variable, then recheck from START
      const retransResult = getNextDfaState(char, 'START');
      return { next: retransResult.next, produce: true, tokenType: 'VARIABLE', recheck: true };
    }

    // String matches self loops or terminates
    if (state === 'STRING') {
      if (char === '"') {
        return { next: 'START', produce: true, tokenType: 'STRING' };
      }
      return { next: 'STRING', produce: false };
    }

    // Error loops
    if (state === 'ERROR') {
      if (/\s/.test(char)) return { next: 'START', produce: false };
      return { next: 'ERROR', produce: false };
    }

    return { next: 'START', produce: false };
  };

  const handleReset = () => {
    setCurrentIndex(0);
    setCurrentState('START');
    setHistory([{ index: 0, state: 'START', char: null, tokenMsg: 'START' }]);
    setCurrentTokenBuffer('');
    setLogs([]);
    setIsPlaying(false);
  };

  const handleStep = () => {
    if (currentIndex >= expression.length) {
      if (currentState !== 'START') {
        // Emit final token if anything left
        const tokenType = currentState;
        setLogs(prev => [...prev, lang === 'es' 
          ? `✓ [Fin de Expresión] Token Producido: ${tokenType} [Valor: "${currentTokenBuffer}"]`
          : `✓ [End of Expression] Token Produced: ${tokenType} [Value: "${currentTokenBuffer}"]`
        ]);
        setCurrentState('START');
        setCurrentTokenBuffer('');
      } else {
        setLogs(prev => [...prev, lang === 'es' ? '🏁 Procesamiento completo' : '🏁 Finished processing string!']);
      }
      setIsPlaying(false);
      return;
    }

    const char = expression[currentIndex];
    const { next, produce, tokenType, recheck } = getNextDfaState(char, currentState);

    let nextTokenBuffer = currentTokenBuffer;
    let transitionMsg = '';

    if (produce) {
      const producedVal = currentTokenBuffer ? currentTokenBuffer : char;
      const typeStr = tokenType || currentState;
      const logMsg = lang === 'es'
        ? `✓ Token Producido: ${typeStr} (Valor: "${producedVal}")`
        : `✓ Token Produced: ${typeStr} (Value: "${producedVal}")`;
      
      setLogs(prev => [...prev, logMsg]);
      nextTokenBuffer = recheck && !/\s/.test(char) ? char : '';
      transitionMsg = `Produce ${typeStr}`;
    } else {
      if (!/\s/.test(char) || currentState === 'STRING') {
        nextTokenBuffer += char;
      }
      transitionMsg = `Shift to State: ${next}`;
    }

    const stateDesc = lang === 'es' 
      ? `Canal: '${char}' -> Estado '${currentState}' a '${next}'` 
      : `Input: '${char}' -> State '${currentState}' transitions to '${next}'`;

    setCurrentState(next);
    setCurrentTokenBuffer(nextTokenBuffer);
    setCurrentIndex(prev => prev + 1);
    setHistory(prev => [...prev, { index: currentIndex + 1, state: next, char, tokenMsg: transitionMsg }]);
  };

  // Autoplay function
  useEffect(() => {
    if (isPlaying) {
      playTimeoutRef.current = setTimeout(() => {
        handleStep();
      }, 750);
    } else if (playTimeoutRef.current) {
      clearTimeout(playTimeoutRef.current);
    }
    return () => {
      if (playTimeoutRef.current) clearTimeout(playTimeoutRef.current);
    };
  }, [isPlaying, currentIndex, currentState, expression]);

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 shadow-xl space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-zinc-800 pb-4">
        <div className="space-y-1">
          <h3 className="text-zinc-100 font-semibold text-lg flex items-center gap-2">
            <Binary className="w-5 h-5 text-indigo-500" />
            {lang === 'es' ? 'Simulador del Autómata del Sistema' : 'System Automaton Simulator'}
          </h3>
          <p className="text-xs text-zinc-400">
            {lang === 'es' 
              ? 'Observa en tiempo real cómo el Autómata Finito Determinista (DFA) procesa cada carácter de tu expresión.' 
              : 'Analyze in real-time how the Deterministic Finite Automaton (DFA) processes every character of your expression.'}
          </p>
        </div>
        
        {/* Real-time controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            disabled={currentIndex >= expression.length && currentState === 'START'}
            className={`flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all ${
              isPlaying
                ? 'bg-amber-500/10 border-amber-500/20 text-amber-400 hover:bg-amber-500/20'
                : 'bg-indigo-600 border-indigo-500 text-white hover:bg-indigo-500 disabled:opacity-50 disabled:pointer-events-none'
            }`}
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            {isPlaying ? (lang === 'es' ? 'Pausar' : 'Pause') : (lang === 'es' ? 'Auto Reproducir' : 'Autoplay')}
          </button>
          
          <button
            onClick={handleStep}
            disabled={currentIndex >= expression.length && currentState === 'START'}
            className="flex items-center gap-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold px-3 py-1.5 rounded-lg border border-zinc-700 transition-all disabled:opacity-50"
          >
            <ChevronRight className="w-3.5 h-3.5" />
            {lang === 'es' ? 'Siguiente' : 'Step'}
          </button>

          <button
            onClick={handleReset}
            className="flex items-center gap-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 text-xs font-semibold px-3 py-1.5 rounded-lg border border-zinc-700 transition-all"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            {lang === 'es' ? 'Reiniciar' : 'Reset'}
          </button>
        </div>
      </div>

      {/* Feed input display */}
      <div className="bg-zinc-950 rounded-xl p-4 border border-zinc-850 flex flex-col md:flex-row items-center gap-4 justify-between">
        <div className="flex-1 space-y-1 w-full text-left">
          <div className="text-[10px] text-zinc-500 font-mono uppercase tracking-widest">
            {lang === 'es' ? 'Expresión Procesada' : 'Processed Expression'}
          </div>
          <div className="font-mono text-lg flex items-center flex-wrap gap-0.5">
            {expression.split('').map((char, index) => {
              const isActive = index === currentIndex;
              const isPast = index < currentIndex;
              return (
                <span
                  key={index}
                  className={`px-1 rounded-sm transition-all duration-300 ${
                    isActive 
                      ? 'bg-indigo-500 text-white scale-110 font-bold ring-2 ring-indigo-500/50' 
                      : isPast 
                        ? 'text-zinc-600 line-through' 
                        : 'text-zinc-300'
                  }`}
                >
                  {char === ' ' ? '␣' : char}
                </span>
              );
            })}
            {currentIndex >= expression.length && (
              <span className="bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 text-xs rounded border border-emerald-500/25 ml-2 font-semibold">
                EOF
              </span>
            )}
          </div>
        </div>

        {/* Current token buffer */}
        <div className="bg-zinc-900 border border-zinc-800 px-4 py-2.5 rounded-lg flex items-center gap-3 w-full md:w-auto">
          <div className="space-y-0.5">
            <div className="text-[9px] text-zinc-500 font-mono uppercase tracking-wider">
              {lang === 'es' ? 'Canal de Token' : 'Token Buffer'}
            </div>
            <div className="font-mono text-sm text-indigo-300 font-bold max-w-[120px] truncate">
              {currentTokenBuffer || (lang === 'es' ? '(Vacío)' : '(Empty)')}
            </div>
          </div>
          <div className="h-8 w-px bg-zinc-800" />
          <div className="space-y-0.5">
            <div className="text-[9px] text-zinc-500 font-mono uppercase tracking-wider">
              {lang === 'es' ? 'Estado Actual' : 'Current State'}
            </div>
            <div className="font-mono text-sm text-indigo-400 font-bold">
              {currentState}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Interactive SVG Diagram */}
        <div className="lg:col-span-2 bg-zinc-950 rounded-xl border border-zinc-850 p-4 relative overflow-hidden flex flex-col justify-between min-h-[380px]">
          <div className="absolute top-2 right-2 text-[10px] text-zinc-500 flex items-center gap-1 z-10">
            <HelpCircle className="w-3 h-3 text-zinc-600" />
            {lang === 'es' ? 'Finito Determinista (DFA)' : 'Finite Deterministic (DFA)'}
          </div>

          <svg width="100%" height="340" className="w-full h-full max-h-[340px] z-0">
            <defs>
              <marker id="arrow" viewBox="0 0 10 10" refX="28" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M 0 1 L 10 5 L 0 9 z" fill="#4B5563" />
              </marker>
              <marker id="arrow-active" viewBox="0 0 10 10" refX="28" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M 0 1 L 10 5 L 0 9 z" fill="#6366F1" />
              </marker>
            </defs>

            {/* Render transitions */}
            {dfaTransitions.map((t, idx) => {
              const fromN = dfaStates.find(s => s.id === t.from);
              const toN = dfaStates.find(s => s.id === t.to);
              if (!fromN || !toN) return null;

              const isTransitionActive = currentState === t.from && (
                (t.to === 'NUMBER' && currentState === 'START' && /[0-9]/.test(expression[currentIndex] || '')) ||
                (t.to === 'VARIABLE' && currentState === 'START' && /[a-zA-Z]/.test(expression[currentIndex] || '')) ||
                (t.to === 'STRING' && currentState === 'START' && (expression[currentIndex] || '') === '"') ||
                (t.to === 'OPERATOR' && currentState === 'START' && ['+', '-', '*', '/', '^'].includes(expression[currentIndex] || '')) ||
                (t.to === 'PARENTHESIS' && currentState === 'START' && ['(', ')'].includes(expression[currentIndex] || '')) ||
                (t.to === 'STRING' && currentState === 'STRING' && (expression[currentIndex] || '') !== '"') ||
                (t.to === 'START' && currentState === 'STRING' && (expression[currentIndex] || '') === '"') ||
                (t.to === 'NUMBER' && currentState === 'NUMBER' && /[0-9\.]/.test(expression[currentIndex] || '')) ||
                (t.to === 'VARIABLE' && currentState === 'VARIABLE' && /[a-zA-Z0-9]/.test(expression[currentIndex] || ''))
              );

              // Handle self loop representation
              if (t.from === t.to) {
                const r = 24;
                const pathD = `M ${fromN.x - 10} ${fromN.y - r} C ${fromN.x - 30} ${fromN.y - 65}, ${fromN.x + 30} ${fromN.y - 65}, ${fromN.x + 10} ${fromN.y - r}`;
                return (
                  <g key={idx}>
                    <path
                      d={pathD}
                      fill="none"
                      stroke={isTransitionActive ? '#6366f1' : '#27272a'}
                      strokeWidth={isTransitionActive ? 2 : 1.5}
                      markerEnd={isTransitionActive ? 'url(#arrow-active)' : 'url(#arrow)'}
                      className="transition-all"
                    />
                    <text
                      x={fromN.x}
                      y={fromN.y - 58}
                      className={`text-[8px] font-mono text-center ${isTransitionActive ? 'fill-indigo-400 font-bold' : 'fill-zinc-600'}`}
                      textAnchor="middle"
                    >
                      {lang === 'es' ? t.labelEs : t.labelEn}
                    </text>
                  </g>
                );
              }

              // Curved representations to avoid overlapping lines
              let pathD = `M ${fromN.x} ${fromN.y} L ${toN.x} ${toN.y}`;
              if (t.curve === 'up') {
                const ctrlX = (fromN.x + toN.x) / 2;
                const ctrlY = (fromN.y + toN.y) / 2 - 40;
                pathD = `M ${fromN.x} ${fromN.y} Q ${ctrlX} ${ctrlY} ${toN.x} ${toN.y}`;
              } else if (t.curve === 'down') {
                const ctrlX = (fromN.x + toN.x) / 2;
                const ctrlY = (fromN.y + toN.y) / 2 + 40;
                pathD = `M ${fromN.x} ${fromN.y} Q ${ctrlX} ${ctrlY} ${toN.x} ${toN.y}`;
              }

              // Text position along line
              const textX = (fromN.x + toN.x) / 2;
              const textY = (fromN.y + toN.y) / 2 + (t.curve === 'up' ? -25 : t.curve === 'down' ? 25 : -8);

              return (
                <g key={idx}>
                  <path
                    d={pathD}
                    fill="none"
                    stroke={isTransitionActive ? '#6366f1' : '#27272a'}
                    strokeWidth={isTransitionActive ? 2 : 1.2}
                    markerEnd={isTransitionActive ? 'url(#arrow-active)' : 'url(#arrow)'}
                    className="transition-all"
                  />
                  <text
                    x={textX}
                    y={textY}
                    className={`text-[9px] font-mono ${isTransitionActive ? 'fill-indigo-400 font-bold' : 'fill-zinc-500'}`}
                    textAnchor="middle"
                  >
                    {lang === 'es' ? t.labelEs : t.labelEn}
                  </text>
                </g>
              );
            })}

            {/* Render Nodes */}
            {dfaStates.map((state) => {
              const isActive = currentState === state.id;
              return (
                <g key={state.id} className="cursor-help transition-all">
                  {/* Glowing layer */}
                  {isActive && (
                    <circle
                      cx={state.x}
                      cy={state.y}
                      r="29"
                      fill="none"
                      stroke="#6366f1"
                      strokeWidth="2"
                      className="animate-ping opacity-25"
                    />
                  )}
                  {/* Circle Body */}
                  <circle
                    cx={state.x}
                    cy={state.y}
                    r="25"
                    fill={isActive ? '#1e1b4b' : '#09090b'}
                    stroke={isActive ? '#6366f1' : '#27272a'}
                    strokeWidth={isActive ? 2 : 1}
                    className="transition-colors duration-300"
                  />
                  {/* State Name */}
                  <text
                    x={state.x}
                    y={state.y + 4}
                    className={`text-[8px] font-bold text-center ${isActive ? 'fill-indigo-300 font-bold' : 'fill-zinc-400'}`}
                    textAnchor="middle"
                  >
                    {lang === 'es' ? state.labelEs : state.labelEn}
                  </text>
                </g>
              );
            })}
          </svg>

          {/* Details for active state */}
          <div className="bg-zinc-900/50 p-2.5 rounded-lg border border-zinc-800 text-left">
            <div className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider mb-0.5">
              {lang === 'es' ? 'Estado Detalle' : 'State Detail'}
            </div>
            <p className="text-xs text-zinc-300">
              <strong className="text-indigo-400">{currentState}:</strong>{' '}
              {lang === 'es' 
                ? dfaStates.find(s => s.id === currentState)?.descEs
                : dfaStates.find(s => s.id === currentState)?.descEn
              }
            </p>
          </div>
        </div>

        {/* Step-by-Step Logs */}
        <div className="bg-zinc-950 rounded-xl border border-zinc-850 p-4 flex flex-col justify-between h-[380px]">
          <div className="flex justify-between items-center border-b border-zinc-850 pb-2 mb-3">
            <span className="text-xs font-semibold text-zinc-400 font-mono tracking-wider">
              {lang === 'es' ? '📝 HISTORIAL LÉXICO' : '📝 LEXICAL LOGS'}
            </span>
            <span className="bg-zinc-900 border border-zinc-800 text-zinc-500 text-[10px] px-1.5 py-0.5 rounded font-mono">
              {logs.length} entries
            </span>
          </div>

          {/* Scrollable logs screen */}
          <div className="flex-1 overflow-y-auto space-y-2 text-left custom-scrollbar pr-1">
            {logs.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-zinc-600 italic text-xs gap-2">
                <CheckCircle className="w-8 h-8 text-zinc-700 stroke-1" />
                {lang === 'es' 
                  ? 'Haz clic en "Siguiente" o "Auto Reproducir"' 
                  : 'Click "Step" or "Autoplay" to generate states.'}
              </div>
            ) : (
              logs.map((log, i) => (
                <div key={i} className="text-xs font-mono py-1 border-b border-zinc-900/40 text-emerald-400">
                  {log}
                </div>
              ))
            )}
          </div>

          <div className="text-[10px] text-zinc-500 border-t border-zinc-850 pt-2 text-center">
            {lang === 'es' 
              ? 'Muestra la salida semántica de cada nodo DFA.' 
              : 'Shows semantic emit output from target DFA.'}
          </div>
        </div>
      </div>
    </div>
  );
}
