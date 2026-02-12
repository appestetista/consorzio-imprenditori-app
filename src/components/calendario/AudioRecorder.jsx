import React, { useState, useRef, useEffect } from 'react';
import { Circle, Play, Square, Pause } from 'lucide-react';
import { cn } from '@/lib/utils';
import { base44 } from '@/api/base44Client';

function formatTime(seconds) {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = Math.floor(seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

export default function AudioRecorder({ onAudioSaved, onTranscription }) {
  const [isRecording, setIsRecording] = useState(false);
  const [audioURL, setAudioURL] = useState(null);
  const [audioBlob, setAudioBlob] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [recordTime, setRecordTime] = useState(0);
  const [playTime, setPlayTime] = useState(0);
  const [duration, setDuration] = useState(0);


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

      // Salva solo l'audio come allegato, nessuna trascrizione
      const file = new File([blob], 'audio_nota.webm', { type: 'audio/webm' });
      const { file_url } = await base44.integrations.Core.UploadFile({ file });

      if (onAudioSaved) {
        onAudioSaved({ url: file_url, name: 'audio_nota.webm', type: 'audio/webm' });
      }
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



  const progressPercent = duration > 0 ? (playTime / duration) * 100 : 0;

  return (
    <div>
      <div className="flex items-center gap-1.5">
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
      </div>


    </div>
  );
}