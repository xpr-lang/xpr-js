import { describe, it, expect } from "bun:test";
import { tokenize } from "../src/tokenizer";
import { parse } from "../src/parser";
import type { Expression, BinaryExpression, UnaryExpression, LogicalExpression, ConditionalExpression, MemberExpression, CallExpression, ArrowFunction, PipeExpression, ArrayExpression, ObjectExpression, TemplateLiteral } from "../src/types";

function p(src: string): Expression {
  return parse(tokenize(src));
}

describe("parser", () => {
  it("parses number literal", () => {
    const ast = p("42");
    expect(ast.type).toBe("NumberLiteral");
    expect((ast as any).value).toBe(42);
  });

  it("parses string literal", () => {
    const ast = p('"hello"');
    expect(ast.type).toBe("StringLiteral");
    expect((ast as any).value).toBe("hello");
  });

  it("parses boolean literal", () => {
    expect(p("true")).toMatchObject({ type: "BooleanLiteral", value: true });
    expect(p("false")).toMatchObject({ type: "BooleanLiteral", value: false });
  });

  it("parses null literal", () => {
    expect(p("null")).toMatchObject({ type: "NullLiteral" });
  });

  it("parses identifier", () => {
    expect(p("foo")).toMatchObject({ type: "Identifier", name: "foo" });
  });

  it("precedence: * binds tighter than +", () => {
    const ast = p("2 + 3 * 4") as BinaryExpression;
    expect(ast.type).toBe("BinaryExpression");
    expect(ast.op).toBe("+");
    expect(ast.left).toMatchObject({ type: "NumberLiteral", value: 2 });
    const right = ast.right as BinaryExpression;
    expect(right.op).toBe("*");
    expect(right.left).toMatchObject({ type: "NumberLiteral", value: 3 });
    expect(right.right).toMatchObject({ type: "NumberLiteral", value: 4 });
  });

  it("grouping overrides precedence: (2 + 3) * 4", () => {
    const ast = p("(2 + 3) * 4") as BinaryExpression;
    expect(ast.op).toBe("*");
    const left = ast.left as BinaryExpression;
    expect(left.op).toBe("+");
  });

  it("right-associative exponentiation: 2 ** 3 ** 2 = 2 ** (3 ** 2)", () => {
    const ast = p("2 ** 3 ** 2") as BinaryExpression;
    expect(ast.op).toBe("**");
    expect(ast.left).toMatchObject({ type: "NumberLiteral", value: 2 });
    const right = ast.right as BinaryExpression;
    expect(right.op).toBe("**");
    expect(right.left).toMatchObject({ type: "NumberLiteral", value: 3 });
    expect(right.right).toMatchObject({ type: "NumberLiteral", value: 2 });
  });

  it("left-associative subtraction: 10 - 3 - 2 = (10 - 3) - 2", () => {
    const ast = p("10 - 3 - 2") as BinaryExpression;
    expect(ast.op).toBe("-");
    const left = ast.left as BinaryExpression;
    expect(left.op).toBe("-");
    expect(left.left).toMatchObject({ type: "NumberLiteral", value: 10 });
    expect(left.right).toMatchObject({ type: "NumberLiteral", value: 3 });
    expect(ast.right).toMatchObject({ type: "NumberLiteral", value: 2 });
  });

  it("unary minus", () => {
    const ast = p("-5") as UnaryExpression;
    expect(ast.type).toBe("UnaryExpression");
    expect(ast.op).toBe("-");
    expect(ast.argument).toMatchObject({ type: "NumberLiteral", value: 5 });
  });

  it("unary not", () => {
    const ast = p("!true") as UnaryExpression;
    expect(ast.op).toBe("!");
    expect(ast.argument).toMatchObject({ type: "BooleanLiteral", value: true });
  });

  it("logical AND", () => {
    const ast = p("a && b") as LogicalExpression;
    expect(ast.type).toBe("LogicalExpression");
    expect(ast.op).toBe("&&");
  });

  it("logical OR", () => {
    const ast = p("a || b") as LogicalExpression;
    expect(ast.op).toBe("||");
  });

  it("nullish coalescing", () => {
    const ast = p("a ?? b") as LogicalExpression;
    expect(ast.op).toBe("??");
  });

  it("ternary conditional", () => {
    const ast = p("a ? b : c") as ConditionalExpression;
    expect(ast.type).toBe("ConditionalExpression");
    expect(ast.test).toMatchObject({ type: "Identifier", name: "a" });
    expect(ast.consequent).toMatchObject({ type: "Identifier", name: "b" });
    expect(ast.alternate).toMatchObject({ type: "Identifier", name: "c" });
  });

  it("right-associative ternary: a ? b : c ? d : e", () => {
    const ast = p("a ? b : c ? d : e") as ConditionalExpression;
    expect(ast.type).toBe("ConditionalExpression");
    expect(ast.test).toMatchObject({ name: "a" });
    expect(ast.consequent).toMatchObject({ name: "b" });
    const alt = ast.alternate as ConditionalExpression;
    expect(alt.type).toBe("ConditionalExpression");
    expect(alt.test).toMatchObject({ name: "c" });
  });

  it("dot member access: a.b", () => {
    const ast = p("a.b") as MemberExpression;
    expect(ast.type).toBe("MemberExpression");
    expect(ast.computed).toBe(false);
    expect(ast.optional).toBe(false);
    expect(ast.property).toBe("b");
  });

  it("chained member access: a.b.c", () => {
    const ast = p("a.b.c") as MemberExpression;
    expect(ast.property).toBe("c");
    const obj = ast.object as MemberExpression;
    expect(obj.property).toBe("b");
    expect(obj.object).toMatchObject({ name: "a" });
  });

  it("optional chaining: a?.b", () => {
    const ast = p("a?.b") as MemberExpression;
    expect(ast.optional).toBe(true);
    expect(ast.property).toBe("b");
  });

  it("computed member access: a[0]", () => {
    const ast = p("a[0]") as MemberExpression;
    expect(ast.computed).toBe(true);
    expect(ast.property).toMatchObject({ type: "NumberLiteral", value: 0 });
  });

  it("function call: f(1, 2)", () => {
    const ast = p("f(1, 2)") as CallExpression;
    expect(ast.type).toBe("CallExpression");
    expect(ast.callee).toMatchObject({ name: "f" });
    expect(ast.arguments).toHaveLength(2);
    expect(ast.optional).toBe(false);
  });

  it("method call: obj.method(arg)", () => {
    const ast = p("obj.method(arg)") as CallExpression;
    expect(ast.type).toBe("CallExpression");
    const callee = ast.callee as MemberExpression;
    expect(callee.property).toBe("method");
  });

  it("arrow function single param: x => x * 2", () => {
    const ast = p("x => x * 2") as ArrowFunction;
    expect(ast.type).toBe("ArrowFunction");
    expect(ast.params).toEqual(["x"]);
    const body = ast.body as BinaryExpression;
    expect(body.op).toBe("*");
  });

  it("arrow function multi-param: (a, b) => a + b", () => {
    const ast = p("(a, b) => a + b") as ArrowFunction;
    expect(ast.type).toBe("ArrowFunction");
    expect(ast.params).toEqual(["a", "b"]);
  });

  it("grouped expression is not arrow function: (1 + 2)", () => {
    const ast = p("(1 + 2)") as BinaryExpression;
    expect(ast.type).toBe("BinaryExpression");
    expect(ast.op).toBe("+");
  });

  it("pipe operator: x |> f", () => {
    const ast = p("x |> f") as PipeExpression;
    expect(ast.type).toBe("PipeExpression");
    expect(ast.left).toMatchObject({ name: "x" });
    expect(ast.right).toMatchObject({ name: "f" });
  });

  it("pipe is left-associative: x |> f |> g", () => {
    const ast = p("x |> f |> g") as PipeExpression;
    expect(ast.type).toBe("PipeExpression");
    expect(ast.right).toMatchObject({ name: "g" });
    const left = ast.left as PipeExpression;
    expect(left.type).toBe("PipeExpression");
    expect(left.left).toMatchObject({ name: "x" });
    expect(left.right).toMatchObject({ name: "f" });
  });

  it("pipe has lower precedence than +: 1 + 2 |> string", () => {
    const ast = p("1 + 2 |> string") as PipeExpression;
    expect(ast.type).toBe("PipeExpression");
    const left = ast.left as BinaryExpression;
    expect(left.op).toBe("+");
  });

  it("array literal: [1, 2, 3]", () => {
    const ast = p("[1, 2, 3]") as ArrayExpression;
    expect(ast.type).toBe("ArrayExpression");
    expect(ast.elements).toHaveLength(3);
  });

  it("empty array: []", () => {
    const ast = p("[]") as ArrayExpression;
    expect(ast.type).toBe("ArrayExpression");
    expect(ast.elements).toHaveLength(0);
  });

  it("object literal: {a: 1, b: 2}", () => {
    const ast = p('{"a": 1, "b": 2}') as ObjectExpression;
    expect(ast.type).toBe("ObjectExpression");
    expect(ast.properties).toHaveLength(2);
    expect(ast.properties[0].key).toBe("a");
  });

  it("template literal no interpolation", () => {
    const ast = p("`hello`") as TemplateLiteral;
    expect(ast.type).toBe("TemplateLiteral");
    expect(ast.quasis).toEqual(["hello"]);
    expect(ast.expressions).toHaveLength(0);
  });

  it("template literal with interpolation", () => {
    const ast = p("`Hello ${name}`") as TemplateLiteral;
    expect(ast.type).toBe("TemplateLiteral");
    expect(ast.quasis).toHaveLength(2);
    expect(ast.quasis[0]).toBe("Hello ");
    expect(ast.expressions).toHaveLength(1);
    expect(ast.expressions[0]).toMatchObject({ name: "name" });
  });

  it("complex: items.filter(x => x > 5).map(x => x * 2)", () => {
    const ast = p("items.filter(x => x > 5).map(x => x * 2)") as CallExpression;
    expect(ast.type).toBe("CallExpression");
    const callee = ast.callee as MemberExpression;
    expect(callee.property).toBe("map");
    const filterCall = callee.object as CallExpression;
    expect(filterCall.type).toBe("CallExpression");
    const filterCallee = filterCall.callee as MemberExpression;
    expect(filterCallee.property).toBe("filter");
  });

  it("error: empty expression throws", () => {
    expect(() => p("")).toThrow();
  });

  it("error: incomplete expression throws", () => {
    expect(() => p("1 +")).toThrow();
  });

  it("error: unmatched paren throws", () => {
    expect(() => p("(1 + 2")).toThrow();
  });
});
