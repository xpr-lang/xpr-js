import { XprError } from "./errors.js";

type XprValue = unknown;
type XprFn = (...args: XprValue[]) => XprValue;

function assertString(v: XprValue, method: string, pos: number): string {
  if (typeof v !== "string") throw new XprError(`Type error: cannot call method '${method}' on ${xprType(v)}`, pos);
  return v;
}

function assertArray(v: XprValue, method: string, pos: number): XprValue[] {
  if (!Array.isArray(v)) throw new XprError(`Type error: cannot call method '${method}' on ${xprType(v)}`, pos);
  return v;
}

function assertObject(v: XprValue, method: string, pos: number): Record<string, XprValue> {
  if (v === null || typeof v !== "object" || Array.isArray(v)) {
    throw new XprError(`Type error: cannot call method '${method}' on ${xprType(v)}`, pos);
  }
  return v as Record<string, XprValue>;
}

export function xprType(v: XprValue): string {
  if (v === null) return "null";
  if (Array.isArray(v)) return "array";
  return typeof v;
}

export function isTruthy(v: XprValue): boolean {
  if (v === false || v === null || v === 0 || v === "") return false;
  return true;
}

export function callStringMethod(obj: XprValue, method: string, args: XprValue[], pos: number): XprValue {
  const s = assertString(obj, method, pos);
  switch (method) {
    case "len": {
      if (args.length !== 0) throw new XprError(`Wrong number of arguments for 'len': expected 0, got ${args.length}`, pos);
      return s.length;
    }
    case "upper": {
      if (args.length !== 0) throw new XprError(`Wrong number of arguments for 'upper': expected 0, got ${args.length}`, pos);
      return s.toUpperCase();
    }
    case "lower": {
      if (args.length !== 0) throw new XprError(`Wrong number of arguments for 'lower': expected 0, got ${args.length}`, pos);
      return s.toLowerCase();
    }
    case "trim": {
      if (args.length !== 0) throw new XprError(`Wrong number of arguments for 'trim': expected 0, got ${args.length}`, pos);
      return s.trim();
    }
    case "startsWith": {
      if (args.length !== 1) throw new XprError(`Wrong number of arguments for 'startsWith': expected 1, got ${args.length}`, pos);
      if (typeof args[0] !== "string") throw new XprError(`Type error: startsWith expects string argument`, pos);
      return s.startsWith(args[0] as string);
    }
    case "endsWith": {
      if (args.length !== 1) throw new XprError(`Wrong number of arguments for 'endsWith': expected 1, got ${args.length}`, pos);
      if (typeof args[0] !== "string") throw new XprError(`Type error: endsWith expects string argument`, pos);
      return s.endsWith(args[0] as string);
    }
    case "contains": {
      if (args.length !== 1) throw new XprError(`Wrong number of arguments for 'contains': expected 1, got ${args.length}`, pos);
      if (typeof args[0] !== "string") throw new XprError(`Type error: contains expects string argument`, pos);
      return s.includes(args[0] as string);
    }
    case "split": {
      if (args.length !== 1) throw new XprError(`Wrong number of arguments for 'split': expected 1, got ${args.length}`, pos);
      if (typeof args[0] !== "string") throw new XprError(`Type error: split expects string argument`, pos);
      return s.split(args[0] as string);
    }
    case "replace": {
      if (args.length !== 2) throw new XprError(`Wrong number of arguments for 'replace': expected 2, got ${args.length}`, pos);
      if (typeof args[0] !== "string" || typeof args[1] !== "string") throw new XprError(`Type error: replace expects string arguments`, pos);
      return s.split(args[0] as string).join(args[1] as string);
    }
    case "slice": {
      if (args.length < 1 || args.length > 2) throw new XprError(`Wrong number of arguments for 'slice': expected 1-2, got ${args.length}`, pos);
      if (typeof args[0] !== "number") throw new XprError(`Type error: slice expects number argument`, pos);
      if (args.length === 2 && typeof args[1] !== "number") throw new XprError(`Type error: slice expects number argument`, pos);
      return args.length === 2 ? s.slice(args[0] as number, args[1] as number) : s.slice(args[0] as number);
    }
    case "indexOf": {
      if (args.length !== 1) throw new XprError(`Wrong number of arguments for 'indexOf': expected 1, got ${args.length}`, pos);
      if (typeof args[0] !== "string") throw new XprError(`Type error: indexOf expects string argument`, pos);
      return s.indexOf(args[0] as string);
    }
    case "repeat": {
      if (args.length !== 1) throw new XprError(`Wrong number of arguments for 'repeat': expected 1, got ${args.length}`, pos);
      if (typeof args[0] !== "number" || !Number.isInteger(args[0]) || (args[0] as number) < 0) {
        throw new XprError(`Type error: repeat expects non-negative integer`, pos);
      }
      return s.repeat(args[0] as number);
    }
    case "trimStart": {
      if (args.length !== 0) throw new XprError(`Wrong number of arguments for 'trimStart': expected 0, got ${args.length}`, pos);
      return s.trimStart();
    }
    case "trimEnd": {
      if (args.length !== 0) throw new XprError(`Wrong number of arguments for 'trimEnd': expected 0, got ${args.length}`, pos);
      return s.trimEnd();
    }
    case "charAt": {
      if (args.length !== 1) throw new XprError(`Wrong number of arguments for 'charAt': expected 1, got ${args.length}`, pos);
      if (typeof args[0] !== "number") throw new XprError(`Type error: charAt expects number argument`, pos);
      return s.charAt(args[0] as number);
    }
    case "padStart": {
      if (args.length < 1 || args.length > 2) throw new XprError(`Wrong number of arguments for 'padStart': expected 1-2, got ${args.length}`, pos);
      if (typeof args[0] !== "number") throw new XprError(`Type error: padStart expects number argument`, pos);
      const padChar = args.length === 2 ? (args[1] as string) : " ";
      if (typeof padChar !== "string") throw new XprError(`Type error: padStart pad character must be string`, pos);
      return s.padStart(args[0] as number, padChar);
    }
    case "padEnd": {
      if (args.length < 1 || args.length > 2) throw new XprError(`Wrong number of arguments for 'padEnd': expected 1-2, got ${args.length}`, pos);
      if (typeof args[0] !== "number") throw new XprError(`Type error: padEnd expects number argument`, pos);
      const padChar = args.length === 2 ? (args[1] as string) : " ";
      if (typeof padChar !== "string") throw new XprError(`Type error: padEnd pad character must be string`, pos);
      return s.padEnd(args[0] as number, padChar);
    }
    default:
      throw new XprError(`Type error: cannot call method '${method}' on string`, pos);
  }
}

