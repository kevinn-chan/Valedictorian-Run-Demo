// Self-check for the LaTeX → plain-text pass. Run: `node src/lib/plain-math.check.ts`
import assert from "node:assert";
import { plainMath } from "./plain-math.ts";

// The exact strings that were rendering as literal macros in the live wiki.
assert.equal(
  plainMath("The probability of interest is \\Pr(R \\mid Z) = \\frac{\\Pr(Z \\cap R)}{\\Pr(Z)}."),
  "The probability of interest is Pr(R | Z) = (Pr(Z ∩ R))/(Pr(Z))."
);
assert.equal(
  plainMath("\\Pr(A \\mid B) = \\frac{\\Pr(A \\cap B)}{\\Pr(B)}"),
  "Pr(A | B) = (Pr(A ∩ B))/(Pr(B))"
);

// Delimiters (the original belt) still work.
assert.equal(plainMath("the mean $\\mu$ is"), "the mean μ is");
assert.equal(plainMath("$$E = mc^2$$"), "E = mc^2");

// Wrappers, roots, accents, sizing, spacing.
assert.equal(plainMath("\\text{Var}(X) \\geq 0"), "Var(X) ≥ 0");
assert.equal(plainMath("s = \\sqrt{\\frac{1}{n}}"), "s = √((1)/(n))");
assert.equal(plainMath("\\hat{p} and \\bar{x}"), "p̂ and x̄");
assert.equal(plainMath("\\left(\\sigma^2\\right)"), "(σ^2)");
assert.equal(plainMath("n \\, \\times \\, k"), "n × k");

// Nested \frac resolves inside-out.
assert.equal(plainMath("\\frac{\\frac{a}{b}}{c}"), "((a)/(b))/(c)");

// An unknown macro degrades to its bare name rather than staying a macro.
assert.equal(plainMath("\\wibble x"), "wibble x");
// Braces stay: prose set notation and plain-text subscripts both keep them.
assert.equal(plainMath("z_{\\alpha/2}"), "z_{α/2}");
assert.equal(plainMath("U = {1, 2, ..., N}"), "U = {1, 2, ..., N}");
assert.equal(plainMath("sum_{i=1}^N y_i"), "sum_{i=1}^N y_i");
// Escaped punctuation is not a macro.
assert.equal(plainMath("a 95\\% margin, \\le 0.5\\%"), "a 95% margin, ≤ 0.5%");
// Nested wrapper inside a root resolves rather than half-converting.
assert.equal(
  plainMath("\\sqrt{\\widehat{\\text{Var}}(\\hat{p})}"),
  "√(Var(p̂))"
);
// Markdown list indentation survives untouched.
assert.equal(plainMath("   - **Mean**: y_bar"), "   - **Mean**: y_bar");

// Prose is untouched — no stray brace or backslash handling on ordinary text.
const prose = "Stratified sampling divides the population into strata (p. 12).";
assert.equal(plainMath(prose), prose);
// Code spans keep their braces.
assert.equal(plainMath("use `{ a: 1 }` here"), "use `{ a: 1 }` here");

console.log("plain-math.check: all assertions passed");
