import { EducationType } from "@prisma/client";

// Structured Error Types
export class DocumentProcessingError extends Error {
  constructor(
    message: string,
    public readonly originalError?: Error,
    public readonly documentType?: string,
    public readonly stage?: "parsing" | "processing" | "storing" | "validation",
    public readonly context?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "DocumentProcessingError";
  }
}

export class TypeValidationError extends Error {
  constructor(
    message: string,
    public readonly fieldName: string,
    public readonly receivedValue: unknown,
    public readonly expectedType: string,
  ) {
    super(message);
    this.name = "TypeValidationError";
  }
}

export class LLMProcessingError extends Error {
  constructor(
    message: string,
    public readonly operation: string,
    public readonly originalError?: Error,
    public readonly retryCount?: number,
  ) {
    super(message);
    this.name = "LLMProcessingError";
  }
}

// Type Guards and Validation Helpers
export function isValidEducationType(value: unknown): value is EducationType {
  return (
    typeof value === "string" &&
    Object.values(EducationType).includes(value as EducationType)
  );
}

export function validateEducationType(
  value: unknown,
  fieldName: string,
): EducationType {
  if (!isValidEducationType(value)) {
    throw new TypeValidationError(
      `Invalid education type: ${String(value)}`,
      fieldName,
      value,
      `One of: ${Object.values(EducationType).join(", ")}`,
    );
  }
  return value;
}

// Enhanced PDF parsing types with better type safety
export interface PDFTextRun {
  T: string;
}

export interface PDFTextBlock {
  R: PDFTextRun[];
}

export interface PDFPage {
  Texts: PDFTextBlock[];
}

export interface PDFFormImage {
  Pages?: PDFPage[];
}

export interface PDFData {
  formImage?: PDFFormImage;
}

// Helper to extract content from LLM response
export function extractContent(llmResponse: unknown): string {
  if (typeof llmResponse === "string") return llmResponse;
  if (
    typeof llmResponse === "object" &&
    llmResponse !== null &&
    "kwargs" in llmResponse &&
    typeof (llmResponse as { kwargs?: unknown }).kwargs === "object" &&
    (llmResponse as { kwargs: { content?: unknown } }).kwargs?.content
  ) {
    return String(
      (llmResponse as { kwargs: { content: unknown } }).kwargs.content,
    );
  }
  if (
    typeof llmResponse === "object" &&
    llmResponse !== null &&
    "content" in llmResponse
  ) {
    return String((llmResponse as { content: unknown }).content);
  }
  return JSON.stringify(llmResponse);
}
