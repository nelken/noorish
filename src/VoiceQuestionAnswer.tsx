import React, { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import "./VoiceQuestionAnswer.css";

type Question = { id: number; value: string; children: [] };

// Hardcoded questions asked one after the other
const QUESTIONS: Record<number, Question> = {
  1: {
    id: 1,
    value:
      "In a typical work week, how many days do you feel completely used up by the end of the day?",
    children: [],
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

const QUESTION_IDS = Object.keys(QUESTIONS)
  .map(Number)
  .sort((a, b) => a - b);
const TOTAL_QUESTIONS = QUESTION_IDS.length;

const VoiceInterview: React.FC = () => {
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [answers, setAnswers] = useState<string[]>(
    () => Array(TOTAL_QUESTIONS).fill("")
  );
  const [listening, setListening] = useState<boolean>(false);
  const [status, setStatus] = useState<string>("Idle");
  const [evaluation, setEvaluation] = useState<string>("");
  const [scorePercentage, setScorePercentage] = useState<number>(0);

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const currentIndexRef = useRef<number>(0); // keep in sync with currentIndex for callbacks
  const shouldListenRef = useRef<boolean>(false);
  const isRecognizingRef = useRef<boolean>(false);
  const questionAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    currentIndexRef.current = currentIndex;
  }, [currentIndex]);

  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setStatus("Speech recognition not supported in this browser.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;

    recognition.lang = "en-US";
    recognition.interimResults = false; // final results only
    recognition.continuous = true;      // keep streaming until stopped

    recognition.onstart = () => {
      setListening(true);
      setStatus("Listening…");
      isRecognizingRef.current = true;
    };

    recognition.onend = () => {
      setListening(false);
      isRecognizingRef.current = false;
      if (shouldListenRef.current) {
        setStatus("Waiting for more speech…");
        try {
          recognition.start();
        } catch (err) {
          console.warn("Unable to restart recognition", err);
        }
      } else {
        setStatus("Stopped listening.");
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error("SpeechRecognition error:", event.error);
      const micBlocked =
        event.error === "not-allowed" || event.error === "service-not-allowed";
      if (micBlocked) {
        shouldListenRef.current = false;
        setStatus(
          "Microphone access denied. Please allow mic permission and press Start again."
        );
        recognition.stop();
        return;
      }
      setStatus(`Error: ${event.error}`);
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const resultIndex = event.resultIndex;
      const result =
        event.results[resultIndex] ?? event.results[event.results.length - 1];
      const transcript = result?.[0]?.transcript.trim();
      if (!transcript) return;

      const idx = currentIndexRef.current;

      // append this phrase once to the current question's answer
      setAnswers(prev => {
        const updated = [...prev];
        const existing = updated[idx] || "";
        updated[idx] = existing ? `${existing} ${transcript}` : transcript;
        return updated;
      });
    };

    return () => {
      shouldListenRef.current = false;
      recognition.stop();
    };
  }, []);

  useEffect(() => {
    const audioElement = new Audio();
    questionAudioRef.current = audioElement;

    return () => {
      audioElement.pause();
      questionAudioRef.current = null;
    };
  }, []);

  const startListening = () => {
    if (!recognitionRef.current) return;
    if (isRecognizingRef.current) {
      setStatus("Already listening…");
      return;
    }
    shouldListenRef.current = true;
    try {
      recognitionRef.current?.start();
    } catch (err) {
      console.warn("Recognition start failed", err);
      shouldListenRef.current = false;
      setStatus(
        "Microphone permission is blocked. Please allow mic access and try again."
      );
    }
  };

  const stopListening = () => {
    shouldListenRef.current = false;
    isRecognizingRef.current = false;
    recognitionRef.current?.stop();
  };

  const speakCurrentQuestion = async () => {
    stopListening();

    if (!questionAudioRef.current) {
      questionAudioRef.current = new Audio();
    }

    const audio = questionAudioRef.current;
    audio.pause();
    audio.currentTime = 0;

    setStatus("Fetching audio…");

    let audioUrl: string | null = null;

    try {
      const res = await fetch("/api/speak", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          input: currentQuestion.value,
        }),
      });

      if (!res.ok) {
        throw new Error(`TTS request failed with status ${res.status}`);
      }

      const arrayBuffer = await res.arrayBuffer();
      const blob = new Blob([arrayBuffer], { type: "audio/wav" });
      audioUrl = URL.createObjectURL(blob);
      audio.src = audioUrl;

      // clear current answer when re-asking this question
      setAnswers(prev => {
        const updated = [...prev];
        updated[currentIndex] = "";
        return updated;
      });

      const handleEnded = () => {
        audio.removeEventListener("ended", handleEnded);
        audio.removeEventListener("error", handleError);
        if (audioUrl) {
          URL.revokeObjectURL(audioUrl);
        }
        setStatus("Now listening…");
        startListening();
      };

      const handleError = () => {
        audio.removeEventListener("ended", handleEnded);
        audio.removeEventListener("error", handleError);
        if (audioUrl) {
          URL.revokeObjectURL(audioUrl);
        }
        setStatus("Unable to ask question.");
      };

      audio.addEventListener("ended", handleEnded);
      audio.addEventListener("error", handleError);

      setStatus("Asking question…");
      audio
        .play()
        .catch(err => {
          console.error("Unable to ask question", err);
          audio.removeEventListener("ended", handleEnded);
          audio.removeEventListener("error", handleError);
          if (audioUrl) {
            URL.revokeObjectURL(audioUrl);
          }
          setStatus("asking failed.");
        });
    } catch (err) {
      console.error("Unable to fetch TTS audio", err);
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
      setStatus("Unable to ask question.");
    }
  };

  const goToNext = () => {
    // Only advance when the current question has an answer
    if (!hasCurrentAnswer) return;
    setCurrentIndex(prev => Math.min(prev + 1, TOTAL_QUESTIONS - 1));
  };

  const currentQuestionId = QUESTION_IDS[currentIndex]!;
  const currentQuestion = QUESTIONS[currentQuestionId]!;
  const currentAnswer = answers[currentIndex] ?? "";
  const hasCurrentAnswer = currentAnswer.trim().length > 0;
  const allAnswered = answers.every(ans => ans.trim().length > 0);
  const finished = currentIndex === TOTAL_QUESTIONS - 1;
  const canSubmit = finished && allAnswered;

  const handleAnswerChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setAnswers(prev => {
      const updated = [...prev];
      updated[currentIndex] = value;
      return updated;
    });
  };

  function combineMessages(questionOrder: number[], answerList: string[]) {
    return questionOrder
      .flatMap((id, i) => [
        `Question ${id}: ${QUESTIONS[id].value}`,
        `Answer ${id}: ${answerList[i] ?? ""}`,
      ])
      .join("\n\n");
  }
  function BurnoutScale({ percent }: { percent: number }) {
    return (
      <div className="burnout-scale">
        <div className="labels">
          <span>Engaged</span>
          <span>Ineffective</span>
          <span>Overextended</span>
          <span>Disengaged</span>
          <span>Burnout</span>
        </div>
  
        <div className="bar">
          <div className="marker" style={{ left: `${percent}%` }}>
            <span className="dot"></span>
            <span className="text">You are here</span>
          </div>
        </div>
      </div>
    );
  }

  async function sendAllToBackend() {
    const combined = combineMessages(QUESTION_IDS, answers);
  
    const res = await fetch("/api/query", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ q: combined }),
    });
  
    const data = await res.json();
    console.log("Backend response", data);


    try {
      const parsed = JSON.parse(data.text);
      if (typeof parsed.score_percent === "number") {
        setScorePercentage(parsed.score_percent);
      }
      if (typeof parsed.evaluation_markdown === "string") {
        setEvaluation(parsed.evaluation_markdown ?? "");
      }
    } catch (e) {
      console.warn("Failed to parse JSON from model, falling back to raw text", e);
    }
    
    
  }

  return (
    <div className="voice-shell">
      <div className="question-meta">
        <span>Question {currentQuestionId} of {TOTAL_QUESTIONS}</span>
        <span className="status-pill">{status}</span>
      </div>

      <h1>Burnout Assessment</h1>

      <p className="question-text">{currentQuestion.value}</p>

      <div className="control-row">
        <button
          className="btn btn-primary"
          onClick={speakCurrentQuestion}
        >
          Ask This Question Out Loud
        </button>

        <button
          className="btn"
          onClick={startListening}
        >
          Start/Resume Listening
        </button>

        <button
          className="btn btn-quiet"
          onClick={stopListening}
          disabled={!listening}
        >
          Stop Listening
        </button>

        <button 
          className="send-history-btn"
          onClick={sendAllToBackend}
          disabled={!canSubmit}>
          Submit all answers for evaluation
        </button>
      </div>

      <div className="answer-block">
        <label>Recognized Answer:</label>
        <textarea
          className="answer-textarea"
          value={currentAnswer}
          onChange={handleAnswerChange}
        />
      </div>

      <div className="nav-row">
        <button
          className="btn"
          onClick={goToNext}
          disabled={finished || !hasCurrentAnswer}
        >
          Next Question
        </button>
      </div>
      <p className="status-line">
        {hasCurrentAnswer
          ? finished
            ? "Okay, I've got what I need. Submit to get your evaluation. Let me put together your burnout assessment—I'll have it ready for you in just a moment. "
            : "You can move to the next question."
          : "Answer this question to continue."}
      </p>

      {evaluation && (
        <div className="evaluation-block">
          
            <h2>Evaluation</h2>
            <BurnoutScale percent={scorePercentage} />
            <ReactMarkdown>{evaluation}</ReactMarkdown>
        </div>
      )} 

    </div>
  );
};

export default VoiceInterview;
