import React, { createContext, useContext, useState, useEffect } from 'react';

const VideoVisitContext = createContext();

export function VideoVisitProvider({ children }) {
  // Inizializza dallo storage locale per persistenza immediata
  const [hasVisitedVideos, setHasVisitedVideos] = useState(() => {
    const stored = sessionStorage.getItem('hasVisitedVideos');
    return stored === 'true';
  });

  // Sincronizza con sessionStorage
  useEffect(() => {
    sessionStorage.setItem('hasVisitedVideos', hasVisitedVideos.toString());
  }, [hasVisitedVideos]);

  const markVideosAsVisited = () => {
    setHasVisitedVideos(true);
  };

  const resetVideoVisit = () => {
    setHasVisitedVideos(false);
    sessionStorage.removeItem('hasVisitedVideos');
  };

  return (
    <VideoVisitContext.Provider value={{ 
      hasVisitedVideos, 
      markVideosAsVisited,
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