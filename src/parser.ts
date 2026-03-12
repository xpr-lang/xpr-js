import { XprError } from "./errors.js";
import { TokenType, type Token } from "./tokenizer.js";
import type {
  Expression, NumberLiteral, StringLiteral, BooleanLiteral, NullLiteral,
  ArrayExpression, ObjectExpression, Identifier, MemberExpression,
  BinaryExpression, BinaryOp, LogicalExpression, LogicalOp, UnaryExpression, UnaryOp,
  ConditionalExpression, ArrowFunction, CallExpression, TemplateLiteral,
  PipeExpression, Property,
} from "./types.js";

const BP_PIPE = 10;
const BP_TERNARY = 20;
const BP_NULLISH = 30;
const BP_OR = 40;
const BP_AND = 50;
const BP_EQUALITY = 60;
const BP_COMPARE = 70;
const BP_ADD = 80;
const BP_MUL = 90;
const BP_EXP = 100;
const BP_UNARY = 110;
const BP_POSTFIX = 120;

function leftBP(t: Token): number {
  switch (t.type) {
    case TokenType.PipeGreater: return BP_PIPE;
    case TokenType.Question: return BP_TERNARY;
    case TokenType.QuestionQuestion: return BP_NULLISH;
    case TokenType.PipePipe: return BP_OR;
    case TokenType.AmpAmp: return BP_AND;
    case TokenType.EqualEqual: case TokenType.BangEqual: return BP_EQUALITY;
    case TokenType.Less: case TokenType.Greater:
    case TokenType.LessEqual: case TokenType.GreaterEqual: return BP_COMPARE;
    case TokenType.Plus: case TokenType.Minus: return BP_ADD;
    case TokenType.Star: case TokenType.Slash: case TokenType.Percent: return BP_MUL;
    case TokenType.StarStar: return BP_EXP;
    case TokenType.Dot: case TokenType.QuestionDot:
    case TokenType.LeftBracket: case TokenType.LeftParen: return BP_POSTFIX;
    default: return 0;
  }
}

class Parser {
  private pos = 0;

  constructor(private tokens: Token[]) {}

  private peek(): Token {
    return this.tokens[this.pos] ?? { type: TokenType.EOF, value: "", position: -1 };
  }

  private advance(): Token {
    const t = this.tokens[this.pos];
    if (t && t.type !== TokenType.EOF) this.pos++;
    return t ?? { type: TokenType.EOF, value: "", position: -1 };
  }

  private expect(type: TokenType): Token {
    const t = this.peek();
    if (t.type !== type) {
      throw new XprError(`Expected ${type} but got ${t.type} at position ${t.position}`, t.position);
    }
    return this.advance();
  }

