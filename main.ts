import { streamPlay } from "./streamPlay.ts";
import { makeStreamer } from "./ollama_client.ts";
import { sentences as splitSentences } from 'npm:@ckirby/sbd';
import { Ollama } from "npm:ollama";

function makeSentenceChunker(onSentence: (sentence: string) => Promise<void>) {
  let buffer = '';

  return async function onChunk(chunk: string, isFinal: boolean = false) {
    buffer += chunk;
    const sentences = splitSentences(buffer);
    if (sentences.length > 1 || isFinal) {
      await onSentence(sentences[0].trim());
      buffer = sentences.slice(1).join('');
    }
  }
}

async function readSentence(sentence: string): Promise<void> {
  await streamPlay(sentence);
}

const chunker = makeSentenceChunker(readSentence);
const stream = makeStreamer(new Ollama(), 'You are an inventor is silly stories that make very little sense but are fun shaggy dog tales.', 'phi3.5', chunker);

if (import.meta.main) {
  const response = await stream('Tell me a story about anything.');
  console.log(response);
}