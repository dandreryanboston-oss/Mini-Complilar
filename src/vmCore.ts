/**
 * VM Core - Educational Stack-Based Compiler, Code Generator & Virtual Machine
 * Inspired by concepts from "Compilers: Principles, Techniques, and Tools" (Dragon Book),
 * Python execution models, and JVM-style bytecodes.
 */

// --- 1. LEXER ---

export enum VmTokenType {
  NUMBER = "NUMBER",
  IDENTIFIER = "IDENTIFIER",
  ASSIGN = "ASSIGN",
  PLUS = "PLUS",
  MINUS = "MINUS",
  MUL = "MUL",
  DIV = "DIV",
  LPAREN = "LPAREN",
  RPAREN = "RPAREN",
  GT = "GT",
  LT = "LT",
  EQ = "EQ",
  // Keywords
  IF = "IF",
  THEN = "THEN",
  WHILE = "WHILE",
  DO = "DO",
  END = "END",
  NEWLINE = "NEWLINE",
  EOF = "EOF"
}

export interface VmToken {
  type: VmTokenType;
  value: string;
  line: number;
  col: number;
}

export class VmLexer {
  private text: string;
  private pos: number = 0;
  private line: number = 1;
  private col: number = 1;
  private currentChar: string | null = null;

  constructor(text: string) {
    this.text = text;
    this.currentChar = this.text.length > 0 ? this.text[0] : null;
  }

  private advance() {
    if (this.currentChar === "\n") {
      this.line++;
      this.col = 1;
    } else {
      this.col++;
    }
    this.pos++;
    this.currentChar = this.pos < this.text.length ? this.text[this.pos] : null;
  }

  private peek(): string | null {
    const peekPos = this.pos + 1;
    return peekPos < this.text.length ? this.text[peekPos] : null;
  }

  private skipWhitespace() {
    while (this.currentChar !== null && (this.currentChar === " " || this.currentChar === "\t" || this.currentChar === "\r")) {
      this.advance();
    }
  }

  private number(): VmToken {
    let result = "";
    const startCol = this.col;
    while (this.currentChar !== null && (/[0-9]/.test(this.currentChar) || this.currentChar === '.')) {
      result += this.currentChar;
      this.advance();
    }
    return { type: VmTokenType.NUMBER, value: result, line: this.line, col: startCol };
  }

  private identifier(): VmToken {
    let result = "";
    const startCol = this.col;
    while (this.currentChar !== null && /[a-zA-Z0-9_]/.test(this.currentChar)) {
      result += this.currentChar;
      this.advance();
    }

    // Keyword detection
    switch (result.toUpperCase()) {
      case "IF": return { type: VmTokenType.IF, value: result, line: this.line, col: startCol };
      case "THEN": return { type: VmTokenType.THEN, value: result, line: this.line, col: startCol };
      case "WHILE": return { type: VmTokenType.WHILE, value: result, line: this.line, col: startCol };
      case "DO": return { type: VmTokenType.DO, value: result, line: this.line, col: startCol };
      case "END": return { type: VmTokenType.END, value: result, line: this.line, col: startCol };
      default: return { type: VmTokenType.IDENTIFIER, value: result, line: this.line, col: startCol };
    }
  }

