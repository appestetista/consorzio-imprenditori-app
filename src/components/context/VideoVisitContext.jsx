import React, { createContext, useContext, useState, useEffect } from 'react';

const VideoVisitContext = createContext();

export function VideoVisitProvider({ children }) {
  // Usa timestamp invece di booleano per confronto con nuovi video
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
    setLastVisitTimestamp(Date.now());
  };

  // Controlla se ci sono video nuovi rispetto all'ultima visita
  const hasNewVideosSince = (latestVideoDate) => {
    if (!lastVisitTimestamp || !latestVideoDate) return true;
    return new Date(latestVideoDate).getTime() > lastVisitTimestamp;
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