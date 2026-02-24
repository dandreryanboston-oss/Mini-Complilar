import sys
import json
import math

# -----------------------------------------------------------------------------
# 1. LEXICAL ANALYZER
# -----------------------------------------------------------------------------

class TokenType:
    NUMBER = "NUMBER"
    PLUS   = "PLUS"
    MINUS  = "MINUS"
    MUL    = "MUL"
    DIV    = "DIV"
    POW    = "POW"
    LPAREN = "LPAREN"
    RPAREN = "RPAREN"
    EOF    = "EOF"

class Token:
    def __init__(self, type, value=None):
        self.type = type
        self.value = value

    def __repr__(self):
        if self.value is not None:
            return f"Token({self.type}, {self.value})"
        return f"Token({self.type})"

    def to_dict(self):
        return {"type": self.type, "value": self.value}

class Lexer:
    def __init__(self, text):
        self.text = text
        self.pos = 0
        self.current_char = self.text[self.pos] if self.text else None

    def advance(self):
        self.pos += 1
        self.current_char = self.text[self.pos] if self.pos < len(self.text) else None

    def skip_whitespace(self):
        while self.current_char is not None and self.current_char.isspace():
            self.advance()

    def number(self):
        result = ""
        while self.current_char is not None and (self.current_char.isdigit() or self.current_char == '.'):
            result += self.current_char
            self.advance()
        if '.' in result:
            return Token(TokenType.NUMBER, float(result))
        return Token(TokenType.NUMBER, int(result))

    def get_next_token(self):
        while self.current_char is not None:
            if self.current_char.isspace():
                self.skip_whitespace()
                continue

            if self.current_char.isdigit() or self.current_char == '.':
                return self.number()

            if self.current_char == '+':
                self.advance()
                return Token(TokenType.PLUS, '+')

            if self.current_char == '-':
                self.advance()
                return Token(TokenType.MINUS, '-')

            if self.current_char == '*':
                self.advance()
                return Token(TokenType.MUL, '*')

            if self.current_char == '/':
                self.advance()
                return Token(TokenType.DIV, '/')

            if self.current_char == '^':
                self.advance()
                return Token(TokenType.POW, '^')

            if self.current_char == '(':
                self.advance()
                return Token(TokenType.LPAREN, '(')

            if self.current_char == ')':
                self.advance()
                return Token(TokenType.RPAREN, ')')

            raise Exception(f"Lexical Error: Invalid character '{self.current_char}' at position {self.pos}")

        return Token(TokenType.EOF)

    def tokenize(self):
        tokens = []
        token = self.get_next_token()
        while token.type != TokenType.EOF:
            tokens.append(token)
            token = self.get_next_token()
        return tokens

# -----------------------------------------------------------------------------
# 2. AST NODES
# -----------------------------------------------------------------------------

class ASTNode:
    def to_dict(self):
        raise NotImplementedError()

class NumberNode(ASTNode):
    def __init__(self, token):
        self.token = token
        self.value = token.value

    def to_dict(self):
        return {"type": "NumberNode", "value": self.value}

class BinOpNode(ASTNode):
    def __init__(self, left, op_token, right):
        self.left = left
        self.op_token = op_token
        self.right = right

    def to_dict(self):
        return {
            "type": "BinOpNode",
            "op": self.op_token.value,
            "left": self.left.to_dict(),
            "right": self.right.to_dict()
        }

# -----------------------------------------------------------------------------
# 3. SYNTAX ANALYZER (Parser)
# -----------------------------------------------------------------------------

