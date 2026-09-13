import { plainMath } from "./plain-math.ts";

export interface QuizQuestion {
  question: string;
  options: string[];
  answer: number;
  explanation: string;
  page: number;
}

// Models park the correct option in slot A or B (10/10 in one live exam), so
// the position alone gave the answer away. Shuffle after generation and
// remap the answer index to follow the correct option.
export function shuffleOptions(q: QuizQuestion, rand: () => number = Math.random): QuizQuestion {
  const order = q.options.map((_, i) => i);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return {
    ...q,
    options: order.map((i) => q.options[i]),
    answer: order.indexOf(q.answer),
  };
}

// The UI already prints "(p. N)" from `page`; the model also inlines
// "[file.pdf p.N]" into the explanation, which rendered every citation twice.
export function stripInlineCitations(text: string): string {
  return text
    .replace(/\s*\[[^\]]*\bp\.\s*\d+[^\]]*\]/g, "")
    .replace(/\s+([.,;])/g, "$1")
    .trim();
}

export function cleanQuestion(q: QuizQuestion, rand?: () => number): QuizQuestion {
  return shuffleOptions(
    {
      ...q,
      question: plainMath(q.question),
      options: q.options.map(plainMath),
      explanation: stripInlineCitations(plainMath(q.explanation)),
    },
    rand
  );
}
