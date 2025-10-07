import { embed, embedMany } from "ai";
import {
  heroku,
  createEmbedFunction,
  HerokuEmbeddingModel,
} from "../src/index";

async function basicEmbeddingsExample() {
  try {
    console.log("🧠 Starting basic embeddings example...\n");

    // Single embedding
    const { embedding } = await embed({
      model: heroku.embedding("cohere-embed-multilingual"),
      value: "Hello, world! This is a test sentence for embedding.",
    });

    console.log("Single Embedding:");
    console.log(`- Dimensions: ${embedding.length}`);
    console.log(
      `- First 10 values: [${embedding
        .slice(0, 10)
        .map((v) => v.toFixed(4))
        .join(", ")}...]`,
    );
    console.log("\n---\n");

    // Multiple embeddings
    const documents = [
      "Artificial intelligence is transforming the world.",
      "Machine learning algorithms can identify patterns in data.",
      "Natural language processing enables computers to understand text.",
      "Deep learning uses neural networks with multiple layers.",
      "Computer vision allows machines to interpret visual information.",
    ];

    const { embeddings } = await embedMany({
      model: heroku.embedding("cohere-embed-multilingual"),
      values: documents,
    });

    console.log("Multiple Embeddings:");
    console.log(`- Number of documents: ${documents.length}`);
    console.log(`- Number of embeddings: ${embeddings.length}`);
    console.log(`- Embedding dimensions: ${embeddings[0].length}`);

    documents.forEach((doc, index) => {
      const vector = embeddings[index];
      const magnitude = Math.sqrt(
        vector.reduce((sum, val) => sum + val * val, 0),
      );
      console.log(
        `- "${doc.substring(0, 50)}...": magnitude = ${magnitude.toFixed(4)}`,
      );
    });
  } catch (error) {
    console.error("Error in basic embeddings example:", error);
  }
}

async function convenienceFunctionExample() {
  try {
    console.log("\n🚀 Convenience function example...\n");

    const embeddingModel = heroku.embedding("cohere-embed-multilingual");
    const embedText = createEmbedFunction(embeddingModel);

    const documents = [
      "The quick brown fox jumps over the lazy dog.",
      "A journey of a thousand miles begins with a single step.",
      "To be or not to be, that is the question.",
    ];

    console.log("Using convenience function:");
    for (const doc of documents) {
      const { embedding } = await embedText(doc);
      console.log(`- "${doc}": ${embedding?.length ?? 0} dimensions`);
    }
  } catch (error) {
    console.error("Error in convenience function example:", error);
  }
}

async function similaritySearchExample() {
  try {
    console.log("\n🔍 Similarity search example...\n");

    const documents = [
      "JavaScript is a programming language for web development.",
      "Python is popular for data science and machine learning.",
      "React is a JavaScript library for building user interfaces.",
      "TensorFlow is a machine learning framework.",
      "Node.js allows JavaScript to run on the server.",
      "Pandas is a Python library for data manipulation.",
      "Vue.js is a progressive JavaScript framework.",
      "Scikit-learn provides machine learning tools for Python.",
    ];

    const { embeddings: docEmbeddings } = await embedMany({
      model: heroku.embedding("cohere-embed-multilingual"),
      values: documents,
    });

    const query = "web development frameworks";
    const { embedding: queryEmbedding } = await embed({
      model: heroku.embedding("cohere-embed-multilingual"),
      value: query,
    });

    const similarities = docEmbeddings.map((docEmb, index) => ({
      document: documents[index],
      similarity: cosineSimilarity(queryEmbedding, docEmb),
    }));

    similarities.sort((a, b) => b.similarity - a.similarity);

    console.log(`Query: "${query}"`);
    console.log("\nMost similar documents:");
    similarities.slice(0, 5).forEach((result, rank) => {
      console.log(
        `${rank + 1}. [${result.similarity.toFixed(4)}] ${result.document}`,
      );
    });
  } catch (error) {
    console.error("Error in similarity search example:", error);
  }
}

async function batchProcessingExample() {
  try {
    console.log("\n📦 Batch processing example...\n");

    const largeBatch = Array.from(
      { length: 12 },
      (_, i) => `Document number ${i + 1}: ${generateLoremIpsum()}`,
    );

    const batchSize = 4;
    const batchedResults: number[][] = [];

    for (let i = 0; i < largeBatch.length; i += batchSize) {
      const chunk = largeBatch.slice(i, i + batchSize);
      console.log(`Processing documents ${i + 1}-${i + chunk.length}...`);

      const { embeddings } = await embedMany({
        model: heroku.embedding("cohere-embed-multilingual"),
        values: chunk,
      });

      batchedResults.push(...embeddings);
    }

    console.log("\nBatch processing complete!");
    console.log(`- Total documents: ${largeBatch.length}`);
    console.log(`- Total embeddings: ${batchedResults.length}`);
  } catch (error) {
    console.error("Error in batch processing example:", error);
  }
}

function cosineSimilarity(a: number[], b: number[]): number {
  const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
  const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
  const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
  return dotProduct / (magnitudeA * magnitudeB);
}

function generateLoremIpsum(): string {
  return "Lorem ipsum dolor sit amet, consectetur adipiscing elit.";
}

async function logDetailedEmbeddings() {
  try {
    console.log("\n🧾 Detailed embedding diagnostics...\n");

    const textSamples = [
      "How to train a neural network",
      "Best practices for writing TypeScript",
      "Deploying applications on Heroku",
      "Optimizing database queries",
    ];

    const { embeddings } = await embedMany({
      model: heroku.embedding("cohere-embed-multilingual"),
      values: textSamples,
    });

    textSamples.forEach((text, index) => {
      const vector = embeddings[index];
      const avg = vector.reduce((sum, val) => sum + val, 0) / vector.length;
      const max = Math.max(...vector);
      const min = Math.min(...vector);

      console.log(`Embedding stats for: "${text}"`);
      console.log(`- Dimensions: ${vector.length}`);
      console.log(`- Average value: ${avg.toFixed(6)}`);
      console.log(`- Range: [${min.toFixed(6)}, ${max.toFixed(6)}]`);
      console.log("---");
    });
  } catch (error) {
    console.error("Error logging detailed embeddings:", error);
  }
}

async function manualModelConstructionExample() {
  try {
    console.log("\n🏗️ Manual model construction example...\n");

    const model = new HerokuEmbeddingModel(
      "cohere-embed-multilingual",
      process.env.EMBEDDING_KEY ?? "",
      "https://us.inference.heroku.com/v1/embeddings",
    );

    const embedText = createEmbedFunction(model);
    const result = await embedText("Manual model construction is flexible.");

    console.log(
      "Manual construction result dimensions:",
      result.embedding?.length,
    );
  } catch (error) {
    console.error("Error in manual model construction example:", error);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await basicEmbeddingsExample();
  await convenienceFunctionExample();
  await similaritySearchExample();
  await batchProcessingExample();
  await logDetailedEmbeddings();
  await manualModelConstructionExample();
}

export {
  basicEmbeddingsExample,
  convenienceFunctionExample,
  similaritySearchExample,
  batchProcessingExample,
  logDetailedEmbeddings,
  manualModelConstructionExample,
};
