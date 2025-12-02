export type Question = {
  id: number;
  value: string;
  children: string[];
  is_dynamic: boolean;
  function_name: string;
};

type DynamicQuestionContext = {
  answers: string[];
  currentIndex: number;
  question: Question;
};

type DynamicQuestionGenerator = (ctx: DynamicQuestionContext) => string;

const DYNAMIC_GENERATORS: Record<string, DynamicQuestionGenerator> = {
  deep_dive_recent: ({ answers, currentIndex }) => {
    const latest = [...answers]
      .slice(0, currentIndex)
      .reverse()
      .find(ans => ans.trim().length > 0);

    if (latest) {
      return `You mentioned: "${latest}". Can you go one level deeper on what makes that so draining?`;
    }

    return "Tell me more about the moment that feels most draining lately.";
  },
  get_aws_deep_dive: ({ answers, currentIndex }) => {
    const latest = [...answers]
      .slice(0, currentIndex)
      .reverse()
      .find(ans => ans.trim().length > 0);

    if (latest) {
      return `You mentioned earlier: "${latest}". What's the ripple effect of that on your day-to-day work?`;
    }

    return "Walk me through one draining moment from your recent workday—what happened, and how did it affect you?";
  },
};

export function resolveQuestionText(
  question: Question,
  answers: string[],
  currentIndex: number
): string {
  if (!question.is_dynamic) return question.value;
  const generator = DYNAMIC_GENERATORS[question.function_name];
  if (generator) {
    return generator({ answers, currentIndex, question });
  }
  return question.value;
}

// Hardcoded questions asked one after the other
export const QUESTIONS: Record<number, Question> = {
  1: {
    id: 1,
    value:
      "Tell me about the last time you felt completely wiped out. What was happening that day?",
    children: [],
    is_dynamic: false,
    function_name: "",
  },
  2: {
    id: 2,
    value:
      "When you hit that wiped-out feeling, what drains fastest: your patience with people, your physical energy, or your ability to think clearly?",
    children: ["During a typical week, how many days do you feel that way?" ],
    is_dynamic: false,
    function_name: "",
  },
  3: {
    id: 3,
    value:
      "These days, what part of work makes you want to just check out or stop caring?",
    children: [ "What's the story behind that? When did you start feeling this way?"],
    is_dynamic: false,
    function_name: "",
  },
  4: {
    id: 4, // todo: this needs to be dynamic
    value:
      "When you think about your actual skills and what you can do—not how you feel—how confident are you that you're still good at your work?",
    children: ["What's one thing you've done recently that reminded you how capable you are?"],
    is_dynamic: false,
    function_name: "",
  },
  5: {
    id: 5,
    value:
      "DEEP DIVE placeholder",
    children: [],
    is_dynamic: true,
    function_name: "deep_dive_recent",
  },
  6: {
    id: 6,
    value:
      "Looking back over the last few months, is this feeling getting better, staying the same, or getting worse?",
    children: [],
    is_dynamic: false,
    function_name: "",
  },
  
};
