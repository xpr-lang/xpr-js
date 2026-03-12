// Base position type (character offset for error reporting)
export type Position = number;

// ── Literals (6) ──────────────────────────────
export interface NumberLiteral { type: "NumberLiteral"; value: number; position: Position }
export interface StringLiteral { type: "StringLiteral"; value: string; position: Position }
export interface BooleanLiteral { type: "BooleanLiteral"; value: boolean; position: Position }
export interface NullLiteral { type: "NullLiteral"; position: Position }
export interface ArrayExpression { type: "ArrayExpression"; elements: Expression[]; position: Position }
export interface ObjectExpression { type: "ObjectExpression"; properties: Property[]; position: Position }

// ── Access (2) ────────────────────────────────
export interface Identifier { type: "Identifier"; name: string; position: Position }
export interface MemberExpression {
  type: "MemberExpression";
  object: Expression;
  property: string | Expression;
  computed: boolean;
  optional: boolean;
  position: Position;
}

// ── Operators (3) ─────────────────────────────
export type BinaryOp = "+" | "-" | "*" | "/" | "%" | "**" | "==" | "!=" | "<" | ">" | "<=" | ">=";
export interface BinaryExpression {
  type: "BinaryExpression";
  op: BinaryOp;
  left: Expression;
  right: Expression;
  position: Position;
}

export type LogicalOp = "&&" | "||" | "??";
export interface LogicalExpression {
  type: "LogicalExpression";
  op: LogicalOp;
  left: Expression;
  right: Expression;
  position: Position;
}

export type UnaryOp = "!" | "-";
export interface UnaryExpression {
  type: "UnaryExpression";
  op: UnaryOp;
  argument: Expression;
  position: Position;
}

// ── Control (1) ───────────────────────────────
export interface ConditionalExpression {
  type: "ConditionalExpression";
  test: Expression;
  consequent: Expression;
  alternate: Expression;
  position: Position;
}

// ── Functions (2) ─────────────────────────────
export interface ArrowFunction {
  type: "ArrowFunction";
  params: string[];
  body: Expression;
  position: Position;
}

export interface CallExpression {
  type: "CallExpression";
  callee: Expression;
  arguments: Expression[];
  optional: boolean;
  position: Position;
}

// ── Template (1) ──────────────────────────────
export interface TemplateLiteral {
  type: "TemplateLiteral";
  quasis: string[];
  expressions: Expression[];
  position: Position;
}

// ── Pipe (1) ──────────────────────────────────
export interface PipeExpression {
  type: "PipeExpression";
  left: Expression;
  right: Expression;
  position: Position;
}

// ── Spread (1) — defined but NOT used in v0.1 ─
export interface SpreadElement {
  type: "SpreadElement";
  argument: Expression;
  position: Position;
}

// ── Helper types ──────────────────────────────
export interface Property {
  key: string;
  value: Expression;
  position: Position;
}

// Union of all expression types
export type Expression =
  | NumberLiteral
  | StringLiteral
  | BooleanLiteral
  | NullLiteral
  | ArrayExpression
  | ObjectExpression
  | Identifier
  | MemberExpression
  | BinaryExpression
  | LogicalExpression
  | UnaryExpression
  | ConditionalExpression
  | ArrowFunction
  | CallExpression
  | TemplateLiteral
  | PipeExpression
  | SpreadElement;
