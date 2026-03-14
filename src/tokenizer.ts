import { XprError } from "./errors.js";

export enum TokenType {
  Number = "Number",
  String = "String",
  Boolean = "Boolean",
  Null = "Null",
  TemplateLiteral = "TemplateLiteral",
  TemplateHead = "TemplateHead",
  TemplateMiddle = "TemplateMiddle",
  TemplateTail = "TemplateTail",
  Identifier = "Identifier",
  Let = "Let",
  Semicolon = "Semicolon",
  DotDotDot = "DotDotDot",
  Equal = "Equal",
  Plus = "Plus",
  Minus = "Minus",
  Star = "Star",
  Slash = "Slash",
  Percent = "Percent",
  StarStar = "StarStar",
  EqualEqual = "EqualEqual",
  BangEqual = "BangEqual",
  Less = "Less",
  Greater = "Greater",
  LessEqual = "LessEqual",
  GreaterEqual = "GreaterEqual",
  AmpAmp = "AmpAmp",
  PipePipe = "PipePipe",
  Bang = "Bang",
  QuestionQuestion = "QuestionQuestion",
  QuestionDot = "QuestionDot",
  PipeGreater = "PipeGreater",
  Arrow = "Arrow",
  Question = "Question",
  Colon = "Colon",
  Comma = "Comma",
  Dot = "Dot",
  LeftParen = "LeftParen",
  RightParen = "RightParen",
  LeftBracket = "LeftBracket",
  RightBracket = "RightBracket",
  LeftBrace = "LeftBrace",
  RightBrace = "RightBrace",
  Regex = "Regex",
  EOF = "EOF",
}

export interface Token {
  type: TokenType;
  value: string;
  position: number;
}

function tok(type: TokenType, value: string, position: number): Token {
  return { type, value, position };
}

function processEscape(ch: string): string {
  switch (ch) {
    case "n": return "\n";
    case "t": return "\t";
    case "r": return "\r";
    case "0": return "\0";
    case "\\": return "\\";
    case "'": return "'";
    case '"': return '"';
    default: return ch;
  }
}

const REGEX_AFTER: Set<TokenType> = new Set([
  TokenType.Equal, TokenType.EqualEqual, TokenType.BangEqual,
  TokenType.LeftParen, TokenType.LeftBracket, TokenType.LeftBrace,
  TokenType.Comma, TokenType.Semicolon, TokenType.Question, TokenType.Colon,
  TokenType.PipeGreater, TokenType.Arrow, TokenType.AmpAmp, TokenType.PipePipe,
  TokenType.QuestionQuestion, TokenType.Bang, TokenType.Plus, TokenType.Minus,
  TokenType.Star, TokenType.Slash, TokenType.Percent, TokenType.StarStar,
  TokenType.Less, TokenType.Greater, TokenType.LessEqual, TokenType.GreaterEqual,
  TokenType.DotDotDot, TokenType.Let,
]);