  public getNextToken(): VmToken {
    while (this.currentChar !== null) {
      if (this.currentChar === " " || this.currentChar === "\t" || this.currentChar === "\r") {
        this.skipWhitespace();
        continue;
      }

      if (this.currentChar === "\n") {
        const tok: VmToken = { type: VmTokenType.NEWLINE, value: "\n", line: this.line, col: this.col };
        this.advance();
        return tok;
      }

      if (/[0-9]/.test(this.currentChar)) {
        return this.number();
      }

      if (/[a-zA-Z_]/.test(this.currentChar)) {
        return this.identifier();
      }

      const startCol = this.col;

      // Double-character comparison operators: ==
      if (this.currentChar === "=" && this.peek() === "=") {
        this.advance();
        this.advance();
        return { type: VmTokenType.EQ, value: "==", line: this.line, col: startCol };
      }

      if (this.currentChar === "=") {
        this.advance();
        return { type: VmTokenType.ASSIGN, value: "=", line: this.line, col: startCol };
      }

      if (this.currentChar === "+") {
        this.advance();
        return { type: VmTokenType.PLUS, value: "+", line: this.line, col: startCol };
      }

      if (this.currentChar === "-") {
        this.advance();
        return { type: VmTokenType.MINUS, value: "-", line: this.line, col: startCol };
      }

      if (this.currentChar === "*") {
        this.advance();
        return { type: VmTokenType.MUL, value: "*", line: this.line, col: startCol };
      }

      if (this.currentChar === "/") {
        this.advance();
        return { type: VmTokenType.DIV, value: "/", line: this.line, col: startCol };
      }

      if (this.currentChar === "(") {
        this.advance();
        return { type: VmTokenType.LPAREN, value: "(", line: this.line, col: startCol };
      }

      if (this.currentChar === ")") {
        this.advance();
        return { type: VmTokenType.RPAREN, value: ")", line: this.line, col: startCol };
      }

      if (this.currentChar === ">") {
        this.advance();
        return { type: VmTokenType.GT, value: ">", line: this.line, col: startCol };
      }

      if (this.currentChar === "<") {
        this.advance();
        return { type: VmTokenType.LT, value: "<", line: this.line, col: startCol };
      }

      const badChar = this.currentChar;
      this.advance();
      throw new Error(`Lexical Error: Invalid character '${badChar}' at line ${this.line}, col ${startCol}`);
    }

    return { type: VmTokenType.EOF, value: "EOF", line: this.line, col: this.col };
  }

  public tokenize(): VmToken[] {
    const list: VmToken[] = [];
    let tok = this.getNextToken();
    while (tok.type !== VmTokenType.EOF) {
      list.push(tok);
      tok = this.getNextToken();
    }
    list.push(tok); // append EOF
    return list;
  }
}

// --- 2. AST REPRESENTATION ---

export type VmExpr =
  | { type: "Num"; value: number }
  | { type: "Var"; name: string }
  | { type: "BinOp"; op: "+" | "-" | "*" | "/" | ">" | "<" | "=="; left: VmExpr; right: VmExpr };

export type VmStmt =
  | { type: "Assign"; name: string; valueExpr: VmExpr }
  | { type: "If"; condition: VmExpr; body: VmStmt[] }
  | { type: "While"; condition: VmExpr; body: VmStmt[] };

// --- 3. PARSER ---

export class VmParser {
  private tokens: VmToken[];
  private currentIdx: number = 0;
  private currentToken: VmToken;

  constructor(lexer: VmLexer) {
    this.tokens = lexer.tokenize();
    this.currentToken = this.tokens[0];
  }

  private advance() {
    this.currentIdx++;
    if (this.currentIdx < this.tokens.length) {
      this.currentToken = this.tokens[this.currentIdx];
    }
  }

  private eat(type: VmTokenType) {
    if (this.currentToken.type === type) {
      this.advance();
    } else {
      this.error(`Expected token ${type}, but found ${this.currentToken.type} ('${this.currentToken.value}')`);
    }
  }

  private error(message: string): never {
    throw new Error(`Syntax Error (Line ${this.currentToken.line}, Col ${this.currentToken.col}): ${message}`);
  }

  private skipNewlines() {
    while (this.currentToken.type === VmTokenType.NEWLINE) {
      this.advance();
    }
  }

  // Expression grammar:
  // expr -> compExpr
  // compExpr -> term ( ( ">" | "<" | "==" ) term )*
  // term -> factor ( ( "+" | "-" ) factor )*
  // factor -> atom ( ( "*" | "/" ) atom )*
  // atom -> NUMBER | IDENTIFIER | "(" expr ")"

