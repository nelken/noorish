import React, { useEffect, useState } from "react";

const TextToSpeech: React.FC = () => {
  const [text, setText] = useState("");
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<string>("");
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Load available voices
  useEffect(() => {
    const synth = window.speechSynthesis;

    const loadVoices = () => {
      const availableVoices = synth.getVoices();
      setVoices(availableVoices);
      if (availableVoices.length && !selectedVoice) {
        setSelectedVoice(availableVoices[0].name);
      }
    };

    loadVoices();
    // Some browsers load voices async
    if (typeof synth !== "undefined" && typeof synth.onvoiceschanged !== "undefined") {
      synth.onvoiceschanged = loadVoices;
    }
  }, [selectedVoice]);

  const handleSpeak = () => {
    if (!text.trim()) return;
    const synth = window.speechSynthesis;

    // Stop any ongoing speech
    if (synth.speaking) {
      synth.cancel();
    }

    const utterance = new SpeechSynthesisUtterance(text);
    const voice = voices.find((v) => v.name === selectedVoice);
    if (voice) {
      utterance.voice = voice;
    }

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    synth.speak(utterance);
  };

  const handleStop = () => {
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  };

  const handleVoiceChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedVoice(event.target.value);
  };

  return (
    <div className="max-w-xl mx-auto space-y-4 p-4">
      <h1 className="text-2xl font-bold">Simple Text-to-Speech</h1>

      <label className="block text-sm font-medium mb-1">
        Enter text to speak:
      </label>
      <textarea
        className="w-full border rounded p-2 min-h-[120px] outline-none focus:ring focus:ring-offset-0"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Type something here…"
      />

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex-1">
          <label className="block text-sm font-medium mb-1">Voice</label>
          <select
            className="w-full border rounded p-2"
            value={selectedVoice}
            onChange={handleVoiceChange}
          >
            {voices.map((voice) => (
              <option key={voice.voiceURI} value={voice.name}>
                {voice.name} {voice.lang ? `(${voice.lang})` : ""}
              </option>
            ))}
            {voices.length === 0 && (
              <option>Loading voices…</option>
            )}
          </select>
        </div>

        <div className="flex gap-2 mt-2 sm:mt-6">
          <button
            onClick={handleSpeak}
            disabled={!text.trim() || isSpeaking}
            className="px-4 py-2 rounded-lg border disabled:opacity-50"
          >
            {isSpeaking ? "Speaking…" : "Speak"}
          </button>
          <button
            onClick={handleStop}
            disabled={!isSpeaking}
            className="px-4 py-2 rounded-lg border"
          >
            Stop
          </button>
        </div>
      </div>
    </div>
  );
};

export default TextToSpeech;