export function callArrayMethod(obj: XprValue, method: string, args: XprValue[], pos: number): XprValue {
  const arr = assertArray(obj, method, pos);
  switch (method) {
    case "map": {
      if (args.length !== 1 || typeof args[0] !== "function") throw new XprError(`Wrong number of arguments for 'map': expected 1 function, got ${args.length}`, pos);
      return arr.map(el => (args[0] as XprFn)(el));
    }
    case "filter": {
      if (args.length !== 1 || typeof args[0] !== "function") throw new XprError(`Wrong number of arguments for 'filter': expected 1 function, got ${args.length}`, pos);
      return arr.filter(el => isTruthy((args[0] as XprFn)(el)));
    }
    case "reduce": {
      if (args.length !== 2 || typeof args[0] !== "function") throw new XprError(`Wrong number of arguments for 'reduce': expected 2 args (fn, init), got ${args.length}`, pos);
      return arr.reduce((acc, el) => (args[0] as XprFn)(acc, el), args[1]);
    }
    case "find": {
      if (args.length !== 1 || typeof args[0] !== "function") throw new XprError(`Wrong number of arguments for 'find': expected 1 function, got ${args.length}`, pos);
      return arr.find(el => isTruthy((args[0] as XprFn)(el))) ?? null;
    }
    case "some": {
      if (args.length !== 1 || typeof args[0] !== "function") throw new XprError(`Wrong number of arguments for 'some': expected 1 function, got ${args.length}`, pos);
      return arr.some(el => isTruthy((args[0] as XprFn)(el)));
    }
    case "every": {
      if (args.length !== 1 || typeof args[0] !== "function") throw new XprError(`Wrong number of arguments for 'every': expected 1 function, got ${args.length}`, pos);
      return arr.every(el => isTruthy((args[0] as XprFn)(el)));
    }
    case "flatMap": {
      if (args.length !== 1 || typeof args[0] !== "function") throw new XprError(`Wrong number of arguments for 'flatMap': expected 1 function, got ${args.length}`, pos);
      return arr.flatMap(el => {
        const result = (args[0] as XprFn)(el);
        return Array.isArray(result) ? result : [result];
      });
    }
    case "sort": {
      if (args.length > 1) throw new XprError(`Wrong number of arguments for 'sort': expected 0-1, got ${args.length}`, pos);
      const copy = [...arr];
      if (args.length === 0 || args[0] === null || args[0] === undefined) {
        copy.sort((a, b) => {
          if (typeof a === "number" && typeof b === "number") return a - b;
          return String(a) < String(b) ? -1 : String(a) > String(b) ? 1 : 0;
        });
      } else {
        if (typeof args[0] !== "function") throw new XprError(`Type error: sort expects function argument`, pos);
        copy.sort((a, b) => {
          const result = (args[0] as XprFn)(a, b);
          return typeof result === "number" ? result : 0;
        });
      }
      return copy;
    }
    case "reverse": {
      if (args.length !== 0) throw new XprError(`Wrong number of arguments for 'reverse': expected 0, got ${args.length}`, pos);
      return [...arr].reverse();
    }
    case "includes": {
      if (args.length !== 1) throw new XprError(`Wrong number of arguments for 'includes': expected 1, got ${args.length}`, pos);
      return arr.some(el => el === args[0]);
    }
    case "indexOf": {
      if (args.length !== 1) throw new XprError(`Wrong number of arguments for 'indexOf': expected 1, got ${args.length}`, pos);
      const idx = arr.findIndex(el => el === args[0]);
      return idx;
    }
    case "slice": {
      if (args.length < 1 || args.length > 2) throw new XprError(`Wrong number of arguments for 'slice': expected 1-2, got ${args.length}`, pos);
      if (typeof args[0] !== "number") throw new XprError(`Type error: slice expects number argument`, pos);
      if (args.length === 2 && typeof args[1] !== "number") throw new XprError(`Type error: slice expects number argument`, pos);
      return args.length === 2 ? arr.slice(args[0] as number, args[1] as number) : arr.slice(args[0] as number);
    }
    case "join": {
      if (args.length !== 1) throw new XprError(`Wrong number of arguments for 'join': expected 1, got ${args.length}`, pos);
      if (typeof args[0] !== "string") throw new XprError(`Type error: join expects string argument`, pos);
      return arr.map(el => el === null ? "null" : String(el)).join(args[0] as string);
    }
    case "concat": {
      if (args.length !== 1) throw new XprError(`Wrong number of arguments for 'concat': expected 1, got ${args.length}`, pos);
      if (!Array.isArray(args[0])) throw new XprError(`Type error: concat expects array argument`, pos);
      return [...arr, ...(args[0] as XprValue[])];
    }
    case "flat": {
      if (args.length !== 0) throw new XprError(`Wrong number of arguments for 'flat': expected 0, got ${args.length}`, pos);
      const result: XprValue[] = [];
      for (const el of arr) {
        if (Array.isArray(el)) result.push(...el);
        else result.push(el);
      }
      return result;
    }
    case "unique": {
      if (args.length !== 0) throw new XprError(`Wrong number of arguments for 'unique': expected 0, got ${args.length}`, pos);
      const seen: XprValue[] = [];
      return arr.filter(el => {
        if (seen.includes(el)) return false;
        seen.push(el);
        return true;
      });
    }
    case "zip": {
      if (args.length !== 1) throw new XprError(`Wrong number of arguments for 'zip': expected 1, got ${args.length}`, pos);
      if (!Array.isArray(args[0])) throw new XprError(`Type error: zip expects array argument`, pos);
      const other = args[0] as XprValue[];
      const len = Math.min(arr.length, other.length);
      return Array.from({ length: len }, (_, i) => [arr[i], other[i]]);
    }
    case "chunk": {
      if (args.length !== 1) throw new XprError(`Wrong number of arguments for 'chunk': expected 1, got ${args.length}`, pos);
      if (typeof args[0] !== "number" || !Number.isInteger(args[0]) || (args[0] as number) <= 0) {
        throw new XprError(`Type error: chunk size must be a positive integer`, pos);
      }
      const size = args[0] as number;
      const chunks: XprValue[][] = [];
      for (let i = 0; i < arr.length; i += size) {
        chunks.push(arr.slice(i, i + size));
      }
      return chunks;
    }
    case "groupBy": {
      if (args.length !== 1 || typeof args[0] !== "function") throw new XprError(`Wrong number of arguments for 'groupBy': expected 1 function, got ${args.length}`, pos);
      const groups: Record<string, XprValue[]> = {};
      for (const el of arr) {
        const key = String((args[0] as XprFn)(el));
        if (!groups[key]) groups[key] = [];
        groups[key].push(el);
      }
      const sorted: Record<string, XprValue[]> = {};
      for (const k of Object.keys(groups).sort()) {
        sorted[k] = groups[k];
      }
      return sorted;
    }
    default:
      throw new XprError(`Type error: cannot call method '${method}' on array`, pos);
  }
}