  private atom(): VmExpr {
    const tok = this.currentToken;
    if (tok.type === VmTokenType.NUMBER) {
      this.eat(VmTokenType.NUMBER);
      return { type: "Num", value: parseFloat(tok.value) };
    }
    if (tok.type === VmTokenType.IDENTIFIER) {
      this.eat(VmTokenType.IDENTIFIER);
      return { type: "Var", name: tok.value };
    }
    if (tok.type === VmTokenType.LPAREN) {
      this.eat(VmTokenType.LPAREN);
      const sub = this.expr();
      this.eat(VmTokenType.RPAREN);
      return sub;
    }
    this.error(`Unexpected token inside arithmetic expression: '${tok.value}'`);
  }

  private factor(): VmExpr {
    let node = this.atom();
    while (this.currentToken.type === VmTokenType.MUL || this.currentToken.type === VmTokenType.DIV) {
      const opTok = this.currentToken;
      this.eat(opTok.type);
      node = {
        type: "BinOp",
        op: opTok.type === VmTokenType.MUL ? "*" : "/",
        left: node,
        right: this.atom()
      };
    }
    return node;
  }

  private term(): VmExpr {
    let node = this.factor();
    while (this.currentToken.type === VmTokenType.PLUS || this.currentToken.type === VmTokenType.MINUS) {
      const opTok = this.currentToken;
      this.eat(opTok.type);
      node = {
        type: "BinOp",
        op: opTok.type === VmTokenType.PLUS ? "+" : "-",
        left: node,
        right: this.factor()
      };
    }
    return node;
  }

  private expr(): VmExpr {
    let node = this.term();
    while (
      this.currentToken.type === VmTokenType.GT ||
      this.currentToken.type === VmTokenType.LT ||
      this.currentToken.type === VmTokenType.EQ
    ) {
      const opTok = this.currentToken;
      this.eat(opTok.type);
      node = {
        type: "BinOp",
        op: opTok.value as ">" | "<" | "==",
        left: node,
        right: this.term()
      };
    }
    return node;
  }

  private assignStmt(): VmStmt {
    const identTok = this.currentToken;
    this.eat(VmTokenType.IDENTIFIER);
    this.eat(VmTokenType.ASSIGN);
    const val = this.expr();
    return { type: "Assign", name: identTok.value, valueExpr: val };
  }

  private ifStmt(): VmStmt {
    this.eat(VmTokenType.IF);
    const cond = this.expr();
    this.eat(VmTokenType.THEN);
    this.skipNewlines();

    const body: VmStmt[] = [];
    while (this.currentToken.type !== VmTokenType.END && this.currentToken.type !== VmTokenType.EOF) {
      body.push(this.statement());
      this.skipNewlines();
    }
    this.eat(VmTokenType.END);
    return { type: "If", condition: cond, body };
  }

  private whileStmt(): VmStmt {
    this.eat(VmTokenType.WHILE);
    const cond = this.expr();
    this.eat(VmTokenType.DO);
    this.skipNewlines();

    const body: VmStmt[] = [];
    while (this.currentToken.type !== VmTokenType.END && this.currentToken.type !== VmTokenType.EOF) {
      body.push(this.statement());
      this.skipNewlines();
    }
    this.eat(VmTokenType.END);
    return { type: "While", condition: cond, body };
  }

  private statement(): VmStmt {
    this.skipNewlines();
    const tok = this.currentToken;
    if (tok.type === VmTokenType.IF) {
      return this.ifStmt();
    }
    if (tok.type === VmTokenType.WHILE) {
      return this.whileStmt();
    }
    if (tok.type === VmTokenType.IDENTIFIER) {
      return this.assignStmt();
    }
    this.error(`Invalid statement beginning with '${tok.value}'`);
  }

