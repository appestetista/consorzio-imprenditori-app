import React from 'react';
import { Play } from 'lucide-react';
import { Card } from '@/components/ui/card';

const EXAMPLE_VIDEOS = [
  {
    id: 'Epmg-w3dWZ8',
    title: 'Video Testimonianza 1',
    type: 'short',
  },
  {
    id: 'GzWJRPdVwmo',
    title: 'Video Recensioni',
    type: 'video',
  },
];

export default function VideoRecensioniExamples() {
  return (
    <div className="mb-6">
      <h3 className="text-white font-bold text-center mb-3">Esempi di Video Recensioni</h3>
      <div className="space-y-4">
        {EXAMPLE_VIDEOS.map((video) => (
          <Card key={video.id} className="bg-[#0a2540] border-[#1a3a5c] overflow-hidden">
            <div className="bg-[#0d2d4a] px-3 py-2 border-b border-[#1a3a5c]">
              <h4 className="text-white font-semibold text-sm">{video.title}</h4>
            </div>
            <div className={`relative ${video.type === 'short' ? 'aspect-[9/16] max-h-[480px] mx-auto max-w-[270px]' : 'aspect-video'}`}>
              <iframe
                src={`https://www.youtube.com/embed/${video.id}`}
                title={video.title}
                className="absolute inset-0 w-full h-full"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}