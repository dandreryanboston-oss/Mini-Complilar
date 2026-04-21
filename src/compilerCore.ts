/**
 * Mini Compiler Core - TypeScript Port
 * This allows the application to run entirely in the browser,
 * making it compatible with static hosting services like Netlify.
 */

/**
 * Preprocessor for Natural Language Math Expressions (Spanish & English)
 */
export class MathPreprocessor {
  private static readonly NUMBERS: Record<string, number> = {
    // Spanish
    "cero": 0, "uno": 1, "dos": 2, "tres": 3, "cuatro": 4, "cinco": 5,
    "seis": 6, "siete": 7, "ocho": 8, "nueve": 9, "diez": 10,
    "once": 11, "doce": 12, "trece": 13, "catorce": 14, "quince": 15,
    "dieciséis": 16, "diecisiete": 17, "dieciocho": 18, "diecinueve": 19,
    "veinte": 20, "veintiuno": 21, "veintidós": 22, "veintitrés": 23,
    "veinticuatro": 24, "veinticinco": 25, "veintiséis": 26, "veintisiete": 27,
    "veintiocho": 28, "veintinueve": 29, "treinta": 30, "cuarenta": 40,
    "cincuenta": 50, "sesenta": 60, "setenta": 70, "ochenta": 80, "noventa": 90,
    "cien": 100, "ciento": 100, "mil": 1000,
    // English
    "zero": 0, "one": 1, "two": 2, "three": 3, "four": 4, "five": 5,
    "six": 6, "seven": 7, "eight": 8, "nine": 9, "ten": 10,
    "eleven": 11, "twelve": 12, "thirteen": 13, "fourteen": 14, "fifteen": 15,
    "sixteen": 16, "seventeen": 17, "eighteen": 18, "nineteen": 19,
    "twenty": 20, "thirty": 30, "forty": 40, "fifty": 50, "sixty": 60,
    "seventy": 70, "eighty": 80, "ninety": 90, "hundred": 100, "thousand": 1000
  };

  private static readonly OPERATORS: Record<string, string> = {
    // Spanish
    "más": "+", "sumado": "+", "menos": "-", "restado": "-",
    "por": "*", "multiplicado": "*", "entre": "/", "dividido": "/",
    "potencia": "^", "elevado": "^",
    // English
    "plus": "+", "minus": "-", "times": "*", "divided": "/",
    "over": "/", "power": "^", "raised": "^", "multiplied": "*"
  };