  public parseProgram(): VmStmt[] {
    const prog: VmStmt[] = [];
    this.skipNewlines();
    while (this.currentToken.type !== VmTokenType.EOF) {
      prog.push(this.statement());
      this.skipNewlines();
    }
    return prog;
  }
}

// --- 4. SEMANTIC VALIDATION ---

export class VmSemanticAnalyzer {
  private definedVars = new Set<string>();

  public validate(program: VmStmt[]) {
    this.definedVars.clear();
    for (const stmt of program) {
      this.validateStmt(stmt);
    }
  }

  private validateStmt(stmt: VmStmt) {
    switch (stmt.type) {
      case "Assign":
        this.validateExpr(stmt.valueExpr);
        this.definedVars.add(stmt.name);
        break;
      case "If":
        this.validateExpr(stmt.condition);
        for (const sub of stmt.body) {
          this.validateStmt(sub);
        }
        break;
      case "While":
        this.validateExpr(stmt.condition);
        for (const sub of stmt.body) {
          this.validateStmt(sub);
        }
        break;
    }
  }

  private validateExpr(expr: VmExpr) {
    switch (expr.type) {
      case "Num":
        break;
      case "Var":
        if (!this.definedVars.has(expr.name)) {
          throw new Error(`Semantic Error: Reference to undefined variable '${expr.name}'`);
        }
        break;
      case "BinOp":
        this.validateExpr(expr.left);
        this.validateExpr(expr.right);
        if (expr.op === "/") {
          if (expr.right.type === "Num" && expr.right.value === 0) {
            throw new Error(`Semantic Error: Division by zero found in expression static assessment`);
          }
        }
        break;
    }
  }
}

// --- 5. INTERMEDIATE CODE GENERATION & BYTECODE ---

export type VmInstructionOp =
  | "PUSH"
  | "POP"
  | "LOAD"
  | "STORE"
  | "ADD"
  | "SUB"
  | "MUL"
  | "DIV"
  | "GT"
  | "LT"
  | "EQ"
  | "JMP"
  | "JMP_IF_FALSE"
  | "LABEL";

export interface VmInstruction {
  op: VmInstructionOp;
  arg?: string | number;
}

export class VmCodeGenerator {
  private instructions: VmInstruction[] = [];
  private labelCounter: number = 1;

  private generateUniqueLabel(): string {
    return `L${this.labelCounter++}`;
  }

  public generate(program: VmStmt[]): VmInstruction[] {
    this.instructions = [];
    this.labelCounter = 1;
    for (const stmt of program) {
      this.genStmt(stmt);
    }
    return this.instructions;
  }

  private emit(op: VmInstructionOp, arg?: string | number) {
    this.instructions.push({ op, arg });
  }

  private genExpr(expr: VmExpr) {
    switch (expr.type) {
      case "Num":
        this.emit("PUSH", expr.value);
        break;
      case "Var":
        this.emit("LOAD", expr.name);
        break;
      case "BinOp":
        // Postfix generation (evaluate left, then evaluate right, then apply Op)
        this.genExpr(expr.left);
        this.genExpr(expr.right);
        switch (expr.op) {
          case "+": this.emit("ADD"); break;
          case "-": this.emit("SUB"); break;
          case "*": this.emit("MUL"); break;
          case "/": this.emit("DIV"); break;
          case ">": this.emit("GT"); break;
          case "<": this.emit("LT"); break;
          case "==": this.emit("EQ"); break;
        }
        break;
    }
  }

  private genStmt(stmt: VmStmt) {
    switch (stmt.type) {
      case "Assign":
        this.genExpr(stmt.valueExpr);
        this.emit("STORE", stmt.name);
        break;

      case "If": {
        const falseLabel = this.generateUniqueLabel();
        this.genExpr(stmt.condition);
        this.emit("JMP_IF_FALSE", falseLabel);
        for (const sub of stmt.body) {
          this.genStmt(sub);
        }
        this.emit("LABEL", falseLabel);
        break;
      }

      case "While": {
        const startLabel = this.generateUniqueLabel();
        const endLabel = this.generateUniqueLabel();
        this.emit("LABEL", startLabel);
        this.genExpr(stmt.condition);
        this.emit("JMP_IF_FALSE", endLabel);
        for (const sub of stmt.body) {
          this.genStmt(sub);
        }
        this.emit("JMP", startLabel);
        this.emit("LABEL", endLabel);
        break;
      }
    }
  }
}

