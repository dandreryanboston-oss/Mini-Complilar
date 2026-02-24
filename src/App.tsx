import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Terminal, 
  Cpu, 
  Code2, 
  Play, 
  AlertCircle, 
  ChevronRight, 
  Hash, 
  Binary,
  Layers,
  Calculator,
  Globe,
  Users,
  Info
} from 'lucide-react';
import * as d3 from 'd3';

type Language = 'en' | 'es' | 'fr';

const translations = {
  en: {
    title: "MiniCompiler",
    subtitle: "v1.0.0-academic",
    status: "Compiler Engine Active",
    source: "Source Expression",
    placeholder: "Enter expression (e.g., 2^3 + 4 * 5)",
    compile: "Compile",
    lexical: "Lexical Analysis (Tokens)",
    syntax: "Syntax Tree (AST)",
    semantic: "Semantic Evaluation",
    result: "Final Result",
    noTree: "No tree generated",
    errorConn: "Failed to connect to the compiler service.",
    waiting: "Waiting for compilation...",
    phases: "Compilation Phases Implemented",
    phase1: "1. Lexical Analysis",
    phase1Desc: "Converts input string into a sequence of tokens (NUMBER, OP, PAREN).",
    phase2: "2. Syntax Analysis",
    phase2Desc: "Recursive descent parser validates grammar and operator precedence.",
    phase3: "3. AST Construction",
    phase3Desc: "Builds a hierarchical representation of the expression structure.",
    phase4: "4. Semantic Evaluation",
    phase4Desc: "Recursively traverses the AST to compute the mathematical result.",
    creators: "Development Team",
    roles: {
      backend: "Backend Architect",
      idea: "Product Lead",
      frontend: "Frontend Engineer",
      testing: "QA Engineer"
    }
  },
  es: {
    title: "MiniCompilador",
    subtitle: "v1.0.0-académico",
    status: "Motor de Compilación Activo",
    source: "Expresión de Origen",
    placeholder: "Ingrese expresión (ej., 2^3 + 4 * 5)",
    compile: "Compilar",
    lexical: "Análisis Léxico (Tokens)",
    syntax: "Árbol Sintáctico (AST)",
    semantic: "Evaluación Semántica",
    result: "Resultado Final",
    noTree: "No se generó el árbol",
    errorConn: "Error al conectar con el servicio del compilador.",
    waiting: "Esperando compilación...",
    phases: "Etapas de Compilación Implementadas",
    phase1: "1. Analizador Léxico",
    phase1Desc: "Convierte la cadena de entrada en una secuencia de tokens (NUM, OP, PAR).",
    phase2: "2. Analizador Sintáctico",
    phase2Desc: "El analizador de descenso recursivo valida la gramática y precedencia.",
    phase3: "3. Construcción del AST",
    phase3Desc: "Construye una representación jerárquica de la estructura de la expresión.",
    phase4: "4. Evaluación Semántica",
    phase4Desc: "Recorre recursivamente el AST para calcular el resultado matemático.",
    creators: "Equipo de Desarrollo",
    roles: {
      backend: "Arquitecto Backend",
      idea: "Líder de Proyecto",
      frontend: "Ingeniero Frontend",
      testing: "Ingeniero de Calidad (QA)"
    }
  },
  fr: {
    title: "MiniCompilateur",
    subtitle: "v1.0.0-académique",
    status: "Moteur de Compilation Actif",
    source: "Expression Source",
    placeholder: "Entrez l'expression (ex., 2^3 + 4 * 5)",
    compile: "Compiler",
    lexical: "Analyse Lexicale (Tokens)",
    syntax: "Arbre Syntaxique (AST)",
    semantic: "Évaluation Sémantique",
    result: "Résultat Final",
    noTree: "Aucun arbre généré",
    errorConn: "Échec de la connexion au service du compilateur.",
    waiting: "En attente de compilation...",
    phases: "Phases de Compilation Implémentées",
    phase1: "1. Analyse Lexicale",
    phase1Desc: "Convertit la chaîne d'entrée en une séquence de jetons (NOMBRE, OP, PAREN).",
    phase2: "2. Analyse Syntaxique",
    phase2Desc: "L'analyseur à descente récursive valide la grammaire et la priorité.",
    phase3: "3. Construction de l'AST",
    phase3Desc: "Construit une représentation hiérarchique de la structure de l'expression.",
    phase4: "4. Évaluation Sémantique",
    phase4Desc: "Parcourt récursivement l'AST pour calculer le résultat mathématique.",
    creators: "Équipe de Développement",
    roles: {
      backend: "Architecte Backend",
      idea: "Chef de Produit",
      frontend: "Ingénieur Frontend",
      testing: "Ingénieur Qualité (QA)"
    }
  }
};