  public static convert(text: string): string {
    // 1. Extract strings to placeholders to protect them from processing
    const strings: string[] = [];
    let processed = text.replace(/"([^"\\]*(?:\\.[^"\\]*)*)"/g, (match) => {
      strings.push(match);
      return `__STR${strings.length - 1}__`;
    });

    processed = processed.toLowerCase().trim();
    
    // 2. Handle "parentheses" phrases
    let wrapInParens = false;
    if (processed.includes("entre paréntesis") || processed.includes("in parentheses")) {
      wrapInParens = true;
      processed = processed.replace("entre paréntesis", "").replace("in parentheses", "");
    }

    // Pad symbols with spaces to ensure they are split correctly from words
    processed = processed.replace(/([\(\)\+\-\*\/\^])/g, " $1 ");

    // 3. Handle multi-word operators and common phrases (ES & EN)
    processed = processed.replace(/dividido entre/g, " / ");
    processed = processed.replace(/divided by/g, " / ");
    processed = processed.replace(/multiplicado por/g, " * ");
    processed = processed.replace(/multiplied by/g, " * ");
    processed = processed.replace(/sumado a/g, " + ");
    processed = processed.replace(/added to/g, " + ");
    processed = processed.replace(/restado a/g, " - ");
    processed = processed.replace(/subtracted from/g, " - ");
    
    // Powers
    processed = processed.replace(/elevado al cuadrado/g, " ^ 2 ");
    processed = processed.replace(/elevado al cubo/g, " ^ 3 ");
    processed = processed.replace(/al cuadrado/g, " ^ 2 ");
    processed = processed.replace(/al cubo/g, " ^ 3 ");
    processed = processed.replace(/squared/g, " ^ 2 ");
    processed = processed.replace(/cubed/g, " ^ 3 ");

    // 4. Handle "a la ... potencia" / "raised to the ... power"
    processed = processed.replace(/(?:a la|elevado a la|raised to the|to the power of) (\w+)(?: potencia| power)?/g, (match, p1) => {
      const num = this.NUMBERS[p1];
      return `^ ${num !== undefined ? num : p1}`;
    });

    const words = processed.split(/\s+/);
    const result: string[] = [];
    
    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      if (!word) continue;
      
      // Check for multi-word numbers
      // Spanish: "sesenta y siete"
      if (i + 2 < words.length && words[i+1] === "y" && this.NUMBERS[words[i]] !== undefined && this.NUMBERS[words[i+2]] !== undefined) {
        const val = this.NUMBERS[words[i]] + this.NUMBERS[words[i+2]];
        result.push(val.toString());
        i += 2;
        continue;
      }
      // English: "twenty five" (simple space concatenation)
      if (i + 1 < words.length && this.NUMBERS[words[i]] !== undefined && this.NUMBERS[words[i+1]] !== undefined && this.NUMBERS[words[i]] >= 20 && this.NUMBERS[words[i]] < 100 && this.NUMBERS[words[i+1]] < 10) {
        const val = this.NUMBERS[words[i]] + this.NUMBERS[words[i+1]];
        result.push(val.toString());
        i += 1;
        continue;
      }

      if (this.NUMBERS[word] !== undefined) {
        result.push(this.NUMBERS[word].toString());
      } else if (this.OPERATORS[word]) {
        result.push(this.OPERATORS[word]);
      } else if (!["y", "and", "a", "la", "al", "the", "by", "of", "to"].includes(word)) {
        result.push(word);
      }
    }

    let final = result.join(" ");
    if (wrapInParens) final = `(${final})`;

    // 5. Restore strings
    final = final.replace(/__str(\d+)__/gi, (match, p1) => {
      return strings[parseInt(p1)];
    });

    return final.trim();
  }
}

export enum TokenType {
  NUMBER = "NUMBER",
  VARIABLE = "VARIABLE",
  STRING = "STRING",
  PLUS = "PLUS",
  MINUS = "MINUS",
  MUL = "MUL",
  DIV = "DIV",
  POW = "POW",
  LPAREN = "LPAREN",
  RPAREN = "RPAREN",
  EOF = "EOF",
}

export interface Token {
  type: TokenType;
  value: any;
}

/**
 * DFA for Token Classification and Validation
 */
export class DFA {
  private state: string = "START";

  public transition(char: string | null): string {
    if (char === null) return "EOF";

    switch (this.state) {
      case "START":
        if (/\s/.test(char)) return "START";
        if (/[0-9]/.test(char)) { this.state = "NUMBER"; return "NUMBER"; }
        if (/[a-zA-Z]/.test(char)) { this.state = "VARIABLE"; return "VARIABLE"; }
        if (char === '"') { this.state = "STRING"; return "STRING"; }
        if (char === '+') return "PLUS";
        if (char === '-') return "MINUS";
        if (char === '*') return "MUL";
        if (char === '/') return "DIV";
        if (char === '^') return "POW";
        if (char === '(') return "LPAREN";
        if (char === ')') return "RPAREN";
        return "ERROR";

      case "NUMBER":
        if (/[0-9]/.test(char) || char === '.') return "NUMBER";
        this.state = "START";
        return this.transition(char);

      case "VARIABLE":
        if (/[a-zA-Z0-9]/.test(char)) return "VARIABLE";
        this.state = "START";
        return this.transition(char);

      case "STRING":
        if (char === '"') { this.state = "START"; return "STRING_END"; }
        return "STRING";

      default:
        this.state = "START";
        return this.transition(char);
    }
  }

  public reset() {
    this.state = "START";
  }
}

export class Lexer {
  private text: string;
  private pos: number = 0;
  private currentChar: string | null = null;
  private dfa: DFA = new DFA();

  constructor(text: string) {
    this.text = text;
    this.currentChar = this.text.length > 0 ? this.text[0] : null;
  }

  private advance() {
    this.pos++;
    this.currentChar = this.pos < this.text.length ? this.text[this.pos] : null;
  }

  private skipWhitespace() {
    while (this.currentChar !== null && /\s/.test(this.currentChar)) {
      this.advance();
    }
  }

