import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import OpenAI from 'npm:openai@4.40.0';

const openai = new OpenAI({
  apiKey: Deno.env.get("OPENAI_API_KEY"),
});

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { file_url } = await req.json();

  if (!file_url) {
    return Response.json({ error: 'No file_url provided' }, { status: 400 });
  }

  // Download the audio file from the URL
  const audioResponse = await fetch(file_url);
  const audioBuffer = await audioResponse.arrayBuffer();
  const file = new File([audioBuffer], 'audio.webm', { type: 'audio/webm' });

  const transcription = await openai.audio.transcriptions.create({
    file: file,
    model: 'whisper-1',
    language: 'it',
    response_format: 'verbose_json',
  });

  // Filtra aggressivamente segmenti dove Whisper ha inventato testo dal silenzio
  const validSegments = (transcription.segments || []).filter(seg => {
    // no_speech_prob alta = silenzio, Whisper allucina
    if (seg.no_speech_prob > 0.5) return false;
    // avg_logprob troppo basso = testo poco affidabile / allucinato
    if (seg.avg_logprob < -0.8) return false;
    // compression_ratio troppo alto = testo ripetitivo inventato
    if (seg.compression_ratio > 2.2) return false;
    return true;
  });

  const cleanText = validSegments.map(s => s.text).join(' ').trim();
  return Response.json({ text: cleanText });
});