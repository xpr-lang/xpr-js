export class Xpr {
  private _functions: Map<string, (...args: unknown[]) => unknown> = new Map();

  evaluate(expression: string, context: Record<string, unknown> = {}): unknown {
    throw new Error("Not implemented");
  }

  addFunction(name: string, fn: (...args: unknown[]) => unknown): void {
    this._functions.set(name, fn);
  }
}