// --- 6. STACK-BASED VIRTUAL MACHINE (VM) ---

export interface VmState {
  pc: number;
  stack: number[];
  variables: Record<string, number>;
  logs: string[];
  terminated: boolean;
  exception?: string;
}

export class VirtualMachine {
  private instructions: VmInstruction[] = [];
  private labelTargets = new Map<string, number>();

  // Execution structures
  private pc: number = 0;
  private stack: number[] = [];
  private variables: Record<string, number> = {};
  private logs: string[] = [];
  private terminated: boolean = false;

  public load(instructions: VmInstruction[]) {
    this.instructions = instructions;
    this.labelTargets.clear();
    this.reset();

    // Scan labels & construct label-to-line matching offsets
    for (let i = 0; i < this.instructions.length; i++) {
      const instr = this.instructions[i];
      if (instr.op === "LABEL" && typeof instr.arg === "string") {
        this.labelTargets.set(instr.arg, i);
      }
    }
  }

  public reset() {
    this.pc = 0;
    this.stack = [];
    this.variables = {};
    this.logs = [];
    this.terminated = false;
  }

  public getInstructions(): VmInstruction[] {
    return this.instructions;
  }

  public getState(): VmState {
    return {
      pc: this.pc,
      stack: [...this.stack],
      variables: { ...this.variables },
      logs: [...this.logs],
      terminated: this.terminated
    };
  }

  /**
   * Helper push on execution stack
   */
  private push(val: number) {
    this.stack.push(val);
  }

  /**
   * Helper pop from execution stack with safety features
   */
  private pop(): number {
    if (this.stack.length === 0) {
      throw new Error("Virtual Machine Stack Underflow Exception: Pop attempted on an empty stack.");
    }
    return this.stack.pop()!;
  }