class Parser:
    def __init__(self, lexer):
        self.lexer = lexer
        self.current_token = self.lexer.get_next_token()

    def error(self, message):
        raise Exception(f"Syntax Error: {message}")

    def eat(self, token_type):
        if self.current_token.type == token_type:
            self.current_token = self.lexer.get_next_token()
        else:
            self.error(f"Expected {token_type}, but found {self.current_token.type}")

    def power(self):
        """
        Power : NUMBER | LPAREN Expression RPAREN
        """
        token = self.current_token
        if token.type == TokenType.NUMBER:
            self.eat(TokenType.NUMBER)
            return NumberNode(token)
        elif token.type == TokenType.LPAREN:
            self.eat(TokenType.LPAREN)
            node = self.expr()
            self.eat(TokenType.RPAREN)
            return node
        self.error(f"Unexpected token {token.type}")

    def factor(self):
        """
        Factor : Power (POW Factor)*
        Note: Exponentiation is right-associative.
        """
        node = self.power()
        if self.current_token.type == TokenType.POW:
            op = self.current_token
            self.eat(TokenType.POW)
            node = BinOpNode(left=node, op_token=op, right=self.factor())
        return node

    def term(self):
        """
        Term : Factor ( ((MUL | DIV) Factor) | Factor )*
        The second 'Factor' case handles implicit multiplication.
        """
        node = self.factor()
        while self.current_token.type in (TokenType.MUL, TokenType.DIV, TokenType.LPAREN, TokenType.NUMBER):
            token = self.current_token
            if token.type == TokenType.MUL:
                self.eat(TokenType.MUL)
                node = BinOpNode(left=node, op_token=token, right=self.factor())
            elif token.type == TokenType.DIV:
                self.eat(TokenType.DIV)
                node = BinOpNode(left=node, op_token=token, right=self.factor())
            elif token.type in (TokenType.LPAREN, TokenType.NUMBER):
                # Implicit multiplication
                virtual_op = Token(TokenType.MUL, '*')
                node = BinOpNode(left=node, op_token=virtual_op, right=self.factor())
        return node

    def expr(self):
        """
        Expression : Term ((PLUS | MINUS) Term)*
        """
        node = self.term()
        while self.current_token.type in (TokenType.PLUS, TokenType.MINUS):
            token = self.current_token
            if token.type == TokenType.PLUS:
                self.eat(TokenType.PLUS)
            elif token.type == TokenType.MINUS:
                self.eat(TokenType.MINUS)
            node = BinOpNode(left=node, op_token=token, right=self.term())
        return node

    def parse(self):
        node = self.expr()
        if self.current_token.type != TokenType.EOF:
            self.error("End of expression expected")
        return node

# -----------------------------------------------------------------------------
# 4. SEMANTIC EVALUATION
# -----------------------------------------------------------------------------

class Evaluator:
    def evaluate(self, node):
        if isinstance(node, NumberNode):
            return node.value
        
        if isinstance(node, BinOpNode):
            left_val = self.evaluate(node.left)
            right_val = self.evaluate(node.right)
            
            op = node.op_token.type
            if op == TokenType.PLUS:
                return left_val + right_val
            elif op == TokenType.MINUS:
                return left_val - right_val
            elif op == TokenType.MUL:
                return left_val * right_val
            elif op == TokenType.DIV:
                if right_val == 0:
                    raise Exception("Semantic Error: Division by zero")
                return left_val / right_val
            elif op == TokenType.POW:
                return math.pow(left_val, right_val)
        
        raise Exception("Evaluation Error: Unknown node type")

# -----------------------------------------------------------------------------
# UTILS & MAIN
# -----------------------------------------------------------------------------

def print_tree(node, indent=""):
    if isinstance(node, NumberNode):
        print(f"{indent}Number({node.value})")
    elif isinstance(node, BinOpNode):
        print(f"{indent}Op({node.op_token.value})")
        print_tree(node.left, indent + "  ")
        print_tree(node.right, indent + "  ")

def main():
    # Academic test expressions
    test_expressions = [
        "3 + 5 * (10 / 2)",
        "2 ^ 3 ^ 2",
        "(10 + 2) * 3 - 4 / 2"
    ]

    # Check if we are being called via CLI or with an argument
    if len(sys.argv) > 1:
        input_expr = sys.argv[1]
        
        # Check for JSON output mode (used by web app)
        json_mode = "--json" in sys.argv
        if json_mode:
            input_expr = input_expr.replace("--json", "").strip()
    else:
        print("-" * 50)
        print("MINI COMPILER FOR MATHEMATICAL EXPRESSIONS")
        print("-" * 50)
        print("Test Expressions:")
        for i, te in enumerate(test_expressions):
            print(f"{i+1}. {te}")
        print("-" * 50)
        input_expr = input(input("Enter a mathematical expression: ") or test_expressions[0])

    try:
        # 1. Lexical Analysis
        lexer = Lexer(input_expr)
        tokens = lexer.tokenize()
        
        # 2. Syntax Analysis & AST Construction
        lexer_for_parser = Lexer(input_expr)
        parser = Parser(lexer_for_parser)
        ast = parser.parse()
        
        # 3. Semantic Evaluation
        evaluator = Evaluator()
        result = evaluator.evaluate(ast)

        if len(sys.argv) > 1 and "--json" in sys.argv:
            # Output for Web App
            output = {
                "tokens": [t.to_dict() for t in tokens],
                "ast": ast.to_dict(),
                "result": result
            }
            print(json.dumps(output))
        else:
            # Output for Terminal
            print("\n[1] LEXICAL ANALYSIS: TOKENS")
            for t in tokens:
                print(f"  {t}")

            print("\n[2] SYNTAX ANALYSIS: PARSE TREE (AST)")
            print_tree(ast)

            print("\n[3] SEMANTIC EVALUATION: RESULT")
            print(f"  Final Result: {result}")

    except Exception as e:
        if len(sys.argv) > 1 and "--json" in sys.argv:
            print(json.dumps({"error": str(e)}))
        else:
            print(f"\nERROR: {e}")

if __name__ == "__main__":
    main()
