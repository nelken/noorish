import React, { useEffect, useRef, useState } from "react";

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
    <div style={{ maxWidth: 700, margin: "40px auto", textAlign: "left" }}>
      <h1>Voice Interview</h1>

      <p style={{ marginBottom: 8 }}>
        Question {currentIndex + 1} of {QUESTIONS.length}
      </p>

      <p style={{ marginBottom: 16, fontWeight: "bold" }}>
        {currentQuestion}
      </p>

      <div style={{ marginBottom: 16 }}>
        <button
          onClick={speakCurrentQuestion}
          style={{ padding: "8px 16px", marginRight: 10 }}
        >
          Ask This Question Out Loud
        </button>

        <button
          onClick={startListening}
          style={{ padding: "8px 16px", marginRight: 10 }}
        >
          Start/Resume Listening
        </button>

        <button
          onClick={stopListening}
          disabled={!listening}
          style={{ padding: "8px 16px" }}
        >
          Stop Listening
        </button>
      </div>

      <p style={{ marginTop: 4, fontStyle: "italic" }}>Status: {status}</p>

      <div style={{ marginTop: 16 }}>
        <label style={{ display: "block", marginBottom: 8, fontWeight: "bold" }}>
          Recognized Answer:
        </label>
        <textarea
          value={currentAnswer}
          onChange={handleAnswerChange}
          style={{ width: "100%", minHeight: 120, padding: 8 }}
        />
      </div>

      <div style={{ marginTop: 20, display: "flex", gap: 8 }}>
        <button
          onClick={goToPrev}
          disabled={currentIndex === 0}
          style={{ padding: "8px 16px" }}
        >
          Previous Question
        </button>

        <button
          onClick={goToNext}
          disabled={finished}
          style={{ padding: "8px 16px" }}
        >
          Next Question
        </button>
      </div>

      <div style={{ marginTop: 32 }}>
        <h2>All Questions & Answers</h2>
        <ul>
          {QUESTIONS.map((q, i) => (
            <li key={i} style={{ marginBottom: 12 }}>
              <div style={{ fontWeight: "bold" }}>Q{i + 1}: {q}</div>
              <div>A{i + 1}: {answers[i] || <span style={{ opacity: 0.6 }}>No answer yet</span>}</div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default VoiceInterview;