  private nud(token: Token): Expression {
    const pos = token.position;

    switch (token.type) {
      case TokenType.Number:
        return { type: "NumberLiteral", value: parseFloat(token.value), position: pos } as NumberLiteral;

      case TokenType.String:
        return { type: "StringLiteral", value: token.value, position: pos } as StringLiteral;

      case TokenType.Boolean:
        return { type: "BooleanLiteral", value: token.value === "true", position: pos } as BooleanLiteral;

      case TokenType.Null:
        return { type: "NullLiteral", position: pos } as NullLiteral;

      case TokenType.TemplateLiteral:
        return { type: "TemplateLiteral", quasis: [token.value], expressions: [], position: pos } as TemplateLiteral;

      case TokenType.TemplateHead: {
        const quasis: string[] = [token.value];
        const expressions: Expression[] = [];
        while (true) {
          expressions.push(this.expression(0));
          const next = this.peek();
          if (next.type === TokenType.TemplateTail) {
            quasis.push(this.advance().value);
            break;
          } else if (next.type === TokenType.TemplateMiddle) {
            quasis.push(this.advance().value);
          } else {
            throw new XprError(`Unexpected token in template literal at position ${next.position}`, next.position);
          }
        }
        return { type: "TemplateLiteral", quasis, expressions, position: pos } as TemplateLiteral;
      }

      case TokenType.Identifier: {
        const id: Identifier = { type: "Identifier", name: token.value, position: pos };
        if (this.peek().type === TokenType.Arrow) {
          this.advance();
          const body = this.expression(0);
          return { type: "ArrowFunction", params: [token.value], body, position: pos } as ArrowFunction;
        }
        return id;
      }

      case TokenType.LeftParen: {
        if (this.peek().type === TokenType.RightParen) {
          this.advance();
          this.expect(TokenType.Arrow);
          const body = this.expression(0);
          return { type: "ArrowFunction", params: [], body, position: pos } as ArrowFunction;
        }
        const first = this.expression(0);
        if (this.peek().type === TokenType.Comma) {
          const params: string[] = [];
          if (first.type !== "Identifier") throw new XprError(`Arrow function params must be identifiers at position ${pos}`, pos);
          params.push(first.name);
          while (this.peek().type === TokenType.Comma) {
            this.advance();
            const p = this.expect(TokenType.Identifier);
            params.push(p.value);
          }
          this.expect(TokenType.RightParen);
          this.expect(TokenType.Arrow);
          const body = this.expression(0);
          return { type: "ArrowFunction", params, body, position: pos } as ArrowFunction;
        }
        this.expect(TokenType.RightParen);
        if (first.type === "Identifier" && this.peek().type === TokenType.Arrow) {
          this.advance();
          const body = this.expression(0);
          return { type: "ArrowFunction", params: [first.name], body, position: pos } as ArrowFunction;
        }
        return first;
      }

      case TokenType.LeftBracket: {
        const elements: Expression[] = [];
        while (this.peek().type !== TokenType.RightBracket && this.peek().type !== TokenType.EOF) {
          elements.push(this.expression(0));
          if (this.peek().type === TokenType.Comma) this.advance();
          else break;
        }
        this.expect(TokenType.RightBracket);
        return { type: "ArrayExpression", elements, position: pos } as ArrayExpression;
      }

      case TokenType.LeftBrace: {
        const properties: Property[] = [];
        while (this.peek().type !== TokenType.RightBrace && this.peek().type !== TokenType.EOF) {
          const keyTok = this.peek();
          let key: string;
          if (keyTok.type === TokenType.Identifier) {
            key = this.advance().value;
          } else if (keyTok.type === TokenType.String) {
            key = this.advance().value;
          } else {
            throw new XprError(`Expected object key at position ${keyTok.position}`, keyTok.position);
          }
          this.expect(TokenType.Colon);
          const value = this.expression(0);
          properties.push({ key, value, position: keyTok.position });
          if (this.peek().type === TokenType.Comma) this.advance();
          else break;
        }
        this.expect(TokenType.RightBrace);
        return { type: "ObjectExpression", properties, position: pos } as ObjectExpression;
      }

      case TokenType.Bang: {
        const arg = this.expression(BP_UNARY);
        return { type: "UnaryExpression", op: "!" as UnaryOp, argument: arg, position: pos } as UnaryExpression;
      }

      case TokenType.Minus: {
        const arg = this.expression(BP_UNARY);
        return { type: "UnaryExpression", op: "-" as UnaryOp, argument: arg, position: pos } as UnaryExpression;
      }

      default:
        throw new XprError(`Unexpected token ${token.type} ('${token.value}') at position ${pos}`, pos);
    }
  }

