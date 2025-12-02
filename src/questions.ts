export type Question = { id: number; value: string; children: string[] };

// Hardcoded questions asked one after the other
export const QUESTIONS: Record<number, Question> = {
  1: {
    id: 1,
    value:
      "Tell me about the last time you felt completely wiped out. What was happening that day?",
    children: ["Sorry to hear it. During a typical week, how many days do you feel that way?"],
  },
  2: {
    id: 2,
    value:
      "When you finish work, how long does it take you to feel like yourself again?",
    children: [],
  },
  3: {
    id: 3,
    value:
      "When you think about your work itself — the purpose behind what you do — how do you feel about it these days?",
    children: [],
  },
  4: {
    id: 4,
    value:
      "When you're with colleagues or clients, what's your general attitude lately? More open and collaborative, going through the motions, or withdrawn and impatient?",
    children: [],
  },
  5: {
    id: 5,
    value:
      "When challenges come up at work, how confident are you in handling them?",
    children: [],
  },
  6: {
    id: 6,
    value:
      "Looking at what you've accomplished at work recently, how do you feel about your ability to make a difference?",
    children: [],
  },
};
