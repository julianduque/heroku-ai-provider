import { writeFile } from "node:fs/promises";
import { experimental_generateImage as generateImage } from "ai";
import { heroku } from "../src/index";

async function imageGenerationExample() {
  try {
    console.log("🖼️ Generating image with stable-image-ultra...\n");

    const prompt =
      "A cinematic watercolor illustration of a lighthouse on a misty coastline at sunrise";

    const result = await generateImage({
      model: heroku.image("stable-image-ultra"),
      prompt,
      size: "1024x1024",
    });

    const outputPath = new URL("./heroku-generated-image.png", import.meta.url);

    await writeFile(outputPath, result.image.uint8Array);

    console.log(`Prompt: ${prompt}`);
    console.log(`Image saved to: ${outputPath.pathname}`);

    if (result.warnings.length > 0) {
      console.log("\nWarnings:");
      result.warnings.forEach((warning) => console.log(`- ${warning.type}`));
    }

    const firstMetadata = result.providerMetadata?.heroku?.images?.[0];

    if (firstMetadata && typeof firstMetadata === "object") {
      const metadataRecord = firstMetadata as Record<string, unknown>;
      const revisedPrompt = metadataRecord["revised_prompt"];

      if (typeof revisedPrompt === "string") {
        console.log("\nRevised prompt:", revisedPrompt);
      }
    }
  } catch (error) {
    console.error("Error generating image:", error);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  imageGenerationExample();
}

export { imageGenerationExample };
