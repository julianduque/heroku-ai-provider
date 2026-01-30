import { rerank } from "ai";
import { heroku, HerokuRerankingModel } from "../src/index";

/**
 * Basic reranking example using AI SDK's rerank function
 */
async function basicRerankingExample() {
  try {
    console.log("Starting basic reranking example...\n");

    // Documents to rerank - could be search results, RAG candidates, etc.
    const documents = [
      "Enable query logging to identify slow database queries that may be bottlenecks.",
      "Use caching strategies like Redis to reduce repeated expensive operations.",
      "Application metrics help track performance trends over time.",
      "Consider adding database indexes on frequently queried columns to improve lookup speed.",
      "Review your application logs for timeout errors and connection issues.",
    ];

    const query = "How do I troubleshoot slow API response times?";

    console.log(`Query: "${query}"\n`);
    console.log("Documents to rerank:");
    documents.forEach((doc, i) => console.log(`  [${i}] ${doc}`));
    console.log("\n---\n");

    // Rerank documents using Heroku's Cohere-compatible API
    const { ranking, rerankedDocuments } = await rerank({
      model: heroku.reranking("cohere-rerank-3-5"),
      query,
      documents,
      topN: 3, // Return top 3 most relevant documents
    });

    console.log("Reranking Results (Top 3):");
    ranking.forEach((item, i) => {
      console.log(
        `  ${i + 1}. [Original index: ${item.originalIndex}] Score: ${item.score.toFixed(4)}`,
      );
      console.log(`     "${documents[item.originalIndex]}"`);
    });

    console.log("\nReranked Documents (in order of relevance):");
    rerankedDocuments.forEach((doc, i) => {
      console.log(`  ${i + 1}. ${doc}`);
    });
  } catch (error) {
    console.error("Error in basic reranking example:", error);
  }
}

/**
 * RAG (Retrieval-Augmented Generation) example using reranking
 */
async function ragRerankingExample() {
  try {
    console.log("\n---\n");
    console.log("RAG Reranking Example...\n");

    // Simulated RAG scenario: user asks a question, we have retrieved candidates
    const userQuestion =
      "What are the best practices for database connection pooling?";

    // These could come from a vector similarity search
    const retrievedDocuments = [
      "Connection pooling reduces overhead by reusing existing database connections instead of creating new ones for each request.",
      "You can monitor application performance using built-in metrics and logging tools.",
      "Set max pool size based on your dyno count and expected concurrent queries to prevent connection exhaustion.",
      "Regular database backups are essential for disaster recovery planning.",
      "Consider using PgBouncer for PostgreSQL connection pooling in high-traffic applications.",
      "Application caching can significantly reduce database load.",
      "Connection timeout settings should be tuned based on your query complexity.",
    ];

    console.log(`User Question: "${userQuestion}"\n`);
    console.log(
      `Retrieved ${retrievedDocuments.length} candidates from vector search\n`,
    );

    // Rerank to find the most relevant documents for the user's question
    const { ranking } = await rerank({
      model: heroku.reranking("cohere-rerank-3-5"),
      query: userQuestion,
      documents: retrievedDocuments,
      topN: 3, // Only use top 3 for context
    });

    console.log("Most relevant documents for RAG context:");
    const contextDocuments = ranking.map((item) => {
      console.log(
        `  - [Score: ${item.score.toFixed(4)}] ${retrievedDocuments[item.originalIndex]}`,
      );
      return retrievedDocuments[item.originalIndex];
    });

    console.log(
      "\nThese documents can now be used as context for an LLM response.",
    );
    console.log(
      `Context tokens saved by filtering: ${retrievedDocuments.length - contextDocuments.length} documents excluded`,
    );
  } catch (error) {
    console.error("Error in RAG reranking example:", error);
  }
}

/**
 * Direct model usage example (without AI SDK rerank function)
 */
async function directModelUsageExample() {
  try {
    console.log("\n---\n");
    console.log("Direct Model Usage Example...\n");

    // Create model directly (uses INFERENCE_KEY since Heroku provisions rerank under inference)
    const model = new HerokuRerankingModel(
      "cohere-rerank-3-5",
      process.env.INFERENCE_KEY!,
      "https://us.inference.heroku.com/v1/rerank",
    );

    console.log(`Model ID: ${model.modelId}`);
    console.log(`Provider: ${model.provider}`);
    console.log(`Specification Version: ${model.specificationVersion}\n`);

    // Use the model directly
    const result = await model.doRerank({
      query: "machine learning frameworks",
      documents: {
        type: "text",
        values: [
          "TensorFlow is an open-source machine learning framework developed by Google.",
          "PyTorch is popular for research due to its dynamic computation graphs.",
          "Scikit-learn provides simple and efficient tools for data analysis.",
          "Keras is a high-level neural networks API, written in Python.",
        ],
      },
      topN: 2,
    });

    console.log("Direct doRerank Result:");
    result.ranking.forEach((item, i) => {
      console.log(
        `  ${i + 1}. Document index ${item.index} - Relevance: ${item.relevanceScore.toFixed(4)}`,
      );
    });

    if (result.providerMetadata?.heroku) {
      console.log("\nProvider Metadata:");
      console.log(
        `  API Version: ${result.providerMetadata.heroku.apiVersion}`,
      );
      console.log(
        `  Billed Units: ${JSON.stringify(result.providerMetadata.heroku.billedUnits)}`,
      );
    }
  } catch (error) {
    console.error("Error in direct model usage example:", error);
  }
}