  private led(left: Expression, token: Token): Expression {
    const pos = token.position;

    switch (token.type) {
      case TokenType.Plus:
      case TokenType.Minus: {
        const right = this.expression(BP_ADD);
        return { type: "BinaryExpression", op: token.value as BinaryOp, left, right, position: pos } as BinaryExpression;
      }

      case TokenType.Star:
      case TokenType.Slash:
      case TokenType.Percent: {
        const right = this.expression(BP_MUL);
        return { type: "BinaryExpression", op: token.value as BinaryOp, left, right, position: pos } as BinaryExpression;
      }

      case TokenType.StarStar: {
        const right = this.expression(BP_EXP - 1);
        return { type: "BinaryExpression", op: "**" as BinaryOp, left, right, position: pos } as BinaryExpression;
      }

      case TokenType.EqualEqual:
      case TokenType.BangEqual: {
        const right = this.expression(BP_EQUALITY);
        return { type: "BinaryExpression", op: token.value as BinaryOp, left, right, position: pos } as BinaryExpression;
      }

      case TokenType.Less:
      case TokenType.Greater:
      case TokenType.LessEqual:
      case TokenType.GreaterEqual: {
        const right = this.expression(BP_COMPARE);
        return { type: "BinaryExpression", op: token.value as BinaryOp, left, right, position: pos } as BinaryExpression;
      }

      case TokenType.AmpAmp: {
        const right = this.expression(BP_AND);
        return { type: "LogicalExpression", op: "&&" as LogicalOp, left, right, position: pos } as LogicalExpression;
      }

      case TokenType.PipePipe: {
        const right = this.expression(BP_OR);
        return { type: "LogicalExpression", op: "||" as LogicalOp, left, right, position: pos } as LogicalExpression;
      }

      case TokenType.QuestionQuestion: {
        const right = this.expression(BP_NULLISH);
        return { type: "LogicalExpression", op: "??" as LogicalOp, left, right, position: pos } as LogicalExpression;
      }

      case TokenType.Dot: {
        const prop = this.expect(TokenType.Identifier);
        return { type: "MemberExpression", object: left, property: prop.value, computed: false, optional: false, position: pos } as MemberExpression;
      }

      case TokenType.QuestionDot: {
        if (this.peek().type === TokenType.LeftParen) {
          this.advance();
          const args = this.parseArgList();
          this.expect(TokenType.RightParen);
          return { type: "CallExpression", callee: left, arguments: args, optional: true, position: pos } as CallExpression;
        }
        const prop = this.expect(TokenType.Identifier);
        return { type: "MemberExpression", object: left, property: prop.value, computed: false, optional: true, position: pos } as MemberExpression;
      }

      case TokenType.LeftBracket: {
        const index = this.expression(0);
        this.expect(TokenType.RightBracket);
        return { type: "MemberExpression", object: left, property: index, computed: true, optional: false, position: pos } as MemberExpression;
      }

      case TokenType.LeftParen: {
        const args = this.parseArgList();
        this.expect(TokenType.RightParen);
        return { type: "CallExpression", callee: left, arguments: args, optional: false, position: pos } as CallExpression;
      }

      case TokenType.PipeGreater: {
        const right = this.expression(BP_PIPE);
        return { type: "PipeExpression", left, right, position: pos } as PipeExpression;
      }

      case TokenType.Question: {
        const consequent = this.expression(0);
        this.expect(TokenType.Colon);
        const alternate = this.expression(BP_TERNARY - 1);
        return { type: "ConditionalExpression", test: left, consequent, alternate, position: pos } as ConditionalExpression;
      }

      default:
        throw new XprError(`Unexpected infix token ${token.type} at position ${pos}`, pos);
    }
  }

  private parseArgList(): Expression[] {
    const args: Expression[] = [];
    while (this.peek().type !== TokenType.RightParen && this.peek().type !== TokenType.EOF) {
      args.push(this.expression(0));
      if (this.peek().type === TokenType.Comma) this.advance();
      else break;
    }
    return args;
  }

  expression(rbp: number): Expression {
    const token = this.advance();
    if (token.type === TokenType.EOF) {
      throw new XprError(`Unexpected end of expression`, token.position);
    }
    let left = this.nud(token);
    while (rbp < leftBP(this.peek())) {
      const op = this.advance();
      left = this.led(left, op);
    }
    return left;
  }

  parse(): Expression {
    if (this.peek().type === TokenType.EOF) {
      throw new XprError(`Empty expression`, 0);
    }
    const expr = this.expression(0);
    if (this.peek().type !== TokenType.EOF) {
      const t = this.peek();
      throw new XprError(`Unexpected token ${t.type} at position ${t.position}`, t.position);
    }
    return expr;
  }
}

export function parse(tokens: Token[]): Expression {
  return new Parser(tokens).parse();
}