import { Lexer, Parser, Evaluator } from './compilerCore';

interface Token {
  type: string;
  value: any;
}

interface ASTNode {
  type: string;
  value?: any;
  op?: string;
  left?: ASTNode;
  right?: ASTNode;
}

interface CompileResult {
  tokens: Token[];
  ast: ASTNode;
  result: number;
  error?: string;
}

const TreeDiagram: React.FC<{ data: ASTNode }> = ({ data }) => {
  const svgRef = React.useRef<SVGSVGElement>(null);

  React.useEffect(() => {
    if (!data || !svgRef.current) return;

    d3.select(svgRef.current).selectAll("*").remove();

    const width = 600;
    const height = 400;
    const margin = { top: 40, right: 40, bottom: 40, left: 40 };

    const svg = d3.select(svgRef.current)
      .attr("viewBox", `0 0 ${width} ${height}`)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    const root = d3.hierarchy(data, (d: any) => {
      const children = [];
      if (d.left) children.push(d.left);
      if (d.right) children.push(d.right);
      return children.length > 0 ? children : null;
    });

    const treeLayout = d3.tree<ASTNode>().size([width - margin.left - margin.right, height - margin.top - margin.bottom]);
    treeLayout(root);

    svg.selectAll(".link")
      .data(root.links())
      .enter()
      .append("line")
      .attr("class", "link")
      .attr("x1", d => d.source.x)
      .attr("y1", d => d.source.y)
      .attr("x2", d => d.target.x)
      .attr("y2", d => d.target.y)
      .attr("stroke", "#3f3f46")
      .attr("stroke-width", 1.5);

    const nodes = svg.selectAll(".node")
      .data(root.descendants())
      .enter()
      .append("g")
      .attr("class", "node")
      .attr("transform", d => `translate(${d.x},${d.y})`);

    nodes.append("rect")
      .attr("x", -20)
      .attr("y", -12)
      .attr("width", 40)
      .attr("height", 24)
      .attr("fill", "#09090b");

    nodes.append("text")
      .attr("dy", "0.35em")
      .attr("text-anchor", "middle")
      .text((d: any) => d.data.type === 'NumberNode' ? d.data.value : d.data.op)
      .attr("fill", "#ffffff")
      .attr("font-family", "JetBrains Mono, monospace")
      .attr("font-size", "18px")
      .attr("font-weight", "500");

  }, [data]);

  return (
    <div className="w-full h-full flex items-center justify-center bg-zinc-900/30 rounded-lg overflow-hidden">
      <svg ref={svgRef} className="w-full h-full max-h-[500px]" />
    </div>
  );
};

