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

// Update these paths to point to your prerecorded MP3 assets
const QUESTION_AUDIO_SOURCES: (string | null)[] = [
  "./audio/question-1.mp3",
  "./audio/question-2.mp3",
  "./audio/question-3.mp3",
  "./audio/question-4.mp3",
  "./audio/question-5.mp3",
  "./audio/question-6.mp3"
];

const VoiceInterview: React.FC = () => {
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [answers, setAnswers] = useState<string[]>(
    () => Array(QUESTIONS.length).fill("")
  );
  const [listening, setListening] = useState<boolean>(false);
  const [status, setStatus] = useState<string>("Idle");

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
      console.warn("Recognition already running", err);
    }
  };

  const stopListening = () => {
    shouldListenRef.current = false;
    isRecognizingRef.current = false;
    recognitionRef.current?.stop();
  };

  const speakCurrentQuestion = () => {
    const audioSrc = QUESTION_AUDIO_SOURCES[currentIndex];
    if (!audioSrc) {
      setStatus("No audio recording is configured for this question.");
      return;
    }

    stopListening();

    if (!questionAudioRef.current) {
      questionAudioRef.current = new Audio();
    }

    const audio = questionAudioRef.current;
    audio.pause();
    audio.currentTime = 0;
    audio.src = audioSrc;

    // clear current answer when re-asking this question
    setAnswers(prev => {
      const updated = [...prev];
      updated[currentIndex] = "";
      return updated;
    });

    const handleEnded = () => {
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("error", handleError);
      setStatus("Now listening…");
      startListening();
    };

    const handleError = () => {
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("error", handleError);
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
        setStatus("Playback failed. Check that the MP3 file exists.");
      });
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
