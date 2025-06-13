import { embed, embedMany } from "ai";
import { createHerokuProvider, createEmbedFunction } from "../src/index";

async function basicEmbeddingsExample() {
  const heroku = createHerokuProvider({
    embeddingsApiKey: process.env.HEROKU_EMBEDDING_KEY,
  });

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
      const embedding = embeddings[index];
      const magnitude = Math.sqrt(
        embedding.reduce((sum, val) => sum + val * val, 0),
      );
      console.log(
        `- "${doc.substring(0, 50)}...": magnitude = ${magnitude.toFixed(4)}`,
      );
    });
  } catch (error) {
    console.error("Error in basic embeddings example:", error);

    if (error instanceof Error) {
      console.error("Error message:", error.message);
    }
  }
}

async function convenienceFunctionExample() {
  try {
    console.log("\n🚀 Convenience function example...\n");

    // Create a reusable embed function
    const heroku = createHerokuProvider();
    const embeddingModel = heroku.embedding("cohere-embed-multilingual");
    const embedText = createEmbedFunction(embeddingModel);

    // Use the convenience function
    const documents = [
      "The quick brown fox jumps over the lazy dog.",
      "A journey of a thousand miles begins with a single step.",
      "To be or not to be, that is the question.",
    ];

    console.log("Using convenience function:");
    for (const doc of documents) {
      const embedding = await embedText(doc);
      console.log(`- "${doc}": ${embedding.embedding?.length} dimensions`);
    }
  } catch (error) {
    console.error("Error in convenience function example:", error);
  }
}

async function similaritySearchExample() {
  const heroku = createHerokuProvider();

  try {
    console.log("\n🔍 Similarity search example...\n");

    // Sample documents for search
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

    // Get embeddings for all documents
    const { embeddings: docEmbeddings } = await embedMany({
      model: heroku.embedding("cohere-embed-multilingual"),
      values: documents,
    });

    // Query embedding
    const query = "web development frameworks";
    const { embedding: queryEmbedding } = await embed({
      model: heroku.embedding("cohere-embed-multilingual"),
      value: query,
    });

    // Calculate cosine similarity
    function cosineSimilarity(a: number[], b: number[]): number {
      const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
      const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
      const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
      return dotProduct / (magnitudeA * magnitudeB);
    }

    // Find most similar documents
    const similarities = docEmbeddings.map((docEmb, index) => ({
      document: documents[index],
      similarity: cosineSimilarity(queryEmbedding, docEmb),
      index,
    }));

    // Sort by similarity (highest first)
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
  const heroku = createHerokuProvider();

  try {
    console.log("\n📦 Batch processing example...\n");

    // Large batch of documents
    const largeBatch = Array.from(
      { length: 50 },
      (_, i) =>
        `This is document number ${i + 1} with some unique content about topic ${(i % 5) + 1}.`,
    );

    console.log(`Processing ${largeBatch.length} documents...`);

    const startTime = Date.now();

    const { embeddings } = await embedMany({
      model: heroku.embedding("cohere-embed-multilingual"),
      values: largeBatch,
    });

    const endTime = Date.now();
    const processingTime = endTime - startTime;

    console.log(`✅ Batch processing completed:`);
    console.log(`- Documents processed: ${largeBatch.length}`);
    console.log(`- Embeddings generated: ${embeddings.length}`);
    console.log(`- Processing time: ${processingTime}ms`);
    console.log(
      `- Average time per document: ${(processingTime / largeBatch.length).toFixed(2)}ms`,
    );
    console.log(`- Embedding dimensions: ${embeddings[0].length}`);
  } catch (error) {
    console.error("Error in batch processing example:", error);
  }
}

async function clusteringExample() {
  const heroku = createHerokuProvider();

  try {
    console.log("\n🎯 Simple clustering example...\n");

    // Documents from different topics
    const documents = [
      // Technology documents
      "Artificial intelligence is revolutionizing technology.",
      "Machine learning algorithms are becoming more sophisticated.",
      "Deep learning neural networks can process complex data.",

      // Food documents
      "Italian cuisine is known for pasta and pizza.",
      "French cooking emphasizes technique and quality ingredients.",
      "Asian cuisine offers diverse flavors and cooking methods.",

      // Sports documents
      "Football is the most popular sport worldwide.",
      "Basketball requires skill, strategy, and athleticism.",
      "Tennis is played on different court surfaces.",
    ];

    const { embeddings } = await embedMany({
      model: heroku.embedding("cohere-embed-multilingual"),
      values: documents,
    });

    // Simple clustering using average embeddings
    function averageEmbedding(embeddings: number[][]): number[] {
      const dimensions = embeddings[0].length;
      const average = new Array(dimensions).fill(0);

      for (const embedding of embeddings) {
        for (let i = 0; i < dimensions; i++) {
          average[i] += embedding[i];
        }
      }

      return average.map((val) => val / embeddings.length);
    }

    // Group embeddings by topic (manually for demo)
    const techEmbeddings = embeddings.slice(0, 3);
    const foodEmbeddings = embeddings.slice(3, 6);
    const sportsEmbeddings = embeddings.slice(6, 9);

    const techCenter = averageEmbedding(techEmbeddings);
    const foodCenter = averageEmbedding(foodEmbeddings);
    const sportsCenter = averageEmbedding(sportsEmbeddings);

    console.log("Topic clusters created:");
    console.log("- Technology cluster: 3 documents");
    console.log("- Food cluster: 3 documents");
    console.log("- Sports cluster: 3 documents");

    // Test classification of new document
    const testDoc =
      "Programming languages are essential tools for software development.";
    const { embedding: testEmbedding } = await embed({
      model: heroku.embedding("cohere-embed-multilingual"),
      value: testDoc,
    });

    function cosineSimilarity(a: number[], b: number[]): number {
      const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
      const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
      const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
      return dotProduct / (magnitudeA * magnitudeB);
    }

    const techSimilarity = cosineSimilarity(testEmbedding, techCenter);
    const foodSimilarity = cosineSimilarity(testEmbedding, foodCenter);
    const sportsSimilarity = cosineSimilarity(testEmbedding, sportsCenter);

    console.log(`\nClassifying: "${testDoc}"`);
    console.log(`- Technology similarity: ${techSimilarity.toFixed(4)}`);
    console.log(`- Food similarity: ${foodSimilarity.toFixed(4)}`);
    console.log(`- Sports similarity: ${sportsSimilarity.toFixed(4)}`);

    const bestMatch = Math.max(
      techSimilarity,
      foodSimilarity,
      sportsSimilarity,
    );
    let category = "";
    if (bestMatch === techSimilarity) category = "Technology";
    else if (bestMatch === foodSimilarity) category = "Food";
    else category = "Sports";

    console.log(`→ Best match: ${category}`);
  } catch (error) {
    console.error("Error in clustering example:", error);
  }
}

// Run all examples
if (import.meta.url === `file://${process.argv[1]}`) {
  await basicEmbeddingsExample();
  await convenienceFunctionExample();
  await similaritySearchExample();
  await batchProcessingExample();
  await clusteringExample();
}

export {
  basicEmbeddingsExample,
  convenienceFunctionExample,
  similaritySearchExample,
  batchProcessingExample,
  clusteringExample,
};
