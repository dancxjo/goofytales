import { MsEdgeTTS, OUTPUT_FORMAT } from "npm:msedge-tts";

// Initialize the TTS service
const tts = new MsEdgeTTS();
await tts.setMetadata("en-US-AnaNeural", OUTPUT_FORMAT.WEBM_24KHZ_16BIT_MONO_OPUS);

/**
 * Directly plays speech from a text string using the ffplay command.
 * @param text The text to play as speech
 */
export async function streamPlay(text: string) {
  // Convert the text to a stream
  const readable = tts.toStream(text);

  // Spawn the ffplay process to play the stream directly
  const ffplayProcess = Deno.run({
    cmd: [
      "ffplay",
      "-i", "pipe:0",  // Input from stdin (pipe)
      "-autoexit",     // Automatically exit when playback finishes
      "-nodisp"        // No display window (for audio-only)
    ],
    stdin: "piped",
    stdout: "piped",
    stderr: "piped",
  });

  // Write each chunk of the TTS stream to ffplay stdin for immediate playback
  for await (const chunk of readable) {
    await ffplayProcess.stdin.write(chunk);
  }

  ffplayProcess.stdin.close();
  await ffplayProcess.status();
  ffplayProcess.close();

  // Close the stream and ffplay when done
  readable.on("close", async () => {
    console.log("Stream closed");
    ffplayProcess.stdin.close();  // Close ffplay stdin
    const status = await ffplayProcess.status();  // Wait for ffplay to finish
    ffplayProcess.close();  // Close the ffplay process
  });
}
