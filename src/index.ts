import { tokenize } from "./tokenizer.js";
import { parse } from "./parser.js";
import { evalExpr } from "./evaluator.js";
export { XprError } from "./errors.js";

export class Xpr {
  private _functions: Map<string, (...args: unknown[]) => unknown> = new Map();

  evaluate(expression: string, context: Record<string, unknown> = {}): unknown {
    const tokens = tokenize(expression);
    const ast = parse(tokens);
    return evalExpr(ast, context, this._functions);
  }

  addFunction(name: string, fn: (...args: unknown[]) => unknown): void {
    this._functions.set(name, fn);
  }
}