export function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  let pos = 0;
  let lastType: TokenType | null = null;

  function peek(offset = 0): string {
    return input[pos + offset] ?? "";
  }

  function advance(): string {
    return input[pos++] ?? "";
  }

  function readString(quote: string, start: number): Token {
    let value = "";
    while (pos < input.length) {
      const ch = advance();
      if (ch === quote) return tok(TokenType.String, value, start);
      if (ch === "\n") throw new XprError(`Unterminated string at position ${start}`, start);
      if (ch === "\\") {
        const esc = advance();
        value += processEscape(esc);
      } else {
        value += ch;
      }
    }
    throw new XprError(`Unterminated string at position ${start}`, start);
  }

  function readTemplateContent(): { content: string; ended: boolean; interpolation: boolean } {
    let content = "";
    while (pos < input.length) {
      const ch = peek();
      if (ch === "`") {
        advance();
        return { content, ended: true, interpolation: false };
      }
      if (ch === "$" && peek(1) === "{") {
        advance(); advance();
        return { content, ended: false, interpolation: true };
      }
      if (ch === "\\") {
        advance();
        const next = peek();
        if (next === "$" || next === "`" || next === "\\") {
          content += advance();
        } else {
          content += processEscape(advance());
        }
      } else {
        content += advance();
      }
    }
    throw new XprError(`Unterminated template literal`, pos);
  }

  function readTemplate(start: number): void {
    const first = readTemplateContent();
    if (first.ended) {
      tokens.push(tok(TokenType.TemplateLiteral, first.content, start));
      return;
    }
    tokens.push(tok(TokenType.TemplateHead, first.content, start));
    let depth = 1;
    while (depth > 0 && pos < input.length) {
      const innerTokens = tokenizeSegment();
      tokens.push(...innerTokens);
      depth = 0;
    }
    while (true) {
      const part = readTemplateContent();
      if (part.ended) {
        tokens.push(tok(TokenType.TemplateTail, part.content, pos));
        break;
      }
      tokens.push(tok(TokenType.TemplateMiddle, part.content, pos));
      const innerTokens = tokenizeSegment();
      tokens.push(...innerTokens);
    }
  }

  function tokenizeSegment(): Token[] {
    const segTokens: Token[] = [];
    let depth = 1;
    while (pos < input.length && depth > 0) {
      const ch = peek();
      if (ch === "{") { depth++; advance(); const t = tok(TokenType.LeftBrace, "{", pos - 1); segTokens.push(t); lastType = t.type; continue; }
      if (ch === "}") {
        depth--;
        if (depth === 0) { advance(); break; }
        advance();
        const t = tok(TokenType.RightBrace, "}", pos - 1);
        segTokens.push(t);
        lastType = t.type;
        continue;
      }
      const saved = pos;
      const t = nextToken();
      if (t !== null) { segTokens.push(t); lastType = t.type; }
      else if (pos === saved) { advance(); }
    }
    return segTokens;
  }

  function readRegex(start: number): Token {
    let pattern = "";
    let inClass = false;
    while (pos < input.length) {
      const ch = advance();
      if (ch === "\n") throw new XprError(`Unterminated regex literal at position ${start}`, start);
      if (ch === "\\") {
        const esc = advance();
        pattern += "\\" + esc;
        continue;
      }
      if (ch === "[") { inClass = true; pattern += ch; continue; }
      if (ch === "]") { inClass = false; pattern += ch; continue; }
      if (ch === "/" && !inClass) {
        let flags = "";
        while (pos < input.length && /[imsgu]/.test(peek())) flags += advance();
        return tok(TokenType.Regex, pattern + "/" + flags, start);
      }
      pattern += ch;
    }
    throw new XprError(`Unterminated regex literal at position ${start}`, start);
  }

  function nextToken(): Token | null {
    while (pos < input.length && /\s/.test(peek())) advance();
    if (pos >= input.length) return null;

    const start = pos;
    const ch = peek();

    if (/[0-9]/.test(ch)) {
      let num = "";
      while (pos < input.length && /[0-9]/.test(peek())) num += advance();
      if (peek() === "." && /[0-9]/.test(peek(1))) {
        num += advance();
        while (pos < input.length && /[0-9]/.test(peek())) num += advance();
      }
      if (peek() === "e" || peek() === "E") {
        num += advance();
        if (peek() === "+" || peek() === "-") num += advance();
        while (pos < input.length && /[0-9]/.test(peek())) num += advance();
      }
      return tok(TokenType.Number, num, start);
    }

    if (ch === '"' || ch === "'") {
      advance();
      return readString(ch, start);
    }

    if (ch === "`") {
      advance();
      readTemplate(start);
      return null;
    }

    if (/[a-zA-Z_]/.test(ch)) {
      let id = "";
      while (pos < input.length && /[a-zA-Z0-9_]/.test(peek())) id += advance();
      if (id === "true" || id === "false") return tok(TokenType.Boolean, id, start);
      if (id === "null") return tok(TokenType.Null, id, start);
      if (id === "let") return tok(TokenType.Let, id, start);
      return tok(TokenType.Identifier, id, start);
    }

    if (ch === "." && peek(1) === "." && peek(2) === ".") { advance(); advance(); advance(); return tok(TokenType.DotDotDot, "...", start); }
    if (ch === "*" && peek(1) === "*") { advance(); advance(); return tok(TokenType.StarStar, "**", start); }
    if (ch === "=" && peek(1) === "=") { advance(); advance(); return tok(TokenType.EqualEqual, "==", start); }
    if (ch === "!" && peek(1) === "=") { advance(); advance(); return tok(TokenType.BangEqual, "!=", start); }
    if (ch === "<" && peek(1) === "=") { advance(); advance(); return tok(TokenType.LessEqual, "<=", start); }
    if (ch === ">" && peek(1) === "=") { advance(); advance(); return tok(TokenType.GreaterEqual, ">=", start); }
    if (ch === "&" && peek(1) === "&") { advance(); advance(); return tok(TokenType.AmpAmp, "&&", start); }
    if (ch === "|" && peek(1) === "|") { advance(); advance(); return tok(TokenType.PipePipe, "||", start); }
    if (ch === "?" && peek(1) === "?") { advance(); advance(); return tok(TokenType.QuestionQuestion, "??", start); }
    if (ch === "?" && peek(1) === ".") { advance(); advance(); return tok(TokenType.QuestionDot, "?.", start); }
    if (ch === "|" && peek(1) === ">") { advance(); advance(); return tok(TokenType.PipeGreater, "|>", start); }
    if (ch === "=" && peek(1) === ">") { advance(); advance(); return tok(TokenType.Arrow, "=>", start); }
    if (ch === "=") { advance(); return tok(TokenType.Equal, "=", start); }

    advance();
    switch (ch) {
      case "+": return tok(TokenType.Plus, "+", start);
      case "-": return tok(TokenType.Minus, "-", start);
      case "*": return tok(TokenType.Star, "*", start);
      case "/": {
        if (lastType === null || REGEX_AFTER.has(lastType)) return readRegex(start);
        return tok(TokenType.Slash, "/", start);
      }
      case "%": return tok(TokenType.Percent, "%", start);
      case "!": return tok(TokenType.Bang, "!", start);
      case "<": return tok(TokenType.Less, "<", start);
      case ">": return tok(TokenType.Greater, ">", start);
      case "?": return tok(TokenType.Question, "?", start);
      case ":": return tok(TokenType.Colon, ":", start);
      case ",": return tok(TokenType.Comma, ",", start);
      case ".": return tok(TokenType.Dot, ".", start);
      case "(": return tok(TokenType.LeftParen, "(", start);
      case ")": return tok(TokenType.RightParen, ")", start);
      case "[": return tok(TokenType.LeftBracket, "[", start);
      case "]": return tok(TokenType.RightBracket, "]", start);
      case "{": return tok(TokenType.LeftBrace, "{", start);
      case "}": return tok(TokenType.RightBrace, "}", start);
      case ";": return tok(TokenType.Semicolon, ";", start);
      default:
        throw new XprError(`Unexpected character '${ch}' at position ${start}`, start);
    }
  }

  while (pos < input.length) {
    while (pos < input.length && /\s/.test(peek())) advance();
    if (pos >= input.length) break;
    const t = nextToken();
    if (t !== null) {
      tokens.push(t);
      lastType = t.type;
    }
  }

  tokens.push(tok(TokenType.EOF, "", pos));
  return tokens;
}