  private number(): Token {
    let result = "";
    while (this.currentChar !== null && (/[0-9]/.test(this.currentChar) || this.currentChar === '.')) {
      result += this.currentChar;
      this.advance();
    }
    return { 
      type: TokenType.NUMBER, 
      value: result.includes('.') ? parseFloat(result) : parseInt(result, 10) 
    };
  }

  private identifier(): Token {
    let result = "";
    while (this.currentChar !== null && /[a-zA-Z0-9]/.test(this.currentChar)) {
      result += this.currentChar;
      this.advance();
    }
    return { type: TokenType.VARIABLE, value: result };
  }

  private stringLiteral(): Token {
    this.advance(); // Skip opening quote
    let result = "";
    while (this.currentChar !== null && this.currentChar !== '"') {
      const current: string = this.currentChar;
      if (current === '\\') {
        this.advance();
        const escaped: string | null = this.currentChar;
        if (escaped === 'n') result += '\n';
        else if (escaped === 't') result += '\t';
        else if (escaped === '"') result += '"';
        else if (escaped === '\\') result += '\\';
        else if (escaped !== null) result += escaped;
      } else {
        result += current;
      }
      this.advance();
    }
    if (this.currentChar === '"') {
      this.advance(); // Skip closing quote
    } else {
      throw new Error("Lexical Error: Unterminated string literal");
    }
    return { type: TokenType.STRING, value: result };
  }

  public getNextToken(): Token {
    while (this.currentChar !== null) {
      if (/\s/.test(this.currentChar)) {
        this.skipWhitespace();
        continue;
      }

      if (/[0-9]/.test(this.currentChar) || this.currentChar === '.') {
        return this.number();
      }

      if (/[a-zA-Z]/.test(this.currentChar)) {
        return this.identifier();
      }

      if (this.currentChar === '"') {
        return this.stringLiteral();
      }

      const char = this.currentChar;
      this.advance();

      switch (char) {
        case '+': return { type: TokenType.PLUS, value: '+' };
        case '-': return { type: TokenType.MINUS, value: '-' };
        case '*': return { type: TokenType.MUL, value: '*' };
        case '/': return { type: TokenType.DIV, value: '/' };
        case '^': return { type: TokenType.POW, value: '^' };
        case '(': return { type: TokenType.LPAREN, value: '(' };
        case ')': return { type: TokenType.RPAREN, value: ')' };
        default:
          throw new Error(`Lexical Error: Invalid character '${char}' at position ${this.pos - 1}`);
      }
    }

    return { type: TokenType.EOF, value: null };
  }

  public tokenize(): Token[] {
    const tokens: Token[] = [];
    let token = this.getNextToken();
    while (token.type !== TokenType.EOF) {
      tokens.push(token);
      token = this.getNextToken();
    }
    return tokens;
  }
}

export type ASTNode = 
  | { type: "NumberNode"; value: number }
  | { type: "VariableNode"; name: string }
  | { type: "StringNode"; value: string }
  | { type: "BinOpNode"; op: string; left: ASTNode; right: ASTNode }
  | { type: "UnaryOpNode"; op: string; node: ASTNode };

export class Parser {
  private lexer: Lexer;
  private currentToken: Token;

  constructor(lexer: Lexer) {
    this.lexer = lexer;
    this.currentToken = this.lexer.getNextToken();
  }

  private error(message: string) {
    throw new Error(`Syntax Error: ${message}`);
  }

  private eat(tokenType: TokenType) {
    if (this.currentToken.type === tokenType) {
      this.currentToken = this.lexer.getNextToken();
    } else {
      this.error(`Expected ${tokenType}, but found ${this.currentToken.type}`);
    }
  }

  private atom(): ASTNode {
    const token = this.currentToken;
    if (token.type === TokenType.NUMBER) {
      this.eat(TokenType.NUMBER);
      return { type: "NumberNode", value: token.value };
    } else if (token.type === TokenType.VARIABLE) {
      this.eat(TokenType.VARIABLE);
      return { type: "VariableNode", name: token.value };
    } else if (token.type === TokenType.STRING) {
      this.eat(TokenType.STRING);
      return { type: "StringNode", value: token.value };
    } else if (token.type === TokenType.LPAREN) {
      this.eat(TokenType.LPAREN);
      const node = this.expr();
      this.eat(TokenType.RPAREN);
      return node;
    }
    this.error(`Unexpected token ${token.type}`);
    return null as any;
  }

