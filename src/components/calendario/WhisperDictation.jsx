import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Mic, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { base44 } from '@/api/base44Client';

const CHUNK_INTERVAL = 2000; // 2 secondi

export default function WhisperDictation({ onTranscription, isDictating, setIsDictating }) {
  const [isTranscribing, setIsTranscribing] = useState(false);
  const streamRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const intervalRef = useRef(null);
  const activeRef = useRef(false);
  const pendingRequests = useRef(0);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopDictation();
    };
  }, []);

  const sendChunk = useCallback(async (blob) => {
    if (blob.size < 1000) return; // skip chunk troppo piccoli (silenzio)
    
    pendingRequests.current += 1;
    setIsTranscribing(true);

    const formData = new FormData();
    formData.append('audio', blob, 'chunk.webm');

    const response = await base44.functions.invoke('transcribeAudio', formData);
    const text = response?.data?.text?.trim();
    
    if (text && text.length > 0) {
      onTranscription(text);
    }

    pendingRequests.current -= 1;
    if (pendingRequests.current <= 0) {
      pendingRequests.current = 0;
      setIsTranscribing(false);
    }
  }, [onTranscription]);

  const startDictation = useCallback(async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    streamRef.current = stream;
    activeRef.current = true;
    setIsDictating(true);
    if (navigator.vibrate) navigator.vibrate(80);

    const startNewRecorder = () => {
      if (!activeRef.current) return;

      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' });
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        sendChunk(blob);
        // Avvia il prossimo recorder se ancora attivo
        if (activeRef.current) {
          startNewRecorder();
        }
      };

      mediaRecorderRef.current = recorder;
      recorder.start();

      // Stop dopo CHUNK_INTERVAL per inviare il chunk
      intervalRef.current = setTimeout(() => {
        if (recorder.state === 'recording') {
          recorder.stop();
        }
      }, CHUNK_INTERVAL);
    };

    startNewRecorder();
  }, [sendChunk, setIsDictating]);

  const stopDictation = useCallback(() => {
    activeRef.current = false;
    clearTimeout(intervalRef.current);
    
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    
    setIsDictating(false);
    if (navigator.vibrate) navigator.vibrate([50, 30, 50]);
  }, [setIsDictating]);

  const toggle = useCallback((e) => {
    e.preventDefault();
    if (isDictating) {
      stopDictation();
    } else {
      startDictation();
    }
  }, [isDictating, startDictation, stopDictation]);

  return (
    <>
      {/* Bottone microfono */}
      <button 
        onTouchEnd={toggle}
        onClick={toggle}
        className={cn(
          "p-1.5 rounded-full transition-colors",
          isDictating ? "bg-cyan-500/20 ring-2 ring-cyan-400" : "hover:bg-slate-800"
        )}
      >
        <Mic className={cn(
          "w-5 h-5 transition-colors",
          isDictating ? "text-cyan-400 animate-pulse" : "text-slate-400"
        )} />
      </button>

      {/* Indicatore trascrizione in corso sotto la toolbar */}
      {(isDictating || isTranscribing) && (
        <div className="absolute left-0 right-0 -bottom-7 flex items-center justify-center gap-1.5">
          {isTranscribing ? (
            <>
              <Loader2 className="w-3 h-3 text-cyan-400 animate-spin" />
              <span className="text-[10px] text-cyan-400 font-mono">trascrivo...</span>
            </>
          ) : (
            <>
              <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
              <span className="text-[10px] text-cyan-400 font-mono">ascolto...</span>
            </>
          )}
        </div>
      )}
    </>
  );
}