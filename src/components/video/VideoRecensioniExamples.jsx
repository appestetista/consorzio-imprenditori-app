import React, { useState } from 'react';
import { Play, X } from 'lucide-react';

const EXAMPLE_VIDEOS = [
  {
    id: 'Epmg-w3dWZ8',
    title: 'Testimonianza 1',
  },
  {
    id: '9nco_qVdoY4',
    title: 'Testimonianza 2',
  },
];

export default function VideoRecensioniExamples() {
  const [playingId, setPlayingId] = useState(null);

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-white font-bold text-sm">Guarda alcuni esempi</h3>
        <span className="text-slate-500 text-xs">{EXAMPLE_VIDEOS.length} video</span>
      </div>

      {/* Grid affiancata */}
      <div className="grid grid-cols-2 gap-3">
        {EXAMPLE_VIDEOS.map((video) => (
          <div key={video.id} className="relative group">
            {/* Thumbnail con play overlay */}
            {playingId === video.id ? (
              <div className="relative aspect-[9/16] rounded-xl overflow-hidden bg-black">
                <iframe
                  src={`https://www.youtube.com/embed/${video.id}?autoplay=1`}
                  title={video.title}
                  className="absolute inset-0 w-full h-full"
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
                <button
                  onClick={() => setPlayingId(null)}
                  className="absolute top-2 right-2 z-10 bg-black/60 rounded-full p-1"
                >
                  <X className="w-3.5 h-3.5 text-white" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setPlayingId(video.id)}
                className="relative aspect-[9/16] rounded-xl overflow-hidden bg-slate-800 border border-slate-700 w-full group-hover:border-[#d4af37]/50 transition-colors"
              >
                <img
                  src={`https://img.youtube.com/vi/${video.id}/0.jpg`}
                  alt={video.title}
                  className="absolute inset-0 w-full h-full object-cover"
                />
                {/* Dark overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                {/* Play button */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-12 h-12 bg-[#d4af37]/90 rounded-full flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                    <Play className="w-5 h-5 text-slate-900 ml-0.5" fill="currentColor" />
                  </div>
                </div>
                {/* Title */}
                <div className="absolute bottom-0 left-0 right-0 p-2.5">
                  <p className="text-white text-xs font-semibold">{video.title}</p>
                </div>
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}