  private power(): ASTNode {
    let node = this.atom();
    if (this.currentToken.type === TokenType.POW) {
      this.eat(TokenType.POW);
      node = {
        type: "BinOpNode",
        op: "^",
        left: node,
        right: this.factor() // Right-associative
      };
    }
    return node;
  }

  private factor(): ASTNode {
    const token = this.currentToken;
    if (token.type === TokenType.PLUS) {
      this.eat(TokenType.PLUS);
      return { type: "UnaryOpNode", op: "+", node: this.factor() };
    } else if (token.type === TokenType.MINUS) {
      this.eat(TokenType.MINUS);
      return { type: "UnaryOpNode", op: "-", node: this.factor() };
    }
    return this.power();
  }

  private term(): ASTNode {
    let node = this.factor();
    while (
      this.currentToken.type === TokenType.MUL || 
      this.currentToken.type === TokenType.DIV ||
      this.currentToken.type === TokenType.LPAREN ||
      this.currentToken.type === TokenType.VARIABLE ||
      this.currentToken.type === TokenType.NUMBER
    ) {
      if (this.currentToken.type === TokenType.MUL) {
        this.eat(TokenType.MUL);
        node = { type: "BinOpNode", op: "*", left: node, right: this.factor() };
      } else if (this.currentToken.type === TokenType.DIV) {
        this.eat(TokenType.DIV);
        node = { type: "BinOpNode", op: "/", left: node, right: this.factor() };
      } else {
        // Implicit multiplication (e.g., 3x, (x+1)(x-1))
        node = { type: "BinOpNode", op: "*", left: node, right: this.factor() };
      }
    }
    return node;
  }

  private expr(): ASTNode {
    let node = this.term();
    while (this.currentToken.type === TokenType.PLUS || this.currentToken.type === TokenType.MINUS) {
      const op = this.currentToken.value;
      this.eat(this.currentToken.type);
      node = { type: "BinOpNode", op: op, left: node, right: this.term() };
    }
    return node;
  }

  public parse(): ASTNode {
    const node = this.expr();
    if (this.currentToken.type !== TokenType.EOF) {
      this.error("End of expression expected");
    }
    return node;
  }
}

export class Evaluator {
  public evaluate(node: ASTNode, context: Record<string, any> = { x: 0, y: 0 }): any {
    switch (node.type) {
      case "NumberNode":
        return node.value;
      case "VariableNode":
        if (node.name in context) return context[node.name];
        throw new Error(`Semantic Error: Variable '${node.name}' not defined`);
      case "StringNode":
        return node.value;
      case "UnaryOpNode":
        const val = this.evaluate(node.node, context);
        if (node.op === "+") return val;
        if (node.op === "-") return -val;
        return val;
      case "BinOpNode":
        const left = this.evaluate(node.left, context);
        const right = this.evaluate(node.right, context);

        if (typeof left === "string" || typeof right === "string") {
          if (node.op === "+") return String(left) + String(right);
          throw new Error(`Semantic Error: Operator '${node.op}' not supported for strings`);
        }

        switch (node.op) {
          case "+": return left + right;
          case "-": return left - right;
          case "*": return left * right;
          case "/":
            if (right === 0) throw new Error("Semantic Error: Division by zero");
            return left / right;
          case "^": return Math.pow(left, right);
          default: throw new Error(`Evaluation Error: Unknown operator ${node.op}`);
        }
    }
  }

  /**
   * Simplifies a polynomial expression (basic implementation)
   */
  public simplify(node: ASTNode): string {
    // This is a placeholder for a more complex symbolic simplification
    // For now, we'll just return a string representation
    return this.stringify(node);
  }

  private stringify(node: ASTNode): string {
    switch (node.type) {
      case "NumberNode": return node.value.toString();
      case "VariableNode": return node.name;
      case "StringNode": return `"${node.value}"`;
      case "UnaryOpNode": return `${node.op}${this.stringify(node.node)}`;
      case "BinOpNode":
        return `(${this.stringify(node.left)} ${node.op} ${this.stringify(node.right)})`;
    }
  }
}

