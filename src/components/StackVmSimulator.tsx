import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Terminal, 
  Cpu, 
  Play, 
  Pause, 
  RotateCcw, 
  ChevronRight, 
  FileCode, 
  CheckCircle2, 
  AlertCircle, 
  Layers, 
  Maximize2, 
  Minimize2, 
  Zap 
} from 'lucide-react';
import { 
  VmLexer, 
  VmParser, 
  VmSemanticAnalyzer, 
  VmCodeGenerator, 
  VirtualMachine, 
  VmInstruction, 
  VmState 
} from '../vmCore';

interface StackVmSimulatorProps {
  lang: 'en' | 'es';
}

const PRESETS = [
  {
    nameEn: "Basic Assignment",
    nameEs: "Asignación Básica",
    code: `x = 5\ny = x + 3`
  },
  {
    nameEn: "Conditional Statement (IF)",
    nameEs: "Condicional (IF)",
    code: `x = 12\nIF x > 10 THEN\n    y = 1\nEND`
  },
  {
    nameEn: "Simple Loop (WHILE)",
    nameEs: "Iteración en Bucle (WHILE)",
    code: `x = 1\nWHILE x < 6 DO\n    x = x + 1\nEND`
  },
  {
    nameEn: "Full Program (Dragon Example)",
    nameEs: "Programa Completo (Ejemplo Libro)",
    code: `x = 5\ny = x + 3\n\nIF y > 5 THEN\n    z = y * 2\nEND\n\nWHILE z < 20 DO\n    z = z + 1\nEND`
  }
];

