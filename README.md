# @xpr-lang/xpr

[![CI](https://github.com/xpr-lang/xpr-js/actions/workflows/ci.yml/badge.svg)](https://github.com/xpr-lang/xpr-js/actions)
[![npm](https://img.shields.io/npm/v/@xpr-lang/xpr)](https://www.npmjs.com/package/@xpr-lang/xpr)
[![XPR spec](https://img.shields.io/badge/XPR_spec-v0.2-blue)](https://github.com/xpr-lang/xpr)
[![conformance](https://img.shields.io/badge/conformance-100%25-brightgreen)](https://github.com/xpr-lang/xpr/tree/main/conformance)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

**XPR** is a sandboxed cross-language expression language for data pipeline transforms. This is the TypeScript/JavaScript reference runtime.

## Install

```bash
bun add @xpr-lang/xpr
# or
npm install @xpr-lang/xpr
```

## Quick Start

```typescript
import { Xpr } from '@xpr-lang/xpr';

const engine = new Xpr();

engine.evaluate('items.filter(x => x.price > 50).map(x => x.name)', {
  items: [
    { name: 'Widget', price: 25 },
    { name: 'Gadget', price: 75 },
    { name: 'Doohickey', price: 100 },
  ]
});
// → ["Gadget", "Doohickey"]
```

## API

### `evaluate(expression, context?)`

Evaluates an XPR expression against an optional context object.

```typescript
const engine = new Xpr();

engine.evaluate('1 + 2');                          // → 3
engine.evaluate('user.name', { user: { name: 'Alice' } }); // → "Alice"
engine.evaluate('items.length', { items: [1, 2, 3] });     // → 3
```

Returns the result as `unknown`. Throws `XprError` on parse or evaluation errors.

### `addFunction(name, fn)`

Register a custom function callable from expressions:

```typescript
const engine = new Xpr();

engine.addFunction('double', (x) => (x as number) * 2);
engine.addFunction('greet', (name) => `Hello, ${name}!`);

engine.evaluate('double(21)');           // → 42
engine.evaluate('greet("World")');       // → "Hello, World!"
engine.evaluate('items.map(x => double(x))', { items: [1, 2, 3] }); // → [2, 4, 6]
```

## Built-in Functions

**Math**: `round`, `floor`, `ceil`, `abs`, `min`, `max`

**Type**: `type`, `int`, `float`, `string`, `bool`

**String methods**: `.len()`, `.upper()`, `.lower()`, `.trim()`, `.startsWith()`, `.endsWith()`, `.contains()`, `.split()`, `.replace()`, `.slice()`, `.indexOf()`, `.repeat()`, `.trimStart()`, `.trimEnd()`, `.charAt()`, `.padStart()`, `.padEnd()`

**Array methods**: `.map()`, `.filter()`, `.reduce()`, `.find()`, `.some()`, `.every()`, `.flatMap()`, `.sort()`, `.reverse()`, `.length`, `.includes()`, `.indexOf()`, `.slice()`, `.join()`, `.concat()`, `.flat()`, `.unique()`, `.zip()`, `.chunk()`, `.groupBy()`

**Object methods**: `.keys()`, `.values()`, `.entries()`, `.has()`

**Utility**: `range()`

## v0.2 Features

**Let Bindings**: Immutable scoped bindings allow you to define and reuse values within expressions:

```typescript
engine.evaluate('let x = 1; let y = x + 1; y'); // → 2
engine.evaluate('let items = [1, 2, 3]; items.map(x => x * 2)', {}); // → [2, 4, 6]
```

**Spread Operator**: Spread syntax for arrays and objects enables composition and merging:

```typescript
engine.evaluate('[1, 2, ...[3, 4]]'); // → [1, 2, 3, 4]
engine.evaluate('{...{a: 1}, b: 2}'); // → {a: 1, b: 2}
```

## Conformance

This runtime supports **Level 1–3** (all conformance levels):
- Level 1: Literals, arithmetic, comparison, logic, ternary, property access, function calls
- Level 2: Arrow functions, collection methods, string methods, template literals
- Level 3: Pipe operator (`|>`), optional chaining (`?.`), nullish coalescing (`??`)

**v0.2 additions**: Let bindings, spread operator, 20 new built-in methods (10 array, 7 string, 2 object, 1 global)

## Specification

See the [XPR Language Specification](https://github.com/xpr-lang/xpr) for the full EBNF grammar, type system, operator precedence, and conformance test suite.

## License

MIT
