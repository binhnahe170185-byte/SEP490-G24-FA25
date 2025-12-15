import React, { useState, useEffect, useRef } from "react";
import { Button, message } from "antd";
import { AudioOutlined, StopOutlined } from "@ant-design/icons";
import SpeechRecognition, {
  useSpeechRecognition
} from "react-speech-recognition";

const SpeechToText = ({ onTranscript, language = "vi-VN", initialText = "" }) => {
  const [isListening, setIsListening] = useState(false);
  const fullTranscriptRef = useRef(initialText || ""); // Complete accumulated transcript
  const previousFinalTranscriptRef = useRef(""); // Track previous final transcript
  const isInitializedRef = useRef(false);

  // Check if browser supports speech recognition
  const browserSupportsSpeechRecognition = SpeechRecognition.browserSupportsSpeechRecognition();

  // Initialize speech recognition hook
  const {
    transcript,
    interimTranscript,
    finalTranscript,
    listening,
    resetTranscript,
    browserSupportsSpeechRecognition: supportsRecognition
  } = useSpeechRecognition({
    continuous: true,
    interimResults: true,
    language: language
  });

  // Initialize fullTranscriptRef with initialText
  useEffect(() => {
    if (!isInitializedRef.current && initialText !== undefined) {
      fullTranscriptRef.current = initialText || "";
      isInitializedRef.current = true;
    }
  }, [initialText]);

  // Sync initialText with fullTranscriptRef when not listening
  useEffect(() => {
    if (!listening && initialText !== undefined) {
      fullTranscriptRef.current = initialText || "";
      previousFinalTranscriptRef.current = "";
    }
  }, [initialText, listening]);

  // Update transcript when speech recognition results change
  useEffect(() => {
    if (!listening) {
      previousFinalTranscriptRef.current = "";
      return;
    }

    // When we have new final transcript, append it to full transcript
    if (finalTranscript !== previousFinalTranscriptRef.current) {
      // If finalTranscript is shorter than previous, it means transcript was reset
      // In that case, we should not append, just update the tracking
      if (finalTranscript.length < previousFinalTranscriptRef.current.length) {
        previousFinalTranscriptRef.current = finalTranscript;
        return;
      }

      // Get only the new part (what was added since last final transcript)
      const previousLength = previousFinalTranscriptRef.current.length;
      const newFinalText = finalTranscript.slice(previousLength);
      
      if (newFinalText.trim()) {
        // Append new final text to full transcript
        fullTranscriptRef.current = (fullTranscriptRef.current.trim() + " " + newFinalText.trim()).trim();
      }
      
      previousFinalTranscriptRef.current = finalTranscript;
    }

    // Combine full transcript with interim transcript for display
    const displayTranscript = fullTranscriptRef.current + (interimTranscript ? " " + interimTranscript : "");

    // Update parent component with complete transcript (final + interim)
    if (onTranscript) {
      onTranscript(displayTranscript.trim());
    }
  }, [finalTranscript, interimTranscript, listening, onTranscript]);

  // Sync listening state
  useEffect(() => {
    setIsListening(listening);
  }, [listening]);

  // Handle start listening
  const startListening = () => {
    try {
      // Initialize with current text from parent if provided
      if (initialText && fullTranscriptRef.current !== initialText) {
        fullTranscriptRef.current = initialText;
      }
      
      // Reset recognition transcript tracking (but keep our fullTranscriptRef)
      previousFinalTranscriptRef.current = "";
      resetTranscript();

      // Start listening
      SpeechRecognition.startListening({
        continuous: true,
        interimResults: true,
        language: language
      });

      message.info("Recording...", 0.6);
    } catch (error) {
      console.error("[SpeechToText] Error starting recognition:", error);
      message.error("Unable to start recording.");
      setIsListening(false);
    }
  };

  // Handle stop listening
  const stopListening = () => {
    try {
      SpeechRecognition.stopListening();
      
      // Finalize any pending interim results
      if (interimTranscript) {
        fullTranscriptRef.current = (fullTranscriptRef.current.trim() + " " + interimTranscript.trim()).trim();
      }

      // Update parent with final transcript
      if (onTranscript) {
        onTranscript(fullTranscriptRef.current.trim());
      }

      message.success("Recording stopped.");
    } catch (error) {
      console.error("[SpeechToText] Error stopping recognition:", error);
      message.error("Unable to stop recording.");
    }
  };

  if (!browserSupportsSpeechRecognition && !supportsRecognition) {
    return (
      <Button disabled icon={<AudioOutlined />}>
        Speech Recognition not supported
      </Button>
    );
  }

  return (
    <Button
      type={isListening ? "primary" : "default"}
      danger={isListening}
      icon={isListening ? <StopOutlined /> : <AudioOutlined />}
      onClick={isListening ? stopListening : startListening}
      style={{ marginLeft: 8 }}
    >
      {isListening ? "Stop Recording" : "Record"}
    </Button>
  );
};

export default SpeechToText;