/**
 * Example with structured/object documents
 */
async function objectDocumentsExample() {
  try {
    console.log("\n---\n");
    console.log("Object Documents Example...\n");

    // When documents are structured objects (e.g., from a database)
    const emailResults = [
      {
        from: "Paul Doe",
        subject: "Follow-up",
        text: "20% discount on your next order.",
      },
      {
        from: "John McGill",
        subject: "Pricing Info",
        text: "Oracle pricing: $5000/month",
      },
      {
        from: "Sarah Smith",
        subject: "Meeting Notes",
        text: "Discussed Q4 projections.",
      },
      {
        from: "Tech Support",
        subject: "Re: Database Issue",
        text: "The Oracle connection pool was exhausted.",
      },
    ];

    console.log("Searching structured email objects...\n");

    // Note: Object documents are converted to JSON strings internally
    const { ranking } = await rerank({
      model: heroku.reranking("cohere-rerank-3-5"),
      query: "Oracle pricing information",
      documents: emailResults.map((email) => JSON.stringify(email)),
      topN: 2,
    });

    console.log("Most relevant emails:");
    ranking.forEach((item, i) => {
      const email = emailResults[item.originalIndex];
      console.log(
        `  ${i + 1}. From: ${email.from} | Subject: ${email.subject}`,
      );
      console.log(`     Score: ${item.score.toFixed(4)}`);
    });
  } catch (error) {
    console.error("Error in object documents example:", error);
  }
}

/**
 * Example using Amazon Rerank model
 */
async function amazonRerankExample() {
  try {
    console.log("\n---\n");
    console.log("Amazon Rerank Model Example...\n");

    const documents = [
      "Machine learning is revolutionizing healthcare diagnostics.",
      "The stock market showed mixed results yesterday.",
      "Deep learning models require significant computational resources.",
      "Neural networks can identify patterns in complex datasets.",
    ];

    const query = "AI applications in medical field";

    console.log(`Query: "${query}"\n`);

    // Use Amazon's rerank model instead of Cohere
    const { ranking, rerankedDocuments } = await rerank({
      model: heroku.reranking("amazon-rerank-1-0"),
      query,
      documents,
      topN: 2,
    });

    console.log("Top 2 Results (Amazon Rerank):");
    ranking.forEach((item, i) => {
      console.log(`  ${i + 1}. Score: ${item.score.toFixed(4)}`);
      console.log(`     "${rerankedDocuments[i]}"`);
    });
  } catch (error) {
    console.error("Error in Amazon rerank example:", error);
  }
}

/**
 * Example comparing both models on the same query
 */
async function modelComparisonExample() {
  try {
    console.log("\n---\n");
    console.log("Model Comparison Example...\n");

    const documents = [
      "PostgreSQL supports advanced indexing strategies.",
      "Redis provides in-memory data caching.",
      "MongoDB is a document-oriented NoSQL database.",
      "The weather forecast predicts rain tomorrow.",
    ];

    const query = "database performance optimization";

    console.log(`Query: "${query}"\n`);
    console.log("Documents:");
    documents.forEach((doc, i) => console.log(`  [${i}] ${doc}`));

    // Compare Cohere model
    console.log("\n--- Cohere Rerank 3.5 ---");
    const cohereResult = await rerank({
      model: heroku.reranking("cohere-rerank-3-5"),
      query,
      documents,
    });
    cohereResult.ranking.forEach((item, i) => {
      console.log(
        `  ${i + 1}. [${item.originalIndex}] ${item.score.toFixed(4)} - ${documents[item.originalIndex].substring(0, 40)}...`,
      );
    });

    // Compare Amazon model (if available)
    try {
      console.log("\n--- Amazon Rerank 1.0 ---");
      const amazonResult = await rerank({
        model: heroku.reranking("amazon-rerank-1-0"),
        query,
        documents,
      });
      amazonResult.ranking.forEach((item, i) => {
        console.log(
          `  ${i + 1}. [${item.originalIndex}] ${item.score.toFixed(4)} - ${documents[item.originalIndex].substring(0, 40)}...`,
        );
      });
    } catch {
      console.log("  (Amazon model not available with current credentials)");
    }
  } catch (error) {
    console.error("Error in model comparison example:", error);
  }
}

// Run all examples
async function main() {
  console.log("=== Heroku AI Provider - Reranking Examples ===\n");
  console.log("Supported models:");
  console.log("  - cohere-rerank-3-5 (Cohere Rerank 3.5)");
  console.log("  - amazon-rerank-1-0 (Amazon Rerank 1.0)\n");

  await basicRerankingExample();
  await ragRerankingExample();
  await directModelUsageExample();
  await objectDocumentsExample();
  await amazonRerankExample();
  await modelComparisonExample();

  console.log("\n=== Examples Complete ===\n");
}

main().catch(console.error);
