import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Mic, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { base44 } from '@/api/base44Client';

export default function WhisperDictation({ onTranscription, isDictating, setIsDictating }) {
  const [isTranscribing, setIsTranscribing] = useState(false);
  const streamRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);

  useEffect(() => {
    return () => stopDictation();
  }, []);

  const startDictation = useCallback(async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    streamRef.current = stream;
    chunksRef.current = [];

    const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' });
    mediaRecorderRef.current = recorder;

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };

    recorder.onstop = async () => {
      // Ferma microfono
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      }

      const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
      if (blob.size < 1000) return; // niente audio utile

      // Una sola trascrizione alla fine
      setIsTranscribing(true);
      const file = new File([blob], 'dictation.webm', { type: 'audio/webm' });
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      const response = await base44.functions.invoke('transcribeAudio', { file_url });
      const text = response?.data?.text?.trim();

      if (text && text.length > 0) {
        onTranscription(text);
      }
      setIsTranscribing(false);
    };

    recorder.start();
    setIsDictating(true);
    if (navigator.vibrate) navigator.vibrate(80);
  }, [onTranscription, setIsDictating]);

  const stopDictation = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop(); // trigger onstop → trascrizione
    } else {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      }
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