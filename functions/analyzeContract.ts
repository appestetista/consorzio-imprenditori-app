import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import OpenAI from 'npm:openai';

const openai = new OpenAI({
    apiKey: Deno.env.get("OPENAI_API_KEY"),
});

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { file_urls } = await req.json();

        if (!file_urls || file_urls.length === 0) {
            return Response.json({ error: 'No files provided' }, { status: 400 });
        }

        console.log(`Analyzing ${file_urls.length} contract(s) for user: ${user.email}`);

        // Scarica i file e convertili in base64
        const fileContents = [];
        for (const url of file_urls) {
            try {
                const fileResponse = await fetch(url);
                const arrayBuffer = await fileResponse.arrayBuffer();
                const uint8Array = new Uint8Array(arrayBuffer);
                let binary = '';
                for (let i = 0; i < uint8Array.length; i++) {
                    binary += String.fromCharCode(uint8Array[i]);
                }
                const base64 = btoa(binary);
                
                // Determina il tipo di file
                const isPdf = url.toLowerCase().includes('.pdf') || fileResponse.headers.get('content-type')?.includes('pdf');
                const isImage = url.match(/\.(jpg|jpeg|png|gif|webp)$/i) || fileResponse.headers.get('content-type')?.includes('image');
                
                fileContents.push({
                    base64,
                    isPdf,
                    isImage,
                    contentType: fileResponse.headers.get('content-type') || (isPdf ? 'application/pdf' : 'image/jpeg')
                });
            } catch (fetchErr) {
                console.error(`Error fetching file ${url}:`, fetchErr.message);
            }
        }

        if (fileContents.length === 0) {
            return Response.json({ error: 'Could not fetch any files' }, { status: 400 });
        }

        // Prepara i messaggi
        const content = [
            {
                type: "text",
                text: `Sei un esperto legale italiano. Analizza ${fileContents.length > 1 ? 'questi contratti' : 'questo contratto'} e fornisci:
1. Tipo di contratto
2. Parti coinvolte
3. Oggetto del contratto
4. Durata e scadenze importanti
5. Clausole principali
6. Eventuali criticità o punti di attenzione
7. Consigli per il cliente

Sii dettagliato ma chiaro, usando un linguaggio comprensibile.

Rispondi SOLO con un JSON valido nel seguente formato:
{
    "tipo_contratto": "string",
    "parti_coinvolte": ["string"],
    "oggetto": "string",
    "durata": "string",
    "scadenze": ["string"],
    "clausole_principali": ["string"],
    "criticita": ["string"],
    "consigli": ["string"],
    "riepilogo": "string"
}`
            }
        ];

        // Aggiungi ogni file come base64
        for (const file of fileContents) {
            if (file.isPdf) {
                // Per i PDF, usa il formato data URL con base64
                content.push({
                    type: "image_url",
                    image_url: {
                        url: `data:application/pdf;base64,${file.base64}`,
                        detail: "high"
                    }
                });
            } else {
                // Per le immagini
                const mimeType = file.contentType.includes('png') ? 'image/png' : 
                                 file.contentType.includes('gif') ? 'image/gif' : 
                                 file.contentType.includes('webp') ? 'image/webp' : 'image/jpeg';
                content.push({
                    type: "image_url",
                    image_url: {
                        url: `data:${mimeType};base64,${file.base64}`,
                        detail: "high"
                    }
                });
            }
        }

        const response = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
                {
                    role: "user",
                    content: content
                }
            ],
            max_tokens: 4096,
            temperature: 0.3
        });

        const responseText = response.choices[0].message.content;
        
        // Estrai JSON dalla risposta
        let analysis;
        try {
            // Prova a parsare direttamente
            analysis = JSON.parse(responseText);
        } catch {
            // Se fallisce, cerca il JSON nella risposta
            const jsonMatch = responseText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                analysis = JSON.parse(jsonMatch[0]);
            } else {
                throw new Error('Could not parse analysis response');
            }
        }

        // Log usage per tracking costi
        const usage = response.usage;
        console.log(`Tokens used - Input: ${usage?.prompt_tokens}, Output: ${usage?.completion_tokens}`);

        return Response.json(analysis);

    } catch (error) {
        console.error('Contract analysis error:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});