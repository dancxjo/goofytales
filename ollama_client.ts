import { Ollama, Message } from 'npm:ollama';

export type Chunker = (chunk: string, isFinal: boolean) => Promise<void>;
export type Streamer = (messagesOrInstruction: string | Message[], asJson?: boolean, onChunk?: Chunker) => Promise<string>;

const streamToStdout: Chunker = (c, _isFinal) => {
    Deno.stdout.writeSync(new TextEncoder().encode(c));
    return Promise.resolve();
};

export function makeStreamer(ollama: Ollama, systemMessage: string, model: string = 'mistral-small', chunker: Chunker = streamToStdout, promptLogFilename = '', responseLogFilename = '') {
    return async function stream(messagesOrInstruction: string | Message[], asJson = false, onChunk: Chunker = chunker): Promise<string> {
        const chance = Math.random();
        const isWild = chance < 0.25;
        const temp = isWild ? Math.random() : 0.85;

        const messages = typeof messagesOrInstruction === 'string' ? [{ role: 'system', content: systemMessage }, { role: 'user', content: messagesOrInstruction }] : messagesOrInstruction;

        if (promptLogFilename) {
            Deno.writeTextFileSync(promptLogFilename, JSON.stringify({ messages }) + '\n', { append: true });
        }

        const stream = await ollama.chat({ model, messages, stream: true, format: asJson ? 'json' : undefined, options: { temperature: temp } });
        const chunks: string[] = [];
        for await (const chunk of stream) {
            chunks.push(chunk.message.content);
            await onChunk(chunk.message.content, false);
        }
        const response = chunks.join('');
        await onChunk('', true);
        if (responseLogFilename) {
            Deno.writeTextFileSync(responseLogFilename, response + '\n', { append: true });
        }
        return response;
    }
}