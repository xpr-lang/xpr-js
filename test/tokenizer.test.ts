import { describe, it, expect } from "bun:test";
import { tokenize, TokenType, type Token } from "../src/tokenizer";

function types(tokens: Token[]): TokenType[] {
  return tokens.map(t => t.type);
}

function values(tokens: Token[]): string[] {
  return tokens.map(t => t.value);
}

describe("tokenizer", () => {
  it("empty input returns EOF", () => {
    const tokens = tokenize("");
    expect(types(tokens)).toEqual([TokenType.EOF]);
  });

  it("whitespace only returns EOF", () => {
    const tokens = tokenize("   \t\n  ");
    expect(types(tokens)).toEqual([TokenType.EOF]);
  });

  it("integer literal", () => {
    const tokens = tokenize("42");
    expect(types(tokens)).toEqual([TokenType.Number, TokenType.EOF]);
    expect(tokens[0].value).toBe("42");
  });

  it("float literal", () => {
    const tokens = tokenize("3.14");
    expect(types(tokens)).toEqual([TokenType.Number, TokenType.EOF]);
    expect(tokens[0].value).toBe("3.14");
  });

  it("scientific notation", () => {
    const tokens = tokenize("1e10");
    expect(types(tokens)).toEqual([TokenType.Number, TokenType.EOF]);
    expect(tokens[0].value).toBe("1e10");
  });

  it("scientific notation with sign", () => {
    const tokens = tokenize("2.5e-3");
    expect(types(tokens)).toEqual([TokenType.Number, TokenType.EOF]);
    expect(tokens[0].value).toBe("2.5e-3");
  });

  it("double-quoted string", () => {
    const tokens = tokenize('"hello"');
    expect(types(tokens)).toEqual([TokenType.String, TokenType.EOF]);
    expect(tokens[0].value).toBe("hello");
  });

  it("single-quoted string", () => {
    const tokens = tokenize("'world'");
    expect(types(tokens)).toEqual([TokenType.String, TokenType.EOF]);
    expect(tokens[0].value).toBe("world");
  });

  it("string with escape sequences", () => {
    const tokens = tokenize('"line\\nnew"');
    expect(types(tokens)).toEqual([TokenType.String, TokenType.EOF]);
    expect(tokens[0].value).toBe("line\nnew");
  });

  it("string with tab escape", () => {
    const tokens = tokenize('"tab\\there"');
    expect(types(tokens)).toEqual([TokenType.String, TokenType.EOF]);
    expect(tokens[0].value).toBe("tab\there");
  });

  it("string with quote escape", () => {
    const tokens = tokenize('"say \\"hi\\""');
    expect(types(tokens)).toEqual([TokenType.String, TokenType.EOF]);
    expect(tokens[0].value).toBe('say "hi"');
  });

  it("boolean true", () => {
    const tokens = tokenize("true");
    expect(types(tokens)).toEqual([TokenType.Boolean, TokenType.EOF]);
    expect(tokens[0].value).toBe("true");
  });

  it("boolean false", () => {
    const tokens = tokenize("false");
    expect(types(tokens)).toEqual([TokenType.Boolean, TokenType.EOF]);
    expect(tokens[0].value).toBe("false");
  });

  it("null literal", () => {
    const tokens = tokenize("null");
    expect(types(tokens)).toEqual([TokenType.Null, TokenType.EOF]);
    expect(tokens[0].value).toBe("null");
  });

  it("identifier", () => {
    const tokens = tokenize("myVar");
    expect(types(tokens)).toEqual([TokenType.Identifier, TokenType.EOF]);
    expect(tokens[0].value).toBe("myVar");
  });

  it("identifier with underscore", () => {
    const tokens = tokenize("_private");
    expect(types(tokens)).toEqual([TokenType.Identifier, TokenType.EOF]);
    expect(tokens[0].value).toBe("_private");
  });

  it("multi-token expression: 1 + 2", () => {
    const tokens = tokenize("1 + 2");
    expect(types(tokens)).toEqual([TokenType.Number, TokenType.Plus, TokenType.Number, TokenType.EOF]);
    expect(values(tokens)).toEqual(["1", "+", "2", ""]);
  });

  it("exponentiation operator **", () => {
    const tokens = tokenize("2 ** 3");
    expect(types(tokens)).toEqual([TokenType.Number, TokenType.StarStar, TokenType.Number, TokenType.EOF]);
  });

  it("equality operator ==", () => {
    const tokens = tokenize("a == b");
    expect(types(tokens)).toEqual([TokenType.Identifier, TokenType.EqualEqual, TokenType.Identifier, TokenType.EOF]);
  });

  it("inequality operator !=", () => {
    const tokens = tokenize("a != b");
    expect(types(tokens)).toEqual([TokenType.Identifier, TokenType.BangEqual, TokenType.Identifier, TokenType.EOF]);
  });

  it("less-equal operator <=", () => {
    const tokens = tokenize("a <= b");
    expect(types(tokens)).toEqual([TokenType.Identifier, TokenType.LessEqual, TokenType.Identifier, TokenType.EOF]);
  });

  it("greater-equal operator >=", () => {
    const tokens = tokenize("a >= b");
    expect(types(tokens)).toEqual([TokenType.Identifier, TokenType.GreaterEqual, TokenType.Identifier, TokenType.EOF]);
  });

  it("logical AND &&", () => {
    const tokens = tokenize("a && b");
    expect(types(tokens)).toEqual([TokenType.Identifier, TokenType.AmpAmp, TokenType.Identifier, TokenType.EOF]);
  });

  it("logical OR ||", () => {
    const tokens = tokenize("a || b");
    expect(types(tokens)).toEqual([TokenType.Identifier, TokenType.PipePipe, TokenType.Identifier, TokenType.EOF]);
  });

  it("nullish coalescing ??", () => {
    const tokens = tokenize("a ?? b");
    expect(types(tokens)).toEqual([TokenType.Identifier, TokenType.QuestionQuestion, TokenType.Identifier, TokenType.EOF]);
  });

  it("optional chaining ?.", () => {
    const tokens = tokenize("obj?.prop");
    expect(types(tokens)).toEqual([TokenType.Identifier, TokenType.QuestionDot, TokenType.Identifier, TokenType.EOF]);
  });

  it("pipe operator |>", () => {
    const tokens = tokenize("x |> f");
    expect(types(tokens)).toEqual([TokenType.Identifier, TokenType.PipeGreater, TokenType.Identifier, TokenType.EOF]);
  });

  it("arrow operator =>", () => {
    const tokens = tokenize("x => x");
    expect(types(tokens)).toEqual([TokenType.Identifier, TokenType.Arrow, TokenType.Identifier, TokenType.EOF]);
  });

  it("all single-char operators", () => {
    const tokens = tokenize("a / b");
    expect(types(tokens)).toEqual([TokenType.Identifier, TokenType.Slash, TokenType.Identifier, TokenType.EOF]);
  });

  it("all single-char operators non-slash", () => {
    const tokens = tokenize("+ - * % ! < > ? : . , ( ) [ ] { }");
    expect(types(tokens)).toEqual([
      TokenType.Plus, TokenType.Minus, TokenType.Star, TokenType.Percent,
      TokenType.Bang, TokenType.Less, TokenType.Greater, TokenType.Question, TokenType.Colon,
      TokenType.Dot, TokenType.Comma,
      TokenType.LeftParen, TokenType.RightParen,
      TokenType.LeftBracket, TokenType.RightBracket,
      TokenType.LeftBrace, TokenType.RightBrace,
      TokenType.EOF,
    ]);
  });

  it("plain template literal (no interpolation)", () => {
    const tokens = tokenize("`hello`");
    expect(types(tokens)).toEqual([TokenType.TemplateLiteral, TokenType.EOF]);
    expect(tokens[0].value).toBe("hello");
  });

  it("template literal with one interpolation", () => {
    const tokens = tokenize("`Hello ${name}`");
    const tTypes = types(tokens);
    expect(tTypes[0]).toBe(TokenType.TemplateHead);
    expect(tokens[0].value).toBe("Hello ");
    expect(tTypes[tTypes.length - 2]).toBe(TokenType.TemplateTail);
    const nameIdx = tTypes.indexOf(TokenType.Identifier);
    expect(tokens[nameIdx].value).toBe("name");
  });

  it("template literal with two interpolations", () => {
    const tokens = tokenize("`${a} and ${b}`");
    const tTypes = types(tokens);
    expect(tTypes[0]).toBe(TokenType.TemplateHead);
    expect(tokens[0].value).toBe("");
    expect(tTypes.includes(TokenType.TemplateMiddle)).toBe(true);
    expect(tTypes[tTypes.length - 2]).toBe(TokenType.TemplateTail);
  });

  it("token positions are correct", () => {
    const tokens = tokenize("1 + 2");
    expect(tokens[0].position).toBe(0);
    expect(tokens[1].position).toBe(2);
    expect(tokens[2].position).toBe(4);
  });

  it("error: unterminated string throws XprError", () => {
    expect(() => tokenize('"hello')).toThrow("Unterminated string");
  });

  it("error: unknown character throws XprError with position", () => {
    expect(() => tokenize("@")).toThrow("Unexpected character '@'");
  });

  it("complex expression: user.name == 'Alice'", () => {
    const tokens = tokenize("user.name == 'Alice'");
    expect(types(tokens)).toEqual([
      TokenType.Identifier, TokenType.Dot, TokenType.Identifier,
      TokenType.EqualEqual,
      TokenType.String,
      TokenType.EOF,
    ]);
  });

  it("negative number via unary minus", () => {
    const tokens = tokenize("-5");
    expect(types(tokens)).toEqual([TokenType.Minus, TokenType.Number, TokenType.EOF]);
  });
});