export function callObjectMethod(obj: XprValue, method: string, args: XprValue[], pos: number): XprValue {
  const o = assertObject(obj, method, pos);
  switch (method) {
    case "keys": {
      if (args.length !== 0) throw new XprError(`Wrong number of arguments for 'keys': expected 0, got ${args.length}`, pos);
      return Object.keys(o);
    }
    case "values": {
      if (args.length !== 0) throw new XprError(`Wrong number of arguments for 'values': expected 0, got ${args.length}`, pos);
      return Object.values(o);
    }
    case "entries": {
      if (args.length !== 0) throw new XprError(`Wrong number of arguments for 'entries': expected 0, got ${args.length}`, pos);
      return Object.entries(o).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0);
    }
    case "has": {
      if (args.length !== 1) throw new XprError(`Wrong number of arguments for 'has': expected 1, got ${args.length}`, pos);
      if (typeof args[0] !== "string") throw new XprError(`Type error: has expects string argument`, pos);
      return Object.prototype.hasOwnProperty.call(o, args[0] as string);
    }
    default:
      throw new XprError(`Type error: cannot call method '${method}' on object`, pos);
  }
}

export const GLOBAL_FUNCTIONS: Record<string, XprFn> = {
  round: (n) => {
    if (typeof n !== "number") throw new XprError(`Type error: round expects number`);
    return Math.round(n);
  },
  floor: (n) => {
    if (typeof n !== "number") throw new XprError(`Type error: floor expects number`);
    return Math.floor(n);
  },
  ceil: (n) => {
    if (typeof n !== "number") throw new XprError(`Type error: ceil expects number`);
    return Math.ceil(n);
  },
  abs: (n) => {
    if (typeof n !== "number") throw new XprError(`Type error: abs expects number`);
    return Math.abs(n);
  },
  min: (a, b) => {
    if (typeof a !== "number" || typeof b !== "number") throw new XprError(`Type error: min expects numbers`);
    return Math.min(a, b);
  },
  max: (a, b) => {
    if (typeof a !== "number" || typeof b !== "number") throw new XprError(`Type error: max expects numbers`);
    return Math.max(a, b);
  },
  type: (v) => xprType(v),
  int: (v) => {
    if (typeof v === "number") return Math.trunc(v);
    if (typeof v === "string") {
      const n = Number(v);
      if (isNaN(n)) throw new XprError(`Type error: cannot convert "${v}" to int`);
      return Math.trunc(n);
    }
    throw new XprError(`Type error: cannot convert ${xprType(v)} to int`);
  },
  float: (v) => {
    if (typeof v === "number") return v;
    if (typeof v === "string") {
      const n = Number(v);
      if (isNaN(n)) throw new XprError(`Type error: cannot convert "${v}" to float`);
      return n;
    }
    throw new XprError(`Type error: cannot convert ${xprType(v)} to float`);
  },
  string: (v) => {
    if (v === null) return "null";
    if (typeof v === "boolean") return v ? "true" : "false";
    if (typeof v === "number") return String(v);
    if (typeof v === "string") return v;
    return JSON.stringify(v);
  },
  bool: (v) => isTruthy(v),
  range: (...args: XprValue[]) => {
    let start: number, end: number, step: number;
    if (args.length === 1) {
      start = 0; end = args[0] as number; step = 1;
    } else if (args.length === 2) {
      start = args[0] as number; end = args[1] as number; step = 1;
    } else if (args.length === 3) {
      start = args[0] as number; end = args[1] as number; step = args[2] as number;
    } else {
      throw new XprError(`Wrong number of arguments for 'range': expected 1-3, got ${args.length}`);
    }
    if (typeof start !== "number" || typeof end !== "number" || typeof step !== "number") {
      throw new XprError(`Type error: range expects number arguments`);
    }
    if (!Number.isInteger(step)) {
      throw new XprError(`Type error: range step must be an integer, got float`);
    }
    if (step === 0) throw new XprError(`Type error: range step cannot be zero`);
    const result: number[] = [];
    if (step > 0) {
      for (let i = start; i < end; i += step) result.push(i);
    } else {
      for (let i = start; i > end; i += step) result.push(i);
    }
    return result;
  },
};
