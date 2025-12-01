import { useState, useEffect, useRef, useCallback } from 'react';
import { toast } from 'sonner';

interface UseSpeechRecognitionReturn {
  transcript: string;
  isListening: boolean;
  isSupported: boolean;
  error: string | null;
  startListening: () => void;
  stopListening: () => void;
  resetTranscript: () => void;
}

export const useSpeechRecognition = (): UseSpeechRecognitionReturn => {
  const [transcript, setTranscript] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Check if browser supports speech recognition
  const isSupported = typeof window !== 'undefined' && 
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

  useEffect(() => {
    if (!isSupported) return;

    // Initialize speech recognition with proper type checking
    const getSpeechRecognitionAPI = (): any => {
      if (typeof window === 'undefined') return null;

      const standardAPI = (window as any).SpeechRecognition;
      if (standardAPI && typeof standardAPI === 'function') return standardAPI;

      const webkitAPI = (window as any).webkitSpeechRecognition;
      if (webkitAPI && typeof webkitAPI === 'function') return webkitAPI;

      return null;
    };

    const SpeechRecognitionAPI = getSpeechRecognitionAPI();
    if (!SpeechRecognitionAPI) {
      console.error('Speech Recognition API not found');
      setError('Speech recognition is not available');
      return;
    }

    const recognition = new SpeechRecognitionAPI();

    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
      setError(null);
    };

    recognition.onresult = (event: any) => {
      // Clear silence timer when speech is detected
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
      }

      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcriptSegment = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcriptSegment + ' ';
        } else {
          interimTranscript += transcriptSegment;
        }
      }

      // Update transcript with both final and interim results
      setTranscript((prev) => {
        const newTranscript = prev + finalTranscript;
        return newTranscript + interimTranscript;
      });

      // Set silence timer - auto-stop after 3 seconds of no speech
      silenceTimerRef.current = setTimeout(() => {
        if (recognitionRef.current) {
          recognition.stop();
        }
      }, 3000);
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      
      switch (event.error) {
        case 'not-allowed':
        case 'permission-denied':
          setError('Microphone access denied');
          toast.error('Microphone access denied. Please enable it in your browser settings.');
          break;
        case 'no-speech':
          setError('No speech detected');
          break;
        case 'audio-capture':
          setError('No microphone found');
          toast.error('No microphone detected. Please connect a microphone.');
          break;
        case 'network':
          setError('Network error');
          toast.error('Speech recognition error. Please check your connection.');
          break;
        default:
          setError('Speech recognition error');
          toast.error('Speech recognition error. Please try again.');
      }
      
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
      }
    };

    recognitionRef.current = recognition;

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
      }
    };
  }, [isSupported]);

  const startListening = useCallback(() => {
    if (!isSupported) {
      toast.error('Speech recognition is not supported in this browser.');
      return;
    }

    if (recognitionRef.current) {
      try {
        setTranscript('');
        setError(null);
        recognitionRef.current.start();
      } catch (error) {
        console.error('Error starting speech recognition:', error);
        toast.error('Failed to start speech recognition. Please try again.');
      }
    }
  }, [isSupported]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
      }
    }
  }, []);

  const resetTranscript = useCallback(() => {
    setTranscript('');
  }, []);

  return {
    transcript,
    isListening,
    isSupported,
    error,
    startListening,
    stopListening,
    resetTranscript,
  };
};
