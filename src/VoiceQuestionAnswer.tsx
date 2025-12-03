import React, { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import "./VoiceQuestionAnswer.css";
import { QUESTIONS, resolveQuestionText } from "./questions";
import type { Question } from "./questions";

type QuestionItem = {
  id: string;
  value: string;
  isFollowUp: boolean;
  question?: Question;
  parentId?: number;
  followUpIndex?: number;
  totalFollowUpsForParent?: number;
  rootNumber: number;
};

const ROOT_IDS = Object.keys(QUESTIONS)
  .map(Number)
  .sort((a, b) => a - b);

const QUESTION_SEQUENCE: QuestionItem[] = ROOT_IDS.flatMap((questionId, rootIndex) => {
  const q = QUESTIONS[questionId];
  if (!q) return [];
  const rootNumber = rootIndex + 1;
  const followUps = q.children.map((childText, idx) => ({
    id: `${q.id}-${idx + 1}`,
    value: childText,
    isFollowUp: true,
    parentId: q.id,
    followUpIndex: idx + 1,
    totalFollowUpsForParent: q.children.length,
    rootNumber,
  }));
  return [
    {
      id: q.id.toString(),
      value: q.value,
      isFollowUp: false,
      question: q,
      rootNumber,
    },
    ...followUps,
  ];
});
const TOTAL_QUESTIONS = QUESTION_SEQUENCE.length;
const ROOT_COUNT = ROOT_IDS.length;

const VoiceInterview: React.FC = () => {
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [answers, setAnswers] = useState<string[]>(
    () => Array(TOTAL_QUESTIONS).fill("")
  );
  const [started, setStarted] = useState<boolean>(false);
  const [status, setStatus] = useState<string>("Idle");
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [showContactForm, setShowContactForm] = useState<boolean>(false);
  const [contactEmail, setContactEmail] = useState<string>("");
  const [contactFirstName, setContactFirstName] = useState<string>("");
  const [contactLastName, setContactLastName] = useState<string>("");
  const [contactPhone, setContactPhone] = useState<string>("");
  const [contactError, setContactError] = useState<string>("");
  const [contactSubmitted, setContactSubmitted] = useState<boolean>(false);
  const [evaluation, setEvaluation] = useState<string>("");
  const [scorePercentage, setScorePercentage] = useState<number>(0);
  const [audioUnlocked, setAudioUnlocked] = useState<boolean>(false);
  const [classifications, setClassifications] = useState<Record<number, string>>({});
  const [classificationLoading, setClassificationLoading] = useState<Record<number, boolean>>({});

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const currentIndexRef = useRef<number>(0); // keep in sync with currentIndex for callbacks
  const shouldListenRef = useRef<boolean>(false);
  const isRecognizingRef = useRef<boolean>(false);
  const questionAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    currentIndexRef.current = currentIndex;
  }, [currentIndex]);

  useEffect(() => {
    // Stop mic once the flow is finished or contact info has been submitted.
    if (contactSubmitted || evaluation) {
      shouldListenRef.current = false;
      stopListening();
      setStatus("Stopped listening.");
    }
  }, [contactSubmitted, evaluation]);

  const isValidEmail = (value: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

  const isValidPhone = (value: string) => {
    const digits = value.replace(/\D/g, "");
    return digits.length >= 7;
  };

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
      setStatus("Listening…");
      isRecognizingRef.current = true;
    };

    recognition.onend = () => {
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
      if (event.error === "network") {
        shouldListenRef.current = false;
        recognition.stop();
        setStatus("Speech recognition network error. Check your connection and try again.");
        return;
      }
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

  // Classification now happens synchronously during navigation; no effect needed.

  const startListening = () => {
    if (!recognitionRef.current) return;
    if (isRecognizingRef.current) {
      setStatus("Already listening…");
      return;
    }
    shouldListenRef.current = true;
    try {
      recognitionRef.current?.start();
    } catch (err: any) {
      if (err?.name === "InvalidStateError") {
        setTimeout(() => {
          if (!shouldListenRef.current || isRecognizingRef.current) return;
          try {
            recognitionRef.current?.start();
          } catch (retryErr) {
            console.warn("Recognition retry failed", retryErr);
            shouldListenRef.current = false;
          }
        }, 200);
        return;
      }
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

  useEffect(() => {
    // Automatically ask the current question when it becomes active,
    // but only after audio playback has been unlocked by a user gesture and the flow has started.
    if (!audioUnlocked || !started) return;
    speakCurrentQuestion();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex, audioUnlocked, started]);

  const handleBegin = () => {
    if (!audioUnlocked) {
      setAudioUnlocked(true);
    }
    setStarted(true);
  };

  async function submitContact() {
    if (!contactEmail && !contactPhone) return;
    const payload = {
      first_name: contactFirstName.trim() || null,
      last_name: contactLastName.trim() || null,
      email: contactEmail.trim() || null,
      phone: contactPhone.trim() || null,
    };
    try {
      await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } catch (err) {
      console.warn("Contact submission failed", err);
    }
  }

  const currentQuestion = QUESTION_SEQUENCE[currentIndex]!;
  const currentQuestionValue = getQuestionText(currentQuestion, answers, currentIndex);
  const currentQuestionId = currentQuestion.question?.id;
  const currentRequiresClassification = currentQuestionId == 2;
    
  async function ensureClassificationForCurrent(): Promise<boolean> {
    if (!currentRequiresClassification || !currentQuestionId) return true;
    if (classifications[currentQuestionId]) return true;

    const answerText = answers[currentIndex]?.trim();
    if (!answerText) return false;

    setClassificationLoading(prev => ({ ...prev, [currentQuestionId]: true }));
    setStatus("Analyzing your answer…");

    try {
      const res = await fetch("/api/classify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: answerText,
          options: ["people", "physical", "thinking"],
        }),
      });
      const data = await res.json();
      const resolvedChoice = data?.choice;
      
      if (!resolvedChoice) {
        setStatus("Could not classify. Please confirm your answer and try again.");
        return false;
      }
      setClassifications(prev => ({
        ...prev,
        [currentQuestionId]: resolvedChoice,
      }));
      return true;
    } catch (err) {
      console.warn("Classification failed", err);
      setStatus("Could not classify. Check your connection and try again.");
      return false;
    } finally {
      setClassificationLoading(prev => ({ ...prev, [currentQuestionId]: false }));
      setStatus("Idle");
    }
  }

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
          input: currentQuestionValue,
        }),
      });

      if (!res.ok) {
        throw new Error(`TTS request failed with status ${res.status}`);
      }

      const arrayBuffer = await res.arrayBuffer();
      const blob = new Blob([arrayBuffer], { type: "audio/mpeg" });
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
      .then(() => {
        setAudioUnlocked(true);
      })
      .catch(err => {
        console.error("Unable to ask question", err);
        audio.removeEventListener("ended", handleEnded);
        audio.removeEventListener("error", handleError);
        if (audioUrl) {
          URL.revokeObjectURL(audioUrl);
        }
        setStatus("Audio blocked. Tap Start/Resume Listening to allow playback.");
      });
  } catch (err) {
    console.error("Unable to fetch TTS audio", err);
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      }
      setStatus("Unable to ask question.");
    }
  };

  const goToNext = async () => {
    // Only advance when the current question has an answer
    if (!hasCurrentAnswer) return;
    const ok = await ensureClassificationForCurrent();
    if (!ok) return;
    setCurrentIndex(prev => Math.min(prev + 1, TOTAL_QUESTIONS - 1));
  };

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

  function labelForQuestion(q: QuestionItem, index: number) {
    if (q.isFollowUp) {
      const followUpNumber = q.followUpIndex ?? index + 1;
      const total = q.totalFollowUpsForParent
        ? ` of ${q.totalFollowUpsForParent}`
        : "";
      return `Follow-up ${followUpNumber}${total} to Question ${q.rootNumber}`;
    }
    return `Question ${q.rootNumber}`;
  }

  function getQuestionText(q: QuestionItem, answerList: string[], index: number) {
    if (q.isFollowUp || !q.question) return q.value;
    return resolveQuestionText(q.question, answerList, index, classifications);
  }

  function combineMessages(questionOrder: QuestionItem[], answerList: string[]) {
    return questionOrder
      .flatMap((q, i) => {
        const questionText = getQuestionText(q, answerList, i);
        return [
          `${labelForQuestion(q, i)}: ${questionText}`,
          `Answer ${i + 1}: ${answerList[i] ?? ""}`,
        ];
      })
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
    if (submitting) return;
    setSubmitting(true);
    setStatus("Submitting answers…");
    const combined = combineMessages(QUESTION_SEQUENCE, answers);
  
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
    } finally {
      setSubmitting(false);
    }
    
    
  }

  return (
    <div className="voice-shell">
      {!started ? (
        <div className="intro-screen">
          <h1>Welcome to Noorish</h1>
          <p>Press the button to begin your burnout assessment.</p>
          <button className="btn btn-primary" onClick={handleBegin}>
            Begin Assessment
          </button>
        </div>
      ) : (
        <>
          {evaluation ? (
            <div className="evaluation-block">
              <h2>Evaluation</h2>
              <BurnoutScale percent={scorePercentage} />
              <ReactMarkdown>{evaluation}</ReactMarkdown>
            </div>
          ) : contactSubmitted ? (
            <div className="evaluation-block">
              <h2>Preparing your report</h2>
              <p className="status-line">
                Hang tight—building your burnout assessment now.
              </p>
            </div>
          ) : (
            <>
              <div className="question-meta">
                <span>
                  {currentQuestion.isFollowUp
                    ? `Follow-up ${currentQuestion.followUpIndex ?? currentIndex + 1}${
                        currentQuestion.totalFollowUpsForParent
                          ? ` of ${currentQuestion.totalFollowUpsForParent}`
                          : ""
                      } to Question ${currentQuestion.rootNumber}`
                    : `Question ${currentQuestion.rootNumber} of ${ROOT_COUNT}`}
                </span>
                <span className="status-pill">{status}</span>
              </div>

              <h1>Noorish Burnout Assessment</h1>

              <p className="question-text">{currentQuestionValue}</p>

              <div className="answer-block">
                <label>Answer:</label>
                <textarea
                  className="answer-textarea"
                  value={currentAnswer}
                  onChange={handleAnswerChange}
                />
              </div>

              {!finished && (
                <div className="nav-row">
                  <button
                    className="btn"
                    onClick={goToNext}
                    disabled={
                      !hasCurrentAnswer ||
                      !!(currentQuestionId && classificationLoading[currentQuestionId])
                    }
                  >
                    Next Question
                  </button>
                </div>
              )}
              <p className="status-line">
                {hasCurrentAnswer
                  ? finished
                    ? "Okay, I've got what I need. Submit to get your Assessment. Let me put together your burnout assessment—I'll have it ready for you in just a moment. "
                    : "You can move to the next question."
                  : "Answer this question to continue."}
              </p>

              {canSubmit && !evaluation && (
                <div className="control-row contact-row">
                  {!showContactForm ? (
                    <button 
                      className="send-history-btn"
                      onClick={() => setShowContactForm(true)}
                      disabled={!canSubmit}>
                      Submit all answers for evaluation
                    </button>
                  ) : (
                    <div className="contact-form">
                      <p>Please share your name and email address or phone number to receive the report.</p>
                      <div className="contact-inputs">
                        <label>
                          First name
                          <input
                            type="text"
                            value={contactFirstName}
                            onChange={e => {
                              setContactFirstName(e.target.value);
                              setContactError("");
                            }}
                            placeholder="Your first name"
                          />
                        </label>
                        <label>
                          Last name
                          <input
                            type="text"
                            value={contactLastName}
                            onChange={e => {
                              setContactLastName(e.target.value);
                              setContactError("");
                            }}
                            placeholder="Your last name"
                          />
                        </label>
                        <label className="email-field">
                          Email
                          <input
                            type="email"
                            value={contactEmail}
                            onChange={e => {
                              setContactEmail(e.target.value);
                              setContactError("");
                            }}
                            placeholder="you@example.com"
                          />
                        </label>
                        <label>
                          Phone
                          <input
                            type="tel"
                            value={contactPhone}
                            onChange={e => setContactPhone(e.target.value)}
                            placeholder="(555) 555-5555"
                          />
                        </label>
                      </div>
                      {contactError && (
                        <p className="contact-error">{contactError}</p>
                      )}
                      <div className="contact-actions">
                        <button
                          className="btn btn-primary"
                          onClick={async () => {
                            if (!contactEmail.trim()) {
                              setContactError("Email is required to continue.");
                              return;
                            }
                            if (!isValidEmail(contactEmail)) {
                              setContactError("Enter a valid email address.");
                              return;
                            }
                            if (contactPhone.trim() && !isValidPhone(contactPhone)) {
                              setContactError("Enter a valid phone number.");
                              return;
                            }
                            setContactError("");
                            setShowContactForm(false);
                            setContactSubmitted(true);
                            await submitContact();
                            await sendAllToBackend();
                          }}
                          disabled={submitting}
                        >
                          Continue to your report
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
};

export default VoiceInterview;