  /**
   * Executes a single step (one instruction) on the VM
   */
  public step(): VmState {
    if (this.terminated) {
      return this.getState();
    }

    if (this.pc >= this.instructions.length) {
      this.terminated = true;
      this.logs.push("VM: Execution finished successfully.");
      return this.getState();
    }

    const instr = this.instructions[this.pc];
    const logPrefix = `[PC: ${this.pc}] ${instr.op}${instr.arg !== undefined ? " " + instr.arg : ""}`;

    try {
      switch (instr.op) {
        case "PUSH":
          if (typeof instr.arg !== "number") {
            throw new Error(`Execution Exception: Invalid argument for PUSH (expected instruction numerical argument)`);
          }
          this.push(instr.arg);
          this.logs.push(`${logPrefix} -> Stack: [${this.stack.join(", ")}]`);
          this.pc++;
          break;

        case "POP":
          this.pop();
          this.logs.push(`${logPrefix} -> Stack: [${this.stack.join(", ")}]`);
          this.pc++;
          break;

        case "LOAD": {
          const varName = instr.arg as string;
          if (varName === undefined || !(varName in this.variables)) {
            throw new Error(`Execution Exception: Reference to undefined runtime variable '${varName}'`);
          }
          this.push(this.variables[varName]);
          this.logs.push(`${logPrefix} -> Loaded ${varName} (${this.variables[varName]}) into stack`);
          this.pc++;
          break;
        }

        case "STORE": {
          const varName = instr.arg as string;
          const val = this.pop();
          this.variables[varName] = val;
          this.logs.push(`${logPrefix} -> Saved value ${val} to variable '${varName}'`);
          this.pc++;
          break;
        }

        case "ADD": {
          const r = this.pop();
          const l = this.pop();
          this.push(l + r);
          this.logs.push(`${logPrefix} -> Executed ADD (${l} + ${r} = ${l + r})`);
          this.pc++;
          break;
        }

        case "SUB": {
          const r = this.pop();
          const l = this.pop();
          this.push(l - r);
          this.logs.push(`${logPrefix} -> Executed SUB (${l} - ${r} = ${l - r})`);
          this.pc++;
          break;
        }

        case "MUL": {
          const r = this.pop();
          const l = this.pop();
          this.push(l * r);
          this.logs.push(`${logPrefix} -> Executed MUL (${l} * ${r} = ${l * r})`);
          this.pc++;
          break;
        }

        case "DIV": {
          const r = this.pop();
          const l = this.pop();
          if (r === 0) {
            throw new Error("Virtual Machine Floating Point Exception: Division by Zero.");
          }
          this.push(l / r);
          this.logs.push(`${logPrefix} -> Executed DIV (${l} / ${r} = ${l / r})`);
          this.pc++;
          break;
        }

        case "GT": {
          const r = this.pop();
          const l = this.pop();
          this.push(l > r ? 1 : 0);
          this.logs.push(`${logPrefix} -> GT comparison: ${l} > ${r} is ${l > r}`);
          this.pc++;
          break;
        }

        case "LT": {
          const r = this.pop();
          const l = this.pop();
          this.push(l < r ? 1 : 0);
          this.logs.push(`${logPrefix} -> LT comparison: ${l} < ${r} is ${l < r}`);
          this.pc++;
          break;
        }

        case "EQ": {
          const r = this.pop();
          const l = this.pop();
          this.push(l === r ? 1 : 0);
          this.logs.push(`${logPrefix} -> EQ comparison: ${l} == ${r} is ${l === r}`);
          this.pc++;
          break;
        }

        case "JMP": {
          const lbl = instr.arg as string;
          if (!this.labelTargets.has(lbl)) {
            throw new Error(`Execution Exception: Target label '${lbl}' could not be resolved`);
          }
          const targetLine = this.labelTargets.get(lbl)!;
          this.logs.push(`${logPrefix} -> Unconditional jump to target Label ${lbl} (PC -> ${targetLine})`);
          this.pc = targetLine;
          break;
        }

        case "JMP_IF_FALSE": {
          const lbl = instr.arg as string;
          if (!this.labelTargets.has(lbl)) {
            throw new Error(`Execution Exception: Target label '${lbl}' could not be resolved`);
          }
          const condVal = this.pop();
          if (condVal === 0) {
            const targetLine = this.labelTargets.get(lbl)!;
            this.logs.push(`${logPrefix} -> Condition is false (0). Jumping to Label ${lbl} at program position ${targetLine}`);
            this.pc = targetLine;
          } else {
            this.logs.push(`${logPrefix} -> Condition is true (${condVal}). Continuing sequential execution`);
            this.pc++;
          }
          break;
        }

        case "LABEL":
          // LABEL is a non-op marker during real execution
          this.logs.push(`${logPrefix} -> Skipped label marker instruction`);
          this.pc++;
          break;

        default:
          throw new Error(`Execution Exception: Unknown instruction opcode '${instr.op}'`);
      }
    } catch (err: any) {
      this.terminated = true;
      const exMsg = `FATAL ERROR: ${err.message || err}`;
      this.logs.push(exMsg);
      const state = this.getState();
      state.exception = exMsg;
      return state;
    }

    if (this.pc >= this.instructions.length) {
      this.terminated = true;
      this.logs.push("VM: Program counter reached end of bytecodes. Finished.");
    }

    return this.getState();
  }

  /**
   * Helper to execute all remaining instructions until termination
   */
  public runComplete(): VmState {
    while (!this.terminated) {
      this.step();
    }
    return this.getState();
  }
}
