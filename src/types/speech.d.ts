// Augments the global Window interface to include webkit-prefixed SpeechRecognition.
// The full SpeechRecognition, SpeechRecognitionEvent, SpeechRecognitionResultList,
// SpeechRecognitionResult, and SpeechRecognitionAlternative types are provided by
// @types/dom-speech-recognition (and TypeScript's built-in lib.dom.d.ts).

interface Window {
  SpeechRecognition: new () => SpeechRecognition;
  webkitSpeechRecognition: new () => SpeechRecognition;
}
