/**
 * Mini Compiler Core - TypeScript Port
 * This allows the application to run entirely in the browser,
 * making it compatible with static hosting services like Netlify.
 */

export enum TokenType {
  NUMBER = "NUMBER",
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

export class Lexer {
  private text: string;
  private pos: number = 0;
  private currentChar: string | null = null;

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
    if (result.includes('.')) {
      return { type: TokenType.NUMBER, value: parseFloat(result) };
    }
    return { type: TokenType.NUMBER, value: parseInt(result, 10) };
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

      if (this.currentChar === '+') {
        this.advance();
        return { type: TokenType.PLUS, value: '+' };
      }

      if (this.currentChar === '-') {
        this.advance();
        return { type: TokenType.MINUS, value: '-' };
      }

      if (this.currentChar === '*') {
        this.advance();
        return { type: TokenType.MUL, value: '*' };
      }

      if (this.currentChar === '/') {
        this.advance();
        return { type: TokenType.DIV, value: '/' };
      }

      if (this.currentChar === '^') {
        this.advance();
        return { type: TokenType.POW, value: '^' };
      }

      if (this.currentChar === '(') {
        this.advance();
        return { type: TokenType.LPAREN, value: '(' };
      }

      if (this.currentChar === ')') {
        this.advance();
        return { type: TokenType.RPAREN, value: ')' };
      }

      throw new Error(`Lexical Error: Invalid character '${this.currentChar}' at position ${this.pos}`);
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

export interface ASTNode {
  type: "NumberNode" | "BinOpNode";
  value?: number;
  op?: string;
  left?: ASTNode;
  right?: ASTNode;
}

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

  private power(): ASTNode {
    const token = this.currentToken;
    if (token.type === TokenType.NUMBER) {
      this.eat(TokenType.NUMBER);
      return { type: "NumberNode", value: token.value };
    } else if (token.type === TokenType.LPAREN) {
      this.eat(TokenType.LPAREN);
      const node = this.expr();
      this.eat(TokenType.RPAREN);
      return node;
    }
    this.error(`Unexpected token ${token.type}`);
    return null as any;
  }

  private factor(): ASTNode {
    let node = this.power();
    if (this.currentToken.type === TokenType.POW) {
      const op = this.currentToken.value;
      this.eat(TokenType.POW);
      node = {
        type: "BinOpNode",
        op: op,
        left: node,
        right: this.factor() // Right-associative
      };
    }
    return node;
  }

  private term(): ASTNode {
    let node = this.factor();
    while (this.currentToken.type === TokenType.MUL || this.currentToken.type === TokenType.DIV) {
      const token = this.currentToken;
      if (token.type === TokenType.MUL) {
        this.eat(TokenType.MUL);
      } else if (token.type === TokenType.DIV) {
        this.eat(TokenType.DIV);
      }
      node = {
        type: "BinOpNode",
        op: token.value,
        left: node,
        right: this.factor()
      };
    }
    return node;
  }

  private expr(): ASTNode {
    let node = this.term();
    while (this.currentToken.type === TokenType.PLUS || this.currentToken.type === TokenType.MINUS) {
      const token = this.currentToken;
      if (token.type === TokenType.PLUS) {
        this.eat(TokenType.PLUS);
      } else if (token.type === TokenType.MINUS) {
        this.eat(TokenType.MINUS);
      }
      node = {
        type: "BinOpNode",
        op: token.value,
        left: node,
        right: this.term()
      };
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
  public evaluate(node: ASTNode): number {
    if (node.type === "NumberNode") {
      return node.value!;
    }

    if (node.type === "BinOpNode") {
      const leftVal = this.evaluate(node.left!);
      const rightVal = this.evaluate(node.right!);

      switch (node.op) {
        case "+": return leftVal + rightVal;
        case "-": return leftVal - rightVal;
        case "*": return leftVal * rightVal;
        case "/":
          if (rightVal === 0) throw new Error("Semantic Error: Division by zero");
          return leftVal / rightVal;
        case "^": return Math.pow(leftVal, rightVal);
        default: throw new Error(`Evaluation Error: Unknown operator ${node.op}`);
      }
    }

    throw new Error("Evaluation Error: Unknown node type");
  }
}
