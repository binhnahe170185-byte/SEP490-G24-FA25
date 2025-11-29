import React, { useState, useEffect, useRef } from "react";
import { Button, message } from "antd";
import { AudioOutlined, StopOutlined } from "@ant-design/icons";

const SpeechToText = ({ onTranscript, language = "vi-VN", initialText = "" }) => {
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef(null);
  const isManuallyStoppedRef = useRef(false);
  const fullTranscriptRef = useRef(initialText || ""); // Complete accumulated transcript
  const interimBufferRef = useRef(""); // Buffer for interim results
  const isListeningRef = useRef(false);
  const noSpeechTimeoutRef = useRef(null); // Timeout for auto-stop when no speech detected
  const lastResultTimeRef = useRef(null); // Track when last result was received
  const silenceTimeoutRef = useRef(null); // Timeout to finalize interim results after silence

  const hasSpeechRecognition =
    typeof window !== "undefined" &&
    (window.SpeechRecognition || window.webkitSpeechRecognition);

  // Sync initialText with fullTranscriptRef when not listening
  useEffect(() => {
    if (!isListeningRef.current && initialText !== undefined) {
      fullTranscriptRef.current = initialText || "";
    }
  }, [initialText]);

  useEffect(() => {
    if (!hasSpeechRecognition) {
      console.warn("Speech Recognition API is not supported in this browser");
      return;
    }

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = language;

    // Helper function to finalize interim buffer
    const finalizeInterimBuffer = () => {
      if (interimBufferRef.current.trim()) {
        fullTranscriptRef.current += interimBufferRef.current.trim() + " ";
        interimBufferRef.current = "";
        // Update parent with complete transcript
        if (onTranscript) {
          onTranscript(fullTranscriptRef.current.trim());
        }
      }
    };

    // Helper function to update transcript display
    const updateTranscriptDisplay = () => {
      const completeTranscript = fullTranscriptRef.current.trim() + 
        (interimBufferRef.current ? " " + interimBufferRef.current : "");
      if (onTranscript) {
        onTranscript(completeTranscript);
      }
    };

    // Helper function to reset and set timeout
    const resetNoSpeechTimeout = () => {
      if (noSpeechTimeoutRef.current) {
        clearTimeout(noSpeechTimeoutRef.current);
      }
      noSpeechTimeoutRef.current = setTimeout(() => {
        if (isListeningRef.current && !isManuallyStoppedRef.current) {
          const timeSinceLastResult = Date.now() - (lastResultTimeRef.current || Date.now());
          if (timeSinceLastResult >= 4000) {
            console.log("Auto-stopping: No speech detected for 4 seconds");
            // Finalize any pending interim results
            finalizeInterimBuffer();
            isManuallyStoppedRef.current = true;
            isListeningRef.current = false;
            setIsListening(false);
            try {
              recognition.stop();
              if (typeof recognition.abort === "function") {
                recognition.abort();
              }
              message.warning("Recording stopped: No speech detected.");
            } catch (error) {
              console.log("Auto-stop error:", error);
            }
          }
        }
      }, 4000);
    };

    recognition.onstart = () => {
      isListeningRef.current = true;
      setIsListening(true);
      lastResultTimeRef.current = Date.now();
      interimBufferRef.current = ""; // Clear interim buffer on start
      message.info("Recording...", 0.6);
      
      // Set initial timeout
      resetNoSpeechTimeout();
    };

    recognition.onresult = (event) => {
      // Update last result time
      lastResultTimeRef.current = Date.now();
      
      // Reset no-speech timeout since we got a result
      resetNoSpeechTimeout();

      // Clear silence timeout (we have new results)
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current);
        silenceTimeoutRef.current = null;
      }

      // Process all new results from event.resultIndex
      let newFinalText = "";
      let newInterimText = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const transcript = result[0].transcript;

        if (result.isFinal) {
          // Final result: add to accumulated transcript immediately
          newFinalText += transcript.trim() + " ";
        } else {
          // Interim result: add to interim buffer
          newInterimText += transcript;
        }
      }

      // Update full transcript with new final text
      if (newFinalText) {
        // Finalize any existing interim buffer first
        finalizeInterimBuffer();
        // Add new final text
        fullTranscriptRef.current += newFinalText;
      }

      // Update interim buffer with new interim text
      if (newInterimText) {
        interimBufferRef.current = newInterimText;
      }

      // Update display with complete transcript (final + interim)
      updateTranscriptDisplay();

      // Set timeout to finalize interim results after 2 seconds of silence
      if (newInterimText && !newFinalText) {
        if (silenceTimeoutRef.current) {
          clearTimeout(silenceTimeoutRef.current);
        }
        silenceTimeoutRef.current = setTimeout(() => {
          // If interim buffer hasn't been updated in 2 seconds, finalize it
          finalizeInterimBuffer();
        }, 2000);
      }
    };

    recognition.onerror = (event) => {
      // Clear timeouts on error
      if (noSpeechTimeoutRef.current) {
        clearTimeout(noSpeechTimeoutRef.current);
        noSpeechTimeoutRef.current = null;
      }
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current);
        silenceTimeoutRef.current = null;
      }

      // Ignore aborted errors when manually stopped
      if (event.error === "aborted" && isManuallyStoppedRef.current) {
        return;
      }

      console.error("Speech recognition error:", event.error);
      isListeningRef.current = false;
      setIsListening(false);

      if (event.error === "no-speech" && !isManuallyStoppedRef.current) {
        // Don't stop immediately on no-speech, let timeout handle it
        // Just log it
        console.log("No speech detected, waiting for timeout...");
      } else if (event.error === "not-allowed") {
        message.error("Microphone permission was denied by the browser.");
      } else if (!isManuallyStoppedRef.current && event.error !== "no-speech") {
        message.error(`Speech recognition error: ${event.error}`);
      }
    };

    recognition.onend = () => {
      // Clear timeouts on end
      if (noSpeechTimeoutRef.current) {
        clearTimeout(noSpeechTimeoutRef.current);
        noSpeechTimeoutRef.current = null;
      }
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current);
        silenceTimeoutRef.current = null;
      }

      // Finalize any pending interim results
      finalizeInterimBuffer();

      isListeningRef.current = false;
      setIsListening(false);

      // Tắt auto-restart - không tự động restart khi onend được gọi
      // User phải tự bấm Record lại nếu muốn tiếp tục
      isManuallyStoppedRef.current = false;
    };

    recognitionRef.current = recognition;

    return () => {
      // Clear all timeouts on cleanup
      if (noSpeechTimeoutRef.current) {
        clearTimeout(noSpeechTimeoutRef.current);
        noSpeechTimeoutRef.current = null;
      }
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current);
        silenceTimeoutRef.current = null;
      }

      if (recognitionRef.current) {
        // Clean up event handlers
        recognitionRef.current.onstart = null;
        recognitionRef.current.onresult = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.onend = null;
        try {
          isManuallyStoppedRef.current = true;
          recognitionRef.current.stop();
          if (typeof recognitionRef.current.abort === "function") {
            recognitionRef.current.abort();
          }
        } catch (error) {
          console.log("Cleanup stop recognition error:", error);
        }
      }
      recognitionRef.current = null;
    };
  }, [language, onTranscript, hasSpeechRecognition]);

  const startListening = () => {
    if (recognitionRef.current && !isListeningRef.current) {
      try {
        // Don't reset transcript - keep existing text to append to it
        // Initialize with current text from parent if provided
        if (initialText && fullTranscriptRef.current !== initialText) {
          fullTranscriptRef.current = initialText;
        }
        interimBufferRef.current = ""; // Clear interim buffer
        isManuallyStoppedRef.current = false;
        recognitionRef.current.start();
      } catch (error) {
        console.error("Error starting recognition:", error);
        message.error("Unable to start recording.");
        isListeningRef.current = false;
        setIsListening(false);
      }
    }
  };

  const stopListening = () => {
    if (recognitionRef.current && isListeningRef.current) {
      // Clear all timeouts
      if (noSpeechTimeoutRef.current) {
        clearTimeout(noSpeechTimeoutRef.current);
        noSpeechTimeoutRef.current = null;
      }
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current);
        silenceTimeoutRef.current = null;
      }

      // Finalize any pending interim results before stopping
      if (interimBufferRef.current.trim()) {
        fullTranscriptRef.current += interimBufferRef.current.trim() + " ";
        interimBufferRef.current = "";
        // Update parent with complete transcript
        if (onTranscript) {
          onTranscript(fullTranscriptRef.current.trim());
        }
      }

      // Set flag first to prevent auto-restart
      isManuallyStoppedRef.current = true;
      isListeningRef.current = false;
      setIsListening(false);
      
      try {
        recognitionRef.current.stop();
        if (typeof recognitionRef.current.abort === "function") {
          recognitionRef.current.abort();
        }
        message.success("Recording stopped.");
      } catch (error) {
        console.error("Error stopping recognition:", error);
        message.error("Unable to stop recording.");
      }
    }
  };

  if (!hasSpeechRecognition) {
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
