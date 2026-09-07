// Belt for the "write formulas in plain text/Unicode" prompt rule. The models
// emit LaTeX anyway — 28 of 91 wiki pages had raw macros rendering as literal
// `\frac{\Pr(Z \cap R)}{\Pr(Z)}` — and nothing downstream renders math, so
// convert to Unicode here. Shared by ingest (compile time) and both chat views.
const SYMBOLS: Record<string, string> = {
  mid: "|", cap: "∩", cup: "∪", in: "∈", notin: "∉", subset: "⊂", subseteq: "⊆",
  times: "×", cdot: "·", div: "÷", pm: "±", leq: "≤", geq: "≥", le: "≤", ge: "≥", neq: "≠", ne: "≠",
  approx: "≈", equiv: "≡", sim: "~", propto: "∝", infty: "∞", partial: "∂",
  sum: "Σ", prod: "Π", int: "∫", forall: "∀", exists: "∃", emptyset: "∅",
  rightarrow: "→", to: "→", leftarrow: "←", leftrightarrow: "↔", implies: "⇒", iff: "⇔",
  ldots: "…", dots: "…", cdots: "…", perp: "⊥", angle: "∠", degree: "°",
  alpha: "α", beta: "β", gamma: "γ", delta: "δ", epsilon: "ε", varepsilon: "ε",
  zeta: "ζ", eta: "η", theta: "θ", lambda: "λ", mu: "μ", nu: "ν", xi: "ξ",
  pi: "π", rho: "ρ", sigma: "σ", tau: "τ", phi: "φ", varphi: "φ", chi: "χ",
  psi: "ψ", omega: "ω", Gamma: "Γ", Delta: "Δ", Theta: "Θ", Lambda: "Λ",
  Pi: "Π", Sigma: "Σ", Phi: "Φ", Psi: "Ψ", Omega: "Ω",
};

// ponytail: single-level brace matching, applied repeatedly so nested \frac
// resolves inside-out. A macro whose argument itself contains braces beyond
// two levels keeps its braces — acceptable; a real math renderer is the
// upgrade path if formulas ever get more elaborate than a stats deck's.
const ARG = String.raw`[^{}]*(?:\{[^{}]*\}[^{}]*)*`;

// `\frac{1}{n}` reads better as `1/n` than `(1)/(n)`. Parenthesise an operand
// only when it would otherwise be ambiguous — i.e. it carries a top-level
// space or operator once bracketed groups are set aside.
const wrap = (x: string) => {
  const bare = x.replace(/\([^()]*\)/g, "").trim();
  return /[\s+\-±=]/.test(bare) ? `(${x.trim()})` : x.trim();
};

const unwrapRepeatedly = (s: string, re: RegExp, replace: string) => {
  for (let i = 0; i < 4; i++) {
    const next = s.replace(re, replace);
    if (next === s) break;
    s = next;
  }
  return s;
};

export function plainMath(text: string): string {
  let s = text;

  // An escaped dollar is currency and must survive the delimiter pass, which
  // would otherwise treat it as an opening $…$ and swallow the text after it.
  // Unescaping it early has the same effect, so park it behind a sentinel.
  const DOLLAR = "\u0000d\u0000";
  s = s.replace(/\\\$/g, DOLLAR);
  s = s.replace(/\\([%&#_])/g, "$1");

  // $x$ / $$x$$ delimiters — the original belt.
  s = s.replace(/\$\$?([^$\n]+?)\$\$?/g, "$1");

  // Brace-consuming macros, resolved inside-out and re-run as a group: an
  // argument can itself hold a macro (\sqrt{\widehat{\text{Var}}(x)}), so one
  // pass per rule isn't enough — the outer \sqrt only matches once its inner
  // braces are gone.
  for (let pass = 0; pass < 6; pass++) {
    const before = s;
    // \text{…}, \widehat{…} and friends: keep the contents, drop the wrapper.
    s = unwrapRepeatedly(s, new RegExp(String.raw`\\?(?:text|textbf|textit|mathrm|mathbf|mathit|mathcal|operatorname|widehat|widetilde|overline|underline|mathbb|mathsf|mathtt|boldsymbol)\s*\{(${ARG})\}`, "g"), "$1");
    // \frac{a}{b} → (a)/(b); \sqrt{x} → √(x).
    s = s.replace(new RegExp(String.raw`\\?(?:d|t)?frac\s*\{(${ARG})\}\s*\{(${ARG})\}`, "g"),
      (_m: string, a: string, b: string) => `${wrap(a)}/${wrap(b)}`);
    s = s.replace(new RegExp(String.raw`\\?sqrt\s*\{(${ARG})\}`, "g"), "√($1)");
    // Accents: \hat{x} → x̂, \bar{x} → x̄ (combining marks).
    s = unwrapRepeatedly(s, new RegExp(String.raw`\\hat\s*\{(${ARG})\}`, "g"), "$1̂");
    s = unwrapRepeatedly(s, new RegExp(String.raw`\\bar\s*\{(${ARG})\}`, "g"), "$1̄");
    if (s === before) break;
  }

  // Sizing and spacing macros carry no meaning in plain text.
  s = s.replace(/\\(?:left|right|big|Big|bigg|Bigg|displaystyle|limits|nonumber|notag)\b/g, "");
  s = s.replace(/\\(?:quad|qquad)\b/g, " ");
  s = s.replace(/\\[,;:!> ]/g, " ");

  // Named symbols → Unicode.
  s = s.replace(/\\([A-Za-z]+)/g, (m, name: string) =>
    Object.prototype.hasOwnProperty.call(SYMBOLS, name) ? SYMBOLS[name] : name
  );

  // Braces are left alone entirely. Set notation (U = {1, 2, …, N}) is real
  // prose, and even in `sum_{i=1}^N` the braces aid reading once the macros
  // are gone — stripping them made already-plain pages worse, not better.

  s = s.replaceAll(DOLLAR, "$");

  // Tidy the double spaces the spacing macros leave behind, but only after a
  // non-space character: a leading run of spaces carries markdown list nesting,
  // and collapsing those re-flattened every nested bullet.
  return s.replace(/(\S)[ \t]{2,}/g, "$1 ");
}
