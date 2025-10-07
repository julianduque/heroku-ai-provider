import { APICallError } from "@ai-sdk/provider";
import {
  ErrorCategory,
  ErrorSeverity,
  HerokuErrorType,
} from "../../src/utils/error-types";
import {
  createDetailedErrorReport,
  createSimpleErrorMessage,
  createUserFriendlyError,
  formatUserFriendlyError,
  getContextualHelp,
  isConfigurationError,
  isTemporaryServiceError,
} from "../../src/utils/user-friendly-errors";

describe("user-friendly error helpers", () => {
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date("2024-01-01T00:00:00.000Z"));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  const buildError = (
    overrides: {
      message?: string;
      statusCode?: number;
      data?: Record<string, unknown>;
      url?: string;
      requestBodyValues?: Record<string, unknown>;
      responseBody?: string;
    } = {},
  ) =>
    new APICallError({
      message: overrides.message ?? "base error",
      statusCode: overrides.statusCode,
      data: overrides.data,
      url: overrides.url,
      requestBodyValues: overrides.requestBodyValues,
      responseBody: overrides.responseBody,
    });

  it("creates a user friendly error with metadata when error type is present", () => {
    const originalError = buildError({
      message: "API key rejected",
      data: { errorType: HerokuErrorType.AUTHENTICATION_ERROR },
    });

    const userError = createUserFriendlyError(originalError);

    expect(userError).toMatchObject({
      userMessage: "Authentication failed. Please check your API key.",
      severity: ErrorSeverity.HIGH,
      category: ErrorCategory.CLIENT_ERROR,
      isRetryable: false,
    });
    expect(userError.technicalDetails).toContain(
      "Original error: API key rejected",
    );
    expect(userError.recoverySuggestions).toEqual([
      "Verify your Heroku API key is correct",
      "Check that the API key has not expired",
      "Ensure the API key is properly configured in your environment",
    ]);
    expect(userError.documentationUrl).toBe(
      "https://devcenter.heroku.com/articles/platform-api-reference#authentication",
    );
    expect(userError.estimatedResolutionTime).toBe("15-60 minutes");
  });

  it("falls back to generic messaging when error type metadata is missing", () => {
    const apiError = buildError({
      message: "Internal failure",
      statusCode: 500,
    });

    const userError = createUserFriendlyError(apiError);

    expect(userError.userMessage).toBe(
      "The service is temporarily unavailable",
    );
    expect(userError.recoverySuggestions).toContain(
      "Wait a few moments and try again",
    );
    expect(userError.isRetryable).toBe(true);
    expect(userError.category).toBe(ErrorCategory.SERVER_ERROR);
  });

  it("formats user friendly errors with severity and documentation cues", () => {
    const formatted = formatUserFriendlyError({
      userMessage: "Critical outage",
      technicalDetails: "Downstream service offline",
      recoverySuggestions: ["Retry later"],
      severity: ErrorSeverity.CRITICAL,
      category: ErrorCategory.SERVER_ERROR,
      isRetryable: true,
      documentationUrl: "https://example.com/docs",
      estimatedResolutionTime: "1-4 hours",
    });

    expect(formatted).toContain("❌ Critical outage");
    expect(formatted).toContain("🚨 This is a critical error");
    expect(formatted).toContain("1. Retry later");
    expect(formatted).toContain("🔄 This error can be retried automatically.");
    expect(formatted).toContain("⏱️ Estimated resolution time: 1-4 hours");
    expect(formatted).toContain(
      "📖 For more information: https://example.com/docs",
    );
    expect(formatted).toContain("Downstream service offline");
  });

  it("builds a simple error message summarising the first recovery step and retry hint", () => {
    const rateLimitError = buildError({
      message: "Too many requests",
      data: { errorType: HerokuErrorType.RATE_LIMIT_EXCEEDED },
    });

    const message = createSimpleErrorMessage(rateLimitError);

    expect(message).toContain("Wait before making additional requests");
    expect(message).toContain("(This will be retried automatically)");
  });

  it("creates a detailed error report with contextual metadata", () => {
    const detailedError = buildError({
      message: "Missing configuration",
      statusCode: 400,
      url: "https://api.heroku.com/chat",
      data: { errorType: HerokuErrorType.INVALID_CONFIGURATION },
      requestBodyValues: { model: "claude-4-sonnet" },
      responseBody: '{"error":"invalid_configuration"}',
    });

    const report = createDetailedErrorReport(detailedError);

    expect(report).toContain("=== ERROR REPORT ===");
    expect(report).toContain("Timestamp: 2024-01-01T00:00:00.000Z");
    expect(report).toContain("Severity: high");
    expect(report).toContain("Category: configuration_error");
    expect(report).toContain("Retryable: false");
    expect(report).toContain("HTTP Status: 400");
    expect(report).toContain("URL: https://api.heroku.com/chat");
    expect(report).toContain('"model": "claude-4-sonnet"');
    expect(report).toContain('{"error":"invalid_configuration"}');
    expect(report).toContain("=== END REPORT ===");
  });

  it("classifies configuration related errors", () => {
    const configurationError = buildError({
      data: { errorType: HerokuErrorType.INVALID_CONFIGURATION },
    });
    const unrelatedError = buildError({
      data: { errorType: HerokuErrorType.MODEL_UNAVAILABLE },
    });

    expect(isConfigurationError(configurationError)).toBe(true);
    expect(isConfigurationError(unrelatedError)).toBe(false);
  });

  it("detects temporary service errors", () => {
    const temporaryError = buildError({
      data: { errorType: HerokuErrorType.RATE_LIMIT_EXCEEDED },
    });
    const permanentError = buildError({
      data: { errorType: HerokuErrorType.INVALID_PARAMETERS },
    });

    expect(isTemporaryServiceError(temporaryError)).toBe(true);
    expect(isTemporaryServiceError(permanentError)).toBe(false);
  });

  it("returns contextual help tailored to authentication issues", () => {
    const help = getContextualHelp(
      buildError({
        data: { errorType: HerokuErrorType.AUTHENTICATION_ERROR },
      }),
    );

    expect(help).toEqual([
      "Verify your API key is correct and active",
      "Check that you're using the right environment (staging vs production)",
      "Ensure your API key has the necessary permissions for this operation",
    ]);
  });

  it("provides generic contextual help when error type is unrecognised", () => {
    const help = getContextualHelp(buildError());

    expect(help).toEqual([
      "Check the API documentation for guidance",
      "Review your request parameters",
      "Contact support if the issue persists",
    ]);
  });
});