export default function StackVmSimulator({ lang }: StackVmSimulatorProps) {
  const [sourceCode, setSourceCode] = useState(PRESETS[3].code);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [compileSuccess, setCompileSuccess] = useState(false);
  
  // Bytecode & VM Ref
  const [instructions, setInstructions] = useState<VmInstruction[]>([]);
  const [vmState, setVmState] = useState<VmState | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const playIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // VM core controller instance
  const vmInstance = useRef(new VirtualMachine());

  // Handle preset selector selection
  const selectPreset = (code: string) => {
    setSourceCode(code);
    setIsPlaying(false);
    setErrorMsg(null);
    setCompileSuccess(false);
    setInstructions([]);
    setVmState(null);
  };

  const handleCompile = () => {
    try {
      setIsPlaying(false);
      setErrorMsg(null);
      setCompileSuccess(false);

      // 1. Lex
      const lexer = new VmLexer(sourceCode);
      
      // 2. Parse (Build AST list of instructions)
      const parser = new VmParser(lexer);
      const programAst = parser.parseProgram();

      if (programAst.length === 0) {
        throw new Error(lang === 'es' 
          ? "El código fuente no contiene sentencias válidas." 
          : "The source code does not contain any valid compiler statements."
        );
      }

      // 3. Semantic Validation
      const analyzer = new VmSemanticAnalyzer();
      analyzer.validate(programAst);

      // 4. Code Generation -> Produces VM Instruction sequences
      const codeGen = new VmCodeGenerator();
      const generatedInstructions = codeGen.generate(programAst);

      setInstructions(generatedInstructions);
      setCompileSuccess(true);

      // Load instructions inside visual VM ref
      vmInstance.current.load(generatedInstructions);
      setVmState(vmInstance.current.getState());

    } catch (err: any) {
      setErrorMsg(err.message || String(err));
      setCompileSuccess(false);
    }
  };

  // Compile automatically on mount
  useEffect(() => {
    handleCompile();
  }, []);

  const handleStep = () => {
    if (!vmState) return;
    const newState = vmInstance.current.step();
    setVmState(newState);
    if (newState.terminated) {
      setIsPlaying(false);
    }
  };

  const handleRunAll = () => {
    if (!vmState) return;
    const newState = vmInstance.current.runComplete();
    setVmState(newState);
    setIsPlaying(false);
  };

  const handleReset = () => {
    if (!vmState) return;
    vmInstance.current.reset();
    setVmState(vmInstance.current.getState());
    setIsPlaying(false);
  };

  // Autoplay handler
  useEffect(() => {
    if (isPlaying) {
      playIntervalRef.current = setInterval(() => {
        handleStep();
      }, 700);
    } else {
      if (playIntervalRef.current) clearInterval(playIntervalRef.current);
    }
    return () => {
      if (playIntervalRef.current) clearInterval(playIntervalRef.current);
    };
  }, [isPlaying, vmState]);

  return (
    <div className="bg-zinc-950/20 rounded-xl space-y-6">
      {/* Introduction text card */}
      <div className="bg-zinc-900/40 border border-zinc-800 rounded-xl p-5 relative overflow-hidden text-left">
        <div className="flex items-center gap-2 mb-2">
          <Cpu className="w-5 h-5 text-indigo-400" />
          <h3 className="font-semibold text-zinc-100 text-sm tracking-wider font-mono">
            {lang === 'es' ? 'COMPILADOR DE CÓDIGO & MOTOR DE MÁQUINA VIRTUAL S-STACK' : 'SOURCE CODE COMPILER & S-STACK VIRTUAL MACHINE ENGINE'}
          </h3>
        </div>
        <p className="text-xs text-zinc-400 leading-relaxed max-w-4xl">
          {lang === 'es'
            ? 'Experimenta el flujo completo similar al bytecode de ejecución de Python y la JVM. Escribe sentencias en lenguaje natural, compílalas a instrucciones matemáticas con pila basadas en registros y simula su ejecución paso a paso.'
            : 'Explore compiler intermediate code generation and stack virtual machine execution. This interface models instruction compilation mechanics comparable to JVM Bytecode and Python stack runtimes.'}
        </p>

        {/* Quick Language cheat sheet */}
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 border-t border-zinc-850 pt-3">
          <div className="bg-zinc-950/50 p-2.5 rounded border border-zinc-900">
            <span className="font-mono text-[10px] text-indigo-400 block font-semibold">
              {lang === 'es' ? '1. ASIGNACIONES' : '1. ASSIGNMENTS'}
            </span>
            <span className="font-mono text-xs text-zinc-400">x = 5 * (y + 1)</span>
          </div>
          <div className="bg-zinc-950/50 p-2.5 rounded border border-zinc-900">
            <span className="font-mono text-[10px] text-indigo-400 block font-semibold">
              {lang === 'es' ? '2. CONDICIONALES (IF)' : '2. CONDITIONALS (IF)'}
            </span>
            <span className="font-mono text-xs text-zinc-400">IF x &gt; 10 THEN ... END</span>
          </div>
          <div className="bg-zinc-950/50 p-2.5 rounded border border-zinc-900">
            <span className="font-mono text-[10px] text-indigo-400 block font-semibold">
              {lang === 'es' ? '3. BUCLES (WHILE)' : '3. LOOPS (WHILE)'}
            </span>
            <span className="font-mono text-xs text-zinc-400">WHILE x &lt; 10 DO ... END</span>
          </div>
        </div>
      </div>

      {/* Editor & Configuration Zone */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        <div className="lg:col-span-5 flex flex-col justify-between space-y-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex flex-col flex-1 space-y-4 text-left">
            <div className="flex justify-between items-center border-b border-zinc-800 pb-2">
              <div className="flex items-center gap-1.5">
                <FileCode className="w-4 h-4 text-zinc-400" />
                <span className="text-xs font-semibold uppercase tracking-wider text-zinc-300 font-mono">
                  {lang === 'es' ? 'Código Fuente Editor' : 'Source Code Editor'}
                </span>
              </div>

              {/* Preset buttons select */}
              <div className="flex flex-wrap gap-1">
                {PRESETS.map((p, i) => (
                  <button
                    key={i}
                    onClick={() => selectPreset(p.code)}
                    className="text-[9px] font-mono bg-zinc-800 hover:bg-zinc-700 hover:text-zinc-200 border border-zinc-700 text-zinc-400 px-2 py-0.5 rounded transition"
                  >
                    {lang === 'es' ? p.nameEs : p.nameEn}
                  </button>
                ))}
              </div>
            </div>

            <textarea
              value={sourceCode}
              onChange={(e) => setSourceCode(e.target.value)}
              className="flex-1 w-full bg-zinc-950 text-zinc-100 font-mono text-sm p-4 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 custom-scrollbar border border-zinc-850 min-h-[220px]"
              placeholder={lang === 'es' ? "Escribe tu código de VM aquí..." : "Write custom compiler VM instructions sequence here..."}
            />

            <div className="flex gap-2">
              <button
                onClick={handleCompile}
                className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-mono text-xs uppercase tracking-wider py-2.5 rounded-lg font-bold transition flex items-center justify-center gap-2"
              >
                <Zap className="w-3.5 h-3.5" />
                {lang === 'es' ? 'Compilar a Bytecode' : 'Compile to Bytecode'}
              </button>
            </div>
          </div>

          {/* Compilation error and diagnostic indicators */}
          {errorMsg && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-red-500/10 border border-red-500/25 p-4 rounded-xl flex items-start gap-2.5 text-left"
            >
              <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
              <div className="space-y-0.5">
                <span className="text-xs font-mono font-bold text-red-400">
                  {lang === 'es' ? 'Falla en compilación' : 'Compilation Failed'}
                </span>
                <p className="text-xs text-red-300 font-mono leading-relaxed">{errorMsg}</p>
              </div>
            </motion.div>
          )}

          {compileSuccess && !errorMsg && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-xl flex items-start gap-2.5 text-left"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5" />
              <div className="space-y-0.5">
                <span className="text-xs font-mono font-bold text-emerald-400">
                  {lang === 'es' ? '¡Compilación Correcta!' : 'Compilation Succeeded!'}
                </span>
                <p className="text-xs text-zinc-400">
                  {lang === 'es'
                    ? `Se generaron ${instructions.length} instrucciones de máquina pila intermedias listas para ejecutar.`
                    : `Successfully generated ${instructions.length} intermediate stack VM instructions, loaded into execution registry.`}
                </p>
              </div>
            </motion.div>
          )}
        </div>

        {/* Bytecode stream visual display */}
        <div className="lg:col-span-3 flex flex-col text-left">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex flex-col h-full space-y-3">
            <span className="text-xs font-semibold text-zinc-300 uppercase tracking-wider font-mono border-b border-zinc-800 pb-2">
              🤖 {lang === 'es' ? 'Código Intermedio' : 'Generated Bytecode'}
            </span>
            <div className="flex-1 overflow-y-auto space-y-1.5 custom-scrollbar max-h-[380px] pr-1 font-mono">
              {instructions.length === 0 ? (
                <div className="h-full flex items-center justify-center text-xs text-zinc-600 italic">
                  {lang === 'es' ? 'Sin código compilado' : 'No instruction loaded'}
                </div>
              ) : (
                instructions.map((inst, index) => {
                  const isActive = vmState !== null && vmState.pc === index;
                  return (
                    <motion.div
                      key={index}
                      className={`px-3 py-1.5 rounded-lg border flex justify-between items-center transition-all ${
                        isActive 
                          ? 'bg-indigo-600/25 border-indigo-500/50 text-indigo-300 font-semibold ring-1 ring-indigo-500/40 shadow shadow-indigo-500/10'
                          : 'bg-zinc-950/40 border-zinc-850 text-zinc-400 hover:border-zinc-800'
                      }`}
                    >
                      <div className="flex items-center gap-2 text-xs">
                        {isActive && <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />}
                        <span className="text-[10px] text-zinc-600">[{index}]</span>
                        <span className={inst.op === "LABEL" ? "text-amber-500" : "text-zinc-200"}>{inst.op}</span>
                        {inst.arg !== undefined && (
                          <span className="text-indigo-400 font-semibold font-mono">{inst.arg}</span>
                        )}
                      </div>
                      {inst.op === "LABEL" && (
                        <span className="bg-amber-900/10 border border-amber-900/20 text-amber-500 text-[8px] px-1 rounded">SYMBOL</span>
                      )}
                    </motion.div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Execution Engine visualizers */}
        <div className="lg:col-span-4 flex flex-col text-left">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex flex-col h-full space-y-4">
            <div className="flex justify-between items-center border-b border-zinc-800 pb-2">
              <span className="text-xs font-semibold text-zinc-300 uppercase tracking-wider font-mono">
                ⚙️ {lang === 'es' ? 'Simulador VM en Vivo' : 'Live VM Execution'}
              </span>

              {/* Engine controls */}
              <div className="flex items-center gap-1 bg-zinc-950 p-1 rounded-lg border border-zinc-850">
                <button
                  onClick={() => setIsPlaying(!isPlaying)}
                  disabled={!vmState || vmState.terminated}
                  className="hover:bg-zinc-820 p-1 text-zinc-300 disabled:opacity-30 rounded transition"
                  title={lang === 'es' ? 'Auto Ejecutar' : 'Autoplay'}
                >
                  {isPlaying ? <Pause className="w-3.5 h-3.5 text-amber-400" /> : <Play className="w-3.5 h-3.5 text-emerald-400" />}
                </button>
                <button
                  onClick={handleStep}
                  disabled={!vmState || vmState.terminated}
                  className="hover:bg-zinc-820 p-1 text-zinc-300 disabled:opacity-30 rounded transition"
                  title={lang === 'es' ? 'Evaluar Siguiente' : 'Step Single Instruction'}
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={handleRunAll}
                  disabled={!vmState || vmState.terminated}
                  className="hover:bg-zinc-820 p-1 text-zinc-300 disabled:opacity-30 rounded transition"
                  title={lang === 'es' ? 'Ejecución Completa' : 'Execute Complete'}
                >
                  <Zap className="w-3.5 h-3.5 text-indigo-400" />
                </button>
                <button
                  onClick={handleReset}
                  className="hover:bg-zinc-820 p-1 text-zinc-300 rounded transition"
                  title={lang === 'es' ? 'Iniciar de Nuevo' : 'Reset Virtual Machine'}
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Diagnostic stats */}
            <div className="grid grid-cols-2 gap-2 text-center text-xs">
              <div className="bg-zinc-950/60 p-2 border border-zinc-850 rounded">
                <span className="text-[9px] text-zinc-500 uppercase block">IP / PC</span>
                <span className="font-mono text-zinc-200 font-semibold">{vmState ? vmState.pc : 0}</span>
              </div>
              <div className="bg-zinc-950/60 p-2 border border-zinc-850 rounded">
                <span className="text-[9px] text-zinc-500 uppercase block">STATUS</span>
                <span className={`font-mono font-semibold ${vmState?.terminated ? 'text-zinc-500' : 'text-emerald-400'}`}>
                  {vmState ? (vmState.terminated ? (lang === 'es' ? 'FINALIZADO' : 'FINISHED') : (lang === 'es' ? 'RUNNING' : 'RUNNING')) : 'IDLE'}
                </span>
              </div>
            </div>

            {/* Memory registers panel */}
            <div className="space-y-1">
              <span className="text-[10px] text-zinc-500 font-mono uppercase tracking-wider block font-bold">
                💾 {lang === 'es' ? 'Mesa de Memoria' : 'Variable Memory Space'}
              </span>
              <div className="bg-zinc-950/80 border border-zinc-850 rounded-lg p-2.5 min-h-[90px] font-mono text-xs flex flex-col justify-start space-y-1">
                {vmState && Object.keys(vmState.variables).length > 0 ? (
                  Object.entries(vmState.variables).map(([name, val]) => (
                    <div key={name} className="flex justify-between border-b border-zinc-900 pb-1">
                      <span className="text-zinc-400 font-bold">{name}</span>
                      <span className="text-zinc-100">{val}</span>
                    </div>
                  ))
                ) : (
                  <span className="text-zinc-600 text-[11px] italic block m-auto">
                    {lang === 'es' ? 'Mesa de registros vacía' : 'No memory space allocated'}
                  </span>
                )}
              </div>
            </div>

            {/* Stack space panel */}
            <div className="flex-1 space-y-2 flex flex-col justify-start">
              <span className="text-[10px] text-zinc-500 font-mono uppercase tracking-wider block font-bold">
                📚 {lang === 'es' ? 'S-Stack (Evaluación)' : 'Dynamic S-Stack (Push/Pop)'}
              </span>
              <div className="flex-1 bg-zinc-950/80 border border-zinc-850 rounded-lg p-4 font-mono text-xs overflow-y-auto max-h-[140px] flex flex-col-reverse gap-1.5 custom-scrollbar justify-end items-center">
                {vmState && vmState.stack.length > 0 ? (
                  [...vmState.stack].reverse().map((val, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="bg-indigo-600 text-white font-bold w-11/12 py-1.5 rounded text-center border-b border-indigo-700 shadow-md flex justify-between px-3 text-[11px]"
                    >
                      <span className="text-indigo-300">[{vmState.stack.length - 1 - idx}]</span>
                      <span>{val}</span>
                    </motion.div>
                  ))
                ) : (
                  <span className="text-zinc-600 text-[11px] italic block m-auto">
                    {lang === 'es' ? '[Pila Vacía]' : '[Stack is currently Empty]'}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Real-time Diagnostics screen */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-left">
        <span className="text-xs font-semibold text-zinc-400 font-mono tracking-wider block mb-2">
          📟 {lang === 'es' ? 'LOGS DIAGNÓSTICOS DE MOTOR DE MÁQUINA' : 'MACHINE RUNTIME CODES & EXECUTIONS LOGS'}
        </span>
        <div className="bg-zinc-950 rounded-lg p-3 h-[120px] overflow-y-auto font-mono text-[11px] text-emerald-400 space-y-1 custom-scrollbar">
          {vmState && vmState.logs.length > 0 ? (
            vmState.logs.map((log, i) => (
              <div key={i} className="line-clamp-1 border-b border-zinc-900/50 pb-0.5">
                {log}
              </div>
            ))
          ) : (
            <span className="text-zinc-600 italic">
              {lang === 'es' ? 'Esperando inicio de máquina virtual...' : 'Awaiting virtual machine execution logs...'}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
