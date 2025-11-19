import React, { useEffect, useRef, useState } from "react";
import "./VoiceQuestionAnswer.css";

// Hardcoded questions asked one after the other
const QUESTIONS: string[] = [
  "In a typical work week, how many days do you feel completely used up by the end of the day?",
  "When you finish work, how long does it take you to feel like yourself again?",
  "When you think about your work itself — the purpose behind what you do — how do you feel about it these days?",
  "When you're with colleagues or clients, what's your general attitude lately? More open and collaborative, going through the motions, or withdrawn and impatient?",
  "When challenges come up at work, how confident are you in handling them?",
  "Looking at what you've accomplished at work recently, how do you feel about your ability to make a difference?"

];

const VoiceInterview: React.FC = () => {
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [answers, setAnswers] = useState<string[]>(
    () => Array(QUESTIONS.length).fill("")
  );
  const [listening, setListening] = useState<boolean>(false);
  const [status, setStatus] = useState<string>("Idle");

  const recognitionRef = useRef<any | null>(null);
  const currentIndexRef = useRef<number>(0); // keep in sync with currentIndex for callbacks

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
    recognition.continuous = false;     // one phrase per start()

    recognition.onstart = () => {
      setListening(true);
      setStatus("Listening…");
    };

    recognition.onend = () => {
      setListening(false);
      setStatus("Stopped listening.");
    };

    recognition.onerror = (event: any) => {
      console.error("SpeechRecognition error:", event.error);
      setStatus(`Error: ${event.error}`);
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript.trim();
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
      recognition.stop();
    };
  }, []);

  const startListening = () => {
    try {
      recognitionRef.current?.start();
    } catch (err) {
      console.warn("Recognition already running", err);
    }
  };

  const stopListening = () => {
    recognitionRef.current?.stop();
  };

  const speakCurrentQuestion = () => {
    const synth = window.speechSynthesis;
    if (!synth) {
      setStatus("Speech synthesis unsupported.");
      return;
    }

    const question = QUESTIONS[currentIndex];
    const utter = new SpeechSynthesisUtterance(question);

    utter.onstart = () => {
      // clear current answer when re-asking this question
      setAnswers(prev => {
        const updated = [...prev];
        updated[currentIndex] = "";
        return updated;
      });
      setStatus("Asking question…");
    };

    utter.onend = () => {
      setStatus("Now listening…");
      startListening();
    };

    synth.cancel();
    synth.speak(utter);
  };

  const goToNext = () => {
    setCurrentIndex(prev => Math.min(prev + 1, QUESTIONS.length - 1));
  };

  const goToPrev = () => {
    setCurrentIndex(prev => Math.max(prev - 1, 0));
  };

  const currentQuestion = QUESTIONS[currentIndex];
  const currentAnswer = answers[currentIndex] ?? "";

  const handleAnswerChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setAnswers(prev => {
      const updated = [...prev];
      updated[currentIndex] = value;
      return updated;
    });
  };

  const finished = currentIndex === QUESTIONS.length - 1;

  return (
    <div className="voice-shell">
      <div className="question-meta">
        <span>Question {currentIndex + 1} of {QUESTIONS.length}</span>
        <span className="status-pill">{status}</span>
      </div>

      <h1>Burnout Assessment</h1>

      <p className="question-text">{currentQuestion}</p>

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
      </div>

      <p className="status-line">Status: {status}</p>

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
          className="btn btn-quiet"
          onClick={goToPrev}
          disabled={currentIndex === 0}
        >
          Previous Question
        </button>

        <button
          className="btn"
          onClick={goToNext}
          disabled={finished}
        >
          Next Question
        </button>
      </div>

      <div className="qa-list">
        <h2>All Questions & Answers</h2>
        {QUESTIONS.map((q, i) => (
          <div key={i} className="qa-item">
            <div className="question">Q{i + 1}: {q}</div>
            <div className="answer">
              {answers[i] ? (
                <>{answers[i]}</>
              ) : (
                <span className="placeholder">No answer yet</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default VoiceInterview;
