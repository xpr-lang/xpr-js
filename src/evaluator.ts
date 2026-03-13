import { XprError } from "./errors.js";
import type { Expression } from "./types.js";
import {
  xprType, isTruthy,
  callStringMethod, callArrayMethod, callObjectMethod,
  GLOBAL_FUNCTIONS,
} from "./functions.js";

const GLOBAL_FUNCTION_ARITY: Record<string, number> = {
  round: 1, floor: 1, ceil: 1, abs: 1,
  min: 2, max: 2,
  type: 1, int: 1, float: 1, string: 1, bool: 1,
};

const BLOCKED_PROPS = new Set(["__proto__", "constructor", "prototype", "__defineGetter__", "__defineSetter__", "__lookupGetter__", "__lookupSetter__"]);
const MAX_DEPTH = 50;

function dispatchMethodOrError(obj: unknown, method: string, args: unknown[], pos: number): unknown {
  if (typeof obj === "string") return callStringMethod(obj, method, args, pos);
  if (Array.isArray(obj)) return callArrayMethod(obj, method, args, pos);
  if (obj !== null && typeof obj === "object") return callObjectMethod(obj, method, args, pos);
  throw new XprError(`Pipe RHS '${method}' is not callable on ${xprType(obj)}`, pos);
}

type Context = Record<string, unknown>;
type FnMap = Map<string, (...args: unknown[]) => unknown>;

