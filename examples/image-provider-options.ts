import { writeFile } from "node:fs/promises";
import { experimental_generateImage as generateImage } from "ai";
import { heroku } from "../src/index";

async function imageProviderOptionsExample() {
  try {
    console.log("🎨 Generating styled images with provider options...\n");

    const prompt =
      "Concept art of a solar-powered airship floating above a futuristic city";

    const result = await generateImage({
      model: heroku.image("stable-image-ultra"),
      prompt,
      n: 1,
      size: "1024x1024",
      providerOptions: {
        heroku: {
          negative_prompt: "low detail, blurry, monochrome",
          output_format: "png",
        },
      },
    });

    await Promise.all(
      result.images.map(async (image, index) => {
        const path = new URL(
          `./heroku-provider-options-image-${index + 1}.png`,
          import.meta.url,
        );

        await writeFile(path, image.uint8Array);
        console.log(`Saved image ${index + 1} to: ${path.pathname}`);
      }),
    );

    if (result.warnings.length > 0) {
      console.log("\nWarnings:");
      result.warnings.forEach((warning) => {
        if (warning.type === "unsupported-setting") {
          const detail = warning.details != null ? ` (${warning.details})` : "";
          console.log(`- unsupported-setting: ${warning.setting}${detail}`);
          return;
        }

        console.log(`- other: ${warning.message}`);
      });
    }
  } catch (error) {
    console.error("Error generating styled images:", error);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  imageProviderOptionsExample();
}

export { imageProviderOptionsExample };
