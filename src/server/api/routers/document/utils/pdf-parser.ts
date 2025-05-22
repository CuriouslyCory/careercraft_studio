import PDFParser from "pdf2json";
import { Buffer } from "buffer";
import { createLLM } from "~/server/langchain/agent";
import {
  DocumentProcessingError,
  LLMProcessingError,
  type PDFData,
  extractContent,
} from "../types";

export async function extractContentFromPDF(
  fileBase64: string,
  originalName: string,
  fileType: string,
): Promise<string> {
  let rawContent = "";

  try {
    rawContent = await new Promise<string>((resolve, reject) => {
      const pdfParser = new PDFParser();
      pdfParser.on("pdfParser_dataError", (errData: unknown) => {
        let message = "Failed to parse PDF";
        if (
          typeof errData === "object" &&
          errData !== null &&
          "parserError" in errData &&
          typeof (errData as { parserError: unknown }).parserError === "string"
        ) {
          message += ": " + (errData as { parserError: string }).parserError;
        }
        reject(
          new DocumentProcessingError(
            message,
            errData instanceof Error ? errData : new Error(String(errData)),
            "pdf",
            "parsing",
            { originalName, fileType },
          ),
        );
      });
      pdfParser.on("pdfParser_dataReady", (pdfData: unknown) => {
        try {
          // Type-safe PDF data extraction
          const typedPdfData = pdfData as PDFData;
          const pages = typedPdfData?.formImage?.Pages ?? [];
          const text = pages
            .map((page) =>
              page.Texts.map((textBlock) =>
                textBlock.R.map((run) => {
                  try {
                    return decodeURIComponent(run.T);
                  } catch {
                    // Fallback if decodeURIComponent fails
                    return run.T;
                  }
                }).join(""),
              ).join(" "),
            )
            .join("\n\n");
          resolve(text);
        } catch (extractionError) {
          reject(
            new DocumentProcessingError(
              "Failed to extract text from PDF structure",
              extractionError instanceof Error
                ? extractionError
                : new Error(String(extractionError)),
              "pdf",
              "parsing",
              { originalName, pdfDataStructure: typeof pdfData },
            ),
          );
        }
      });

      try {
        const pdfBuffer = Buffer.from(fileBase64, "base64");
        pdfParser.parseBuffer(pdfBuffer);
      } catch (bufferError) {
        reject(
          new DocumentProcessingError(
            "Failed to create buffer from base64 data",
            bufferError instanceof Error
              ? bufferError
              : new Error(String(bufferError)),
            "pdf",
            "parsing",
            { originalName, base64Length: fileBase64.length },
          ),
        );
      }
    });
  } catch (error) {
    if (error instanceof DocumentProcessingError) {
      throw error;
    }
    throw new DocumentProcessingError(
      "Unexpected error during PDF parsing",
      error instanceof Error ? error : new Error(String(error)),
      "pdf",
      "parsing",
      { originalName, fileType },
    );
  }

  // If no text was extracted from PDF, try to extract using LLM for image-based PDFs
  if (!rawContent?.trim()) {
    try {
      const llm = createLLM();
      const llmResponse = await llm.invoke([
        [
          "system",
          "Please extract all text content from this document. Return only the extracted text without any formatting or structure.",
        ],
        [
          "user",
          [
            {
              type: "application/pdf",
              data: fileBase64,
            },
            {
              type: "text",
              text: "Please extract all text content from this PDF file.",
            },
          ],
        ],
      ]);
      rawContent = extractContent(llmResponse);
      console.log("LLM extracted content from image-based PDF");
    } catch (err) {
      throw new LLMProcessingError(
        "Failed to extract content from image-based PDF using LLM",
        "extractImagePDF",
        err instanceof Error ? err : new Error(String(err)),
        0,
      );
    }
  }

  return rawContent;
}

export function extractContentFromText(fileBase64: string): string {
  // Decode base64 to string for text files
  const rawContent = Buffer.from(fileBase64, "base64").toString("utf-8");
  console.log("Extracted content from plain text file");
  return rawContent;
}