export function evalExpr(
  node: Expression,
  ctx: Context,
  fns: FnMap,
  depth = 0,
  startTime = Date.now()
): unknown {
  if (depth > MAX_DEPTH) throw new XprError(`Expression depth limit exceeded`, node.position);
  if (Date.now() - startTime > 100) throw new XprError(`Expression timeout exceeded`);

  const next = (n: Expression) => evalExpr(n, ctx, fns, depth + 1, startTime);

  switch (node.type) {
    case "NumberLiteral": return node.value;
    case "StringLiteral": return node.value;
    case "BooleanLiteral": return node.value;
    case "NullLiteral": return null;

    case "ArrayExpression": {
      const result: unknown[] = [];
      for (const el of node.elements) {
        if (el.type === "SpreadElement") {
          const val = next(el.argument);
          if (val === null) throw new XprError(`Cannot spread null`, el.position);
          if (typeof val === "string") throw new XprError(`Cannot spread string into array`, el.position);
          if (!Array.isArray(val)) throw new XprError(`Cannot spread non-array into array`, el.position);
          result.push(...val);
        } else {
          result.push(next(el));
        }
      }
      return result;
    }

    case "ObjectExpression": {
      const obj: Record<string, unknown> = {};
      for (const prop of node.properties) {
        if (prop.type === "SpreadProperty") {
          const val = next(prop.argument);
          if (val === null) throw new XprError(`Cannot spread null`, prop.position);
          if (Array.isArray(val)) throw new XprError(`Cannot spread array into object`, prop.position);
          if (typeof val !== "object") throw new XprError(`Cannot spread non-object`, prop.position);
          Object.assign(obj, val as Record<string, unknown>);
        } else {
          obj[prop.key] = next(prop.value);
        }
      }
      return obj;
    }

    case "Identifier": {
      if (node.name in ctx) return ctx[node.name];
      if (GLOBAL_FUNCTIONS[node.name]) return GLOBAL_FUNCTIONS[node.name];
      if (fns.has(node.name)) return fns.get(node.name);
      throw new XprError(`Unknown function '${node.name}'`, node.position);
    }

    case "MemberExpression": {
      const obj = next(node.object);
      if (node.optional && obj === null) return null;
      if (obj === null) throw new XprError(`Cannot access property on null`, node.position);

      let propName: string;
      if (node.computed) {
        const key = next(node.property as Expression);
        if (typeof key === "number") {
          if (!Array.isArray(obj)) throw new XprError(`Cannot index non-array with number`, node.position);
          if (key < 0) throw new XprError(`negative indexing not supported`, node.position);
          return (obj as unknown[])[key] ?? null;
        }
        propName = String(key);
      } else {
        propName = node.property as string;
      }

      if (BLOCKED_PROPS.has(propName)) {
        throw new XprError(`Access denied: '${propName}' is a restricted property`, node.position);
      }

      if (propName === "length" && Array.isArray(obj)) return (obj as unknown[]).length;

      if (typeof obj === "object" && obj !== null && !Array.isArray(obj)) {
        const rec = obj as Record<string, unknown>;
        return propName in rec ? rec[propName] : null;
      }

      return null;
    }

    case "BinaryExpression": {
      const left = next(node.left);
      const right = next(node.right);
      const op = node.op;

      if (op === "==" ) return left === right;
      if (op === "!=" ) return left !== right;

      if (op === "+" ) {
        if (typeof left === "string" && typeof right === "string") return left + right;
        if (typeof left === "number" && typeof right === "number") return left + right;
        throw new XprError(`Type error: cannot add ${xprType(left)} and ${xprType(right)}`, node.position);
      }

      if (op === "<" || op === ">" || op === "<=" || op === ">=") {
        if (typeof left === "number" && typeof right === "number") {
          if (op === "<") return left < right;
          if (op === ">") return left > right;
          if (op === "<=") return left <= right;
          return left >= right;
        }
        if (typeof left === "string" && typeof right === "string") {
          if (op === "<") return left < right;
          if (op === ">") return left > right;
          if (op === "<=") return left <= right;
          return left >= right;
        }
        throw new XprError(`Type error: cannot compare ${xprType(left)} and ${xprType(right)}`, node.position);
      }

      if (typeof left !== "number" || typeof right !== "number") {
        throw new XprError(`Type error: operator '${op}' requires numbers, got ${xprType(left)} and ${xprType(right)}`, node.position);
      }
      if (op === "-") return left - right;
      if (op === "*") return left * right;
      if (op === "/") {
        if (right === 0) throw new XprError(`Division by zero`, node.position);
        return left / right;
      }
      if (op === "%") {
        if (right === 0) throw new XprError(`Division by zero`, node.position);
        return left % right;
      }
      if (op === "**") return left ** right;
      throw new XprError(`Unknown operator '${op}'`, node.position);
    }

    case "LogicalExpression": {
      const left = next(node.left);
      if (node.op === "&&") return isTruthy(left) ? next(node.right) : left;
      if (node.op === "||") return isTruthy(left) ? left : next(node.right);
      if (node.op === "??") return left !== null ? left : next(node.right);
      throw new XprError(`Unknown logical operator '${node.op}'`, node.position);
    }

    case "UnaryExpression": {
      const arg = next(node.argument);
      if (node.op === "!") return !isTruthy(arg);
      if (node.op === "-") {
        if (typeof arg !== "number") throw new XprError(`Type error: unary minus requires number, got ${xprType(arg)}`, node.position);
        return -arg;
      }
      throw new XprError(`Unknown unary operator '${node.op}'`, node.position);
    }

    case "ConditionalExpression": {
      const test = next(node.test);
      return isTruthy(test) ? next(node.consequent) : next(node.alternate);
    }

    case "ArrowFunction": {
      const params = node.params;
      const body = node.body;
      return (...args: unknown[]) => {
        const childCtx: Context = { ...ctx };
        for (let i = 0; i < params.length; i++) {
          childCtx[params[i]] = args[i] ?? null;
        }
        return evalExpr(body, childCtx, fns, depth + 1, startTime);
      };
    }

    case "CallExpression": {
      const pos = node.position;

      if (node.callee.type === "MemberExpression") {
        const member = node.callee;
        const obj = next(member.object);

        if (member.optional && obj === null) return null;

        const methodName = member.computed
          ? String(next(member.property as Expression))
          : member.property as string;

        if (BLOCKED_PROPS.has(methodName)) {
          throw new XprError(`Access denied: '${methodName}' is a restricted property`, pos);
        }

        const args = node.arguments.map(a => next(a));

        if (typeof obj === "string") return callStringMethod(obj, methodName, args, pos);
        if (Array.isArray(obj)) return callArrayMethod(obj, methodName, args, pos);
        if (obj !== null && typeof obj === "object") return callObjectMethod(obj, methodName, args, pos);

        throw new XprError(`Type error: cannot call method '${methodName}' on ${xprType(obj)}`, pos);
      }

      if (node.callee.type === "Identifier") {
        const name = node.callee.name;
        const args = node.arguments.map(a => next(a));
        if (GLOBAL_FUNCTIONS[name]) {
          const arity = GLOBAL_FUNCTION_ARITY[name];
          if (arity !== undefined && args.length !== arity) {
            throw new XprError(`Wrong number of arguments for '${name}': expected ${arity}, got ${args.length}`, pos);
          }
          return GLOBAL_FUNCTIONS[name](...args);
        }
        if (fns.has(name)) return fns.get(name)!(...args);
        if (name in ctx && typeof ctx[name] === "function") {
          return (ctx[name] as (...a: unknown[]) => unknown)(...args);
        }
        throw new XprError(`Unknown function '${name}'`, pos);
      }

      const callee = next(node.callee);
      if (node.optional && callee === null) return null;

      const args = node.arguments.map(a => next(a));

      if (typeof callee === "function") {
        return (callee as (...a: unknown[]) => unknown)(...args);
      }

      throw new XprError(`Cannot call non-function`, pos);
    }

    case "PipeExpression": {
      const left = next(node.left);
      const right = node.right;

      if (right.type === "CallExpression") {
        const extraArgs = right.arguments.map(a => next(a));
        if (right.callee.type === "Identifier") {
          const name = right.callee.name;
          if (GLOBAL_FUNCTIONS[name]) {
            const arity = GLOBAL_FUNCTION_ARITY[name];
            if (arity !== undefined && extraArgs.length + 1 !== arity) {
              throw new XprError(`Wrong number of arguments for '${name}'`, node.position);
            }
            return GLOBAL_FUNCTIONS[name](left, ...extraArgs);
          }
          if (fns.has(name)) return fns.get(name)!(left, ...extraArgs);
          return dispatchMethodOrError(left, name, extraArgs, node.position);
        }
        const callee = next(right.callee);
        if (typeof callee !== "function") throw new XprError(`Pipe RHS must be callable`, node.position);
        return (callee as (...a: unknown[]) => unknown)(left, ...extraArgs);
      }

      if (right.type === "Identifier") {
        const name = right.name;
        if (GLOBAL_FUNCTIONS[name]) return GLOBAL_FUNCTIONS[name](left);
        if (fns.has(name)) return fns.get(name)!(left);
        return dispatchMethodOrError(left, name, [], node.position);
      }

      throw new XprError(`Pipe RHS must be callable`, node.position);
    }

    case "TemplateLiteral": {
      let result = node.quasis[0];
      for (let i = 0; i < node.expressions.length; i++) {
        const val = next(node.expressions[i]);
        result += val === null ? "null" : String(val);
        result += node.quasis[i + 1] ?? "";
      }
      return result;
    }

    case "LetExpression": {
      const value = next(node.value);
      const childCtx: Context = { ...ctx, [node.name]: value };
      return evalExpr(node.body, childCtx, fns, depth + 1, startTime);
    }

    case "SpreadElement":
      throw new XprError(`Spread element used outside array context`, node.position);

    default: {
      const _exhaustive: never = node;
      throw new XprError(`Unknown AST node type`);
    }
  }
}
