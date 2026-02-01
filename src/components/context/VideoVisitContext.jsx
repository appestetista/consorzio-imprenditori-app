import React, { createContext, useContext, useState, useEffect } from 'react';

const VideoVisitContext = createContext();

export function VideoVisitProvider({ children }) {
  // Usa timestamp invece di booleano per confronto con nuovi video (sessione corrente)
  const [lastVisitTimestamp, setLastVisitTimestamp] = useState(() => {
    const stored = sessionStorage.getItem('videoVisitTimestamp');
    return stored ? parseInt(stored, 10) : null;
  });

  // Sincronizza con sessionStorage
  useEffect(() => {
    if (lastVisitTimestamp) {
      sessionStorage.setItem('videoVisitTimestamp', lastVisitTimestamp.toString());
    }
  }, [lastVisitTimestamp]);

  const markVideosAsVisited = () => {
    const now = Date.now();
    console.log('[VideoVisitContext] markVideosAsVisited - timestamp:', now);
    setLastVisitTimestamp(now);
  };

  // Controlla se ci sono video nuovi rispetto all'ultima visita nella SESSIONE
  // Ritorna true se il video più recente è stato creato DOPO l'ultima visita (sessione)
  const hasNewVideosSince = (latestVideoDate) => {
    if (!lastVisitTimestamp || !latestVideoDate) return true;
    const videoTime = new Date(latestVideoDate).getTime();
    const result = videoTime > lastVisitTimestamp;
    console.log('[VideoVisitContext] hasNewVideosSince:', { latestVideoDate, lastVisitTimestamp, videoTime, result });
    return result;
  };

  const resetVideoVisit = () => {
    setLastVisitTimestamp(null);
    sessionStorage.removeItem('videoVisitTimestamp');
  };

  return (
    <VideoVisitContext.Provider value={{ 
      lastVisitTimestamp,
      markVideosAsVisited,
      hasNewVideosSince,
      resetVideoVisit
    }}>
      {children}
    </VideoVisitContext.Provider>
  );
}

export function useVideoVisit() {
  const context = useContext(VideoVisitContext);
  if (!context) {
    throw new Error('useVideoVisit must be used within VideoVisitProvider');
  }
  return context;
}