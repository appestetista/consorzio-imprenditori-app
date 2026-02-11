import React, { useState, useRef, useEffect } from 'react';
import { Circle, Play, Square, Pause } from 'lucide-react';
import { cn } from '@/lib/utils';
import { base44 } from '@/api/base44Client';

function formatTime(seconds) {
  const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
  const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
  const s = Math.floor(seconds % 60).toString().padStart(2, '0');
  return `${h}:${m}:${s}`;
}

export default function AudioRecorder({ onAudioSaved, onTranscription }) {
  const [isRecording, setIsRecording] = useState(false);
  const [audioURL, setAudioURL] = useState(null);
  const [audioBlob, setAudioBlob] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [recordTime, setRecordTime] = useState(0);
  const [playTime, setPlayTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isTranscribing, setIsTranscribing] = useState(false);

  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const audioRef = useRef(null);
  const playTimerRef = useRef(null);

  // Cleanup
  useEffect(() => {
    return () => {
      clearInterval(timerRef.current);
      clearInterval(playTimerRef.current);
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, []);

  const startRecording = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mediaRecorder = new MediaRecorder(stream);
    mediaRecorderRef.current = mediaRecorder;
    chunksRef.current = [];

    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };

    mediaRecorder.onstop = async () => {
      const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
      const url = URL.createObjectURL(blob);
      setAudioBlob(blob);
      setAudioURL(url);
      setDuration(recordTime);
      stream.getTracks().forEach(t => t.stop());

      // Trascrizione automatica dopo lo stop
      setIsTranscribing(true);
      const file = new File([blob], 'audio_nota.webm', { type: 'audio/webm' });
      const { file_url } = await base44.integrations.Core.UploadFile({ file });

      if (onAudioSaved) {
        onAudioSaved({ url: file_url, name: 'audio_nota.webm', type: 'audio/webm' });
      }

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: "Trascrivi fedelmente l'audio allegato in italiano. Restituisci solo il testo trascritto, senza commenti.",
        file_urls: [file_url]
      });

      if (onTranscription && result) {
        onTranscription(typeof result === 'string' ? result : result.text || '');
      }
      setIsTranscribing(false);
    };

    mediaRecorder.start();
    setIsRecording(true);
    setRecordTime(0);
    setAudioURL(null);
    setAudioBlob(null);
    setPlayTime(0);

    timerRef.current = setInterval(() => {
      setRecordTime(prev => prev + 1);
    }, 1000);
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      clearInterval(timerRef.current);
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const playAudio = () => {
    if (!audioURL) return;
    if (audioRef.current) {
      audioRef.current.pause();
    }
    const audio = new Audio(audioURL);
    audioRef.current = audio;
    setIsPlaying(true);
    setPlayTime(0);

    playTimerRef.current = setInterval(() => {
      setPlayTime(prev => {
        if (prev >= duration) {
          clearInterval(playTimerRef.current);
          setIsPlaying(false);
          return 0;
        }
        return prev + 1;
      });
    }, 1000);

    audio.onended = () => {
      clearInterval(playTimerRef.current);
      setIsPlaying(false);
      setPlayTime(0);
    };

    audio.play();
  };

  const pauseAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      clearInterval(playTimerRef.current);
      setIsPlaying(false);
    }
  };

  // Salva audio e trascrivi
  const saveAndTranscribe = async () => {
    if (!audioBlob) return;
    setIsTranscribing(true);

    // Upload audio
    const file = new File([audioBlob], 'audio_nota.webm', { type: 'audio/webm' });
    const { file_url } = await base44.integrations.Core.UploadFile({ file });

    if (onAudioSaved) {
      onAudioSaved({ url: file_url, name: 'audio_nota.webm', type: 'audio/webm' });
    }

    // Trascrivi con LLM
    const result = await base44.integrations.Core.InvokeLLM({
      prompt: "Trascrivi fedelmente l'audio allegato in italiano. Restituisci solo il testo trascritto, senza commenti.",
      file_urls: [file_url]
    });

    if (onTranscription && result) {
      onTranscription(typeof result === 'string' ? result : result.text || '');
    }

    setIsTranscribing(false);
  };

  const progressPercent = duration > 0 ? (playTime / duration) * 100 : 0;

  return (
    <div className="mb-2">
      <div className="flex items-center gap-2 bg-slate-800/60 rounded-lg px-2 py-1.5">
        {/* Pulsante REC */}
        <button
          onClick={isRecording ? stopRecording : startRecording}
          className={cn(
            "w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 transition-all",
            isRecording 
              ? "bg-red-500 animate-pulse" 
              : "bg-slate-700 hover:bg-slate-600"
          )}
        >
          {isRecording ? (
            <Square className="w-3 h-3 text-white" fill="white" />
          ) : (
            <Circle className="w-4 h-4 text-red-500" fill="#ef4444" />
          )}
        </button>

        {/* Separatore */}
        <div className="w-[1px] h-5 bg-slate-600 flex-shrink-0" />

        {/* Pulsante Play/Pause */}
        <button
          onClick={isPlaying ? pauseAudio : playAudio}
          disabled={!audioURL}
          className={cn(
            "w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 transition-all",
            audioURL 
              ? "bg-slate-700 hover:bg-slate-600" 
              : "bg-slate-800 opacity-40"
          )}
        >
          {isPlaying ? (
            <Pause className="w-3.5 h-3.5 text-white" fill="white" />
          ) : (
            <Play className="w-3.5 h-3.5 text-white ml-0.5" fill="white" />
          )}
        </button>

        {/* Progress bar */}
        <div className="flex-1 mx-1">
          <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
            <div 
              className="h-full bg-slate-400 rounded-full transition-all"
              style={{ width: `${isRecording ? 100 : progressPercent}%` }}
            />
          </div>
        </div>

        {/* Timer */}
        <span className="text-[10px] text-slate-400 font-mono flex-shrink-0 min-w-[80px] text-right">
          {isRecording 
            ? formatTime(recordTime)
            : audioURL 
              ? `${formatTime(playTime)} / ${formatTime(duration)}`
              : '00:00:00'
          }
        </span>
      </div>

      {/* Pulsante trascrivi - solo se c'è audio registrato */}
      {audioURL && !isRecording && (
        <button
          onClick={saveAndTranscribe}
          disabled={isTranscribing}
          className={cn(
            "mt-1.5 w-full py-1.5 rounded-lg text-[11px] font-semibold transition-all",
            isTranscribing 
              ? "bg-slate-700 text-slate-400 animate-pulse" 
              : "bg-lime-500/20 text-lime-400 hover:bg-lime-500/30 active:bg-lime-500/40"
          )}
        >
          {isTranscribing ? "Trascrizione in corso..." : "💬 Salva e Trascrivi"}
        </button>
      )}
    </div>
  );
}