export default function App() {
  const [lang, setLang] = useState<Language>('en');
  const t = useMemo(() => translations[lang], [lang]);

  const [expression, setExpression] = useState('3 + 5 * (10 / 2)');
  const [result, setResult] = useState<CompileResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCompile = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setLoading(true);
    setError(null);
    
    // Artificial delay for better UX feel
    await new Promise(resolve => setTimeout(resolve, 300));

    try {
      // 1. Lexical Analysis
      const lexer = new Lexer(expression);
      const tokens = lexer.tokenize();

      // 2. Syntax Analysis
      const lexerForParser = new Lexer(expression);
      const parser = new Parser(lexerForParser);
      const ast = parser.parse();

      // 3. Semantic Evaluation
      const evaluator = new Evaluator();
      const finalResult = evaluator.evaluate(ast);

      setResult({
        tokens: tokens as any,
        ast: ast as any,
        result: finalResult
      });
    } catch (err: any) {
      setError(err.message || t.errorConn);
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    handleCompile();
  }, []);

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 font-sans selection:bg-indigo-500/30 flex flex-col">
      {/* Header */}
      <header className="border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-md sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Cpu className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-lg tracking-tight">{t.title}</h1>
              <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-mono">{t.subtitle}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-6">
            <div className="hidden md:flex items-center gap-4 text-xs font-mono text-zinc-500">
              <span className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                {t.status}
              </span>
            </div>
            
            <div className="flex items-center bg-zinc-800/50 rounded-full p-1 border border-zinc-700/50">
              {(['en', 'es', 'fr'] as Language[]).map((l) => (
                <button
                  key={l}
                  onClick={() => setLang(l)}
                  className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase transition-all ${
                    lang === l 
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20' 
                      : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8 w-full">
        {/* Left Column: Input & Tokens */}
        <div className="lg:col-span-5 space-y-8">
          <section className="space-y-4">
            <div className="flex items-center gap-2 text-zinc-400">
              <Terminal className="w-4 h-4" />
              <h2 className="text-xs font-semibold uppercase tracking-wider">{t.source}</h2>
            </div>
            <form onSubmit={handleCompile} className="relative group">
              <input
                type="text"
                value={expression}
                onChange={(e) => setExpression(e.target.value)}
                placeholder={t.placeholder}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-4 font-mono text-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-inner"
              />
              <button
                type="submit"
                disabled={loading}
                className="absolute right-2 top-2 bottom-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white px-4 rounded-lg flex items-center gap-2 transition-all active:scale-95 shadow-lg shadow-indigo-500/20"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Play className="w-4 h-4 fill-current" />
                )}
                <span className="text-sm font-medium">{t.compile}</span>
              </button>
            </form>
          </section>

          <section className="space-y-4">
            <div className="flex items-center gap-2 text-zinc-400">
              <Code2 className="w-4 h-4" />
              <h2 className="text-xs font-semibold uppercase tracking-wider">{t.lexical}</h2>
            </div>
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 min-h-[200px] max-h-[400px] overflow-y-auto custom-scrollbar shadow-inner backdrop-blur-sm">
              <div className="flex flex-wrap gap-2">
                <AnimatePresence mode="popLayout">
                  {result?.tokens.map((token, idx) => (
                    <motion.div
                      key={`${idx}-${token.type}`}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="flex items-center gap-1.5 bg-zinc-800/50 border border-zinc-700/50 px-2.5 py-1 rounded-md hover:border-indigo-500/30 transition-colors"
                    >
                      <span className="text-[10px] font-mono text-zinc-500 uppercase">{token.type}</span>
                      <span className="text-sm font-mono text-indigo-300">{token.value}</span>
                    </motion.div>
                  ))}
                </AnimatePresence>
                {!result && !loading && !error && (
                  <p className="text-zinc-600 text-sm italic">{t.waiting}</p>
                )}
              </div>
            </div>
          </section>
        </div>

        {/* Right Column: AST & Result */}
        <div className="lg:col-span-7 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <section className="space-y-4 flex flex-col">
              <div className="flex items-center gap-2 text-zinc-400">
                <Layers className="w-4 h-4" />
                <h2 className="text-xs font-semibold uppercase tracking-wider">{t.syntax}</h2>
              </div>
              <div className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl p-6 font-mono overflow-auto min-h-[400px] shadow-inner">
                {result?.ast ? (
                  <TreeDiagram data={result.ast} />
                ) : (
                  <div className="h-full flex items-center justify-center text-zinc-700 italic text-sm">
                    {t.noTree}
                  </div>
                )}
              </div>
            </section>

            <section className="space-y-4 flex flex-col">
              <div className="flex items-center gap-2 text-zinc-400">
                <Calculator className="w-4 h-4" />
                <h2 className="text-xs font-semibold uppercase tracking-wider">{t.semantic}</h2>
              </div>
              <div className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl p-6 flex flex-col items-center justify-center gap-4 shadow-inner relative overflow-hidden">
                <div className="absolute inset-0 bg-indigo-500/5 pointer-events-none" />
                <div className="text-zinc-500 text-sm uppercase tracking-widest font-mono z-10">{t.result}</div>
                <div className="text-6xl font-bold tracking-tighter text-white z-10">
                  {result ? (
                    <motion.span
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      key={result.result}
                    >
                      {Number.isInteger(result.result) ? result.result : result.result.toFixed(4)}
                    </motion.span>
                  ) : (
                    <span className="text-zinc-800">--</span>
                  )}
                </div>
                {error && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="mt-4 flex items-center gap-2 text-red-400 bg-red-400/10 border border-red-400/20 px-4 py-2 rounded-lg text-sm z-10"
                  >
                    <AlertCircle className="w-4 h-4" />
                    {error}
                  </motion.div>
                )}
              </div>
            </section>
          </div>

          {/* Academic Info */}
          <section className="bg-indigo-500/5 border border-indigo-500/10 rounded-xl p-6 relative overflow-hidden">
             <div className="absolute top-0 right-0 p-4 opacity-10">
                <Info className="w-12 h-12 text-indigo-500" />
             </div>
            <h3 className="text-sm font-semibold text-indigo-300 mb-4 flex items-center gap-2">
              <ChevronRight className="w-4 h-4" />
              {t.phases}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs text-zinc-400">
              <div className="space-y-1.5">
                <p className="text-zinc-200 font-semibold">{t.phase1}</p>
                <p className="leading-relaxed">{t.phase1Desc}</p>
              </div>
              <div className="space-y-1.5">
                <p className="text-zinc-200 font-semibold">{t.phase2}</p>
                <p className="leading-relaxed">{t.phase2Desc}</p>
              </div>
              <div className="space-y-1.5">
                <p className="text-zinc-200 font-semibold">{t.phase3}</p>
                <p className="leading-relaxed">{t.phase3Desc}</p>
              </div>
              <div className="space-y-1.5">
                <p className="text-zinc-200 font-semibold">{t.phase4}</p>
                <p className="leading-relaxed">{t.phase4Desc}</p>
              </div>
            </div>
          </section>
        </div>
      </main>

      {/* Creators Footer */}
      <footer className="border-t border-zinc-800 bg-zinc-900/30 py-10 mt-12">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-zinc-400 mb-4">
                <Users className="w-4 h-4" />
                <h2 className="text-xs font-semibold uppercase tracking-wider">{t.creators}</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="group">
                  <p className="text-sm font-medium text-zinc-200 group-hover:text-indigo-400 transition-colors">D´Andre Ryan Boston</p>
                  <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-mono">{t.roles.backend}</p>
                </div>
                <div className="group">
                  <p className="text-sm font-medium text-zinc-200 group-hover:text-indigo-400 transition-colors">Johana Gonzalez</p>
                  <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-mono">{t.roles.idea}</p>
                </div>
                <div className="group">
                  <p className="text-sm font-medium text-zinc-200 group-hover:text-indigo-400 transition-colors">Dani Maza</p>
                  <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-mono">{t.roles.frontend}</p>
                </div>
                <div className="group">
                  <p className="text-sm font-medium text-zinc-200 group-hover:text-indigo-400 transition-colors">Yulian Herrera</p>
                  <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-mono">{t.roles.testing}</p>
                </div>
              </div>
            </div>
            
            <div className="flex flex-col items-end gap-2">
               <div className="w-10 h-10 bg-zinc-800 rounded-full flex items-center justify-center border border-zinc-700">
                  <Globe className="w-5 h-5 text-zinc-500" />
               </div>
               <p className="text-[10px] text-zinc-600 font-mono">© 2026 Academic Project</p>
            </div>
          </div>
        </div>
      </footer>

      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #27272a;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #3f3f46;
        }
      `}} />
    </div>
  );
}
