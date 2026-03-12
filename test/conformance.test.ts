import { describe, it, expect } from "bun:test";
import { parse as parseYaml } from "yaml";
import { readFileSync, readdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { Xpr } from "../src/index";

const __dirname = dirname(fileURLToPath(import.meta.url));
const conformanceDir = join(__dirname, "../conformance/conformance");

interface TestCase {
  name: string;
  expression: string;
  context?: Record<string, unknown>;
  expected?: unknown;
  error?: string;
  skip?: boolean;
  tags?: string[];
}

interface TestSuite {
  suite: string;
  version: string;
  tests: TestCase[];
}

const yamlFiles = readdirSync(conformanceDir)
  .filter(f => f.endsWith(".yaml") && f !== "examples.yaml")
  .sort();

for (const file of yamlFiles) {
  const content = readFileSync(join(conformanceDir, file), "utf-8");
  const suite = parseYaml(content) as TestSuite;

  describe(suite.suite, () => {
    for (const test of suite.tests) {
      const testFn = test.skip ? it.skip : it;

      testFn(test.name, () => {
        const engine = new Xpr();
        const ctx = test.context ?? {};

        if ("error" in test && test.error !== undefined) {
          expect(() => engine.evaluate(test.expression, ctx)).toThrow(test.error);
        } else {
          const result = engine.evaluate(test.expression, ctx);
          expect(result).toEqual(test.expected);
        }
      });
    }
  });
}
