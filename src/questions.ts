export type Question = { id: number; value: string; children: string[] };

// Hardcoded questions asked one after the other
export const QUESTIONS: Record<number, Question> = {
  1: {
    id: 1,
    value:
      "Tell me about the last time you felt completely wiped out. What was happening that day?",
    children: [],
  },
  2: {
    id: 2,
    value:
      "When you hit that wiped-out feeling, what drains fastest: your patience with people, your physical energy, or your ability to think clearly?",
    children: ["During a typical week, how many days do you feel that way?" ],
  },
  3: {
    id: 3,
    value:
      "These days, what part of work makes you want to just check out or stop caring?",
    children: [ "What's the story behind that? When did you start feeling this way?"],
  },
  4: {
    id: 4, // todo: this needs to be dynamic
    value:
      "When you think about your actual skills and what you can do—not how you feel—how confident are you that you're still good at your work?",
    children: ["What's one thing you've done recently that reminded you how capable you are?"],
  },
  5: {
    id: 5,
    value:
      "DEEP DIVE placeholder",
    children: [],
  },
  6: {
    id: 6,
    value:
      "Looking back over the last few months, is this feeling getting better, staying the same, or getting worse?",
    children: [],
  },
  
};
