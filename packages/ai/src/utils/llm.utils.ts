import { LLMParseError } from '../types/ai.types';

/**
 * Extracts JSON content from LLM response text that may contain additional formatting
 * @param text - Raw text response from LLM
 * @returns Extracted JSON string
 * @throws {LLMParseError} If no valid JSON is found
 */
export function extractJson(text: string): string {
  // Remove markdown code blocks if present
  const cleanedText = text.replace(/```(?:json)?\n?/g, '').trim();
  
  // Try to find JSON object boundaries
  const jsonStart = cleanedText.indexOf('{');
  const jsonEnd = cleanedText.lastIndexOf('}');
  
  if (jsonStart === -1 || jsonEnd === -1 || jsonStart >= jsonEnd) {
    throw new LLMParseError('No valid JSON object found in LLM response');
  }
  
  const jsonText = cleanedText.substring(jsonStart, jsonEnd + 1);
  
  // Validate that it's actually valid JSON
  try {
    JSON.parse(jsonText);
    return jsonText;
  } catch (error) {
    throw new LLMParseError('Invalid JSON format in LLM response', error as Error);
  }
}

/**
 * Validates that a string contains valid JSON
 * @param text - Text to validate
 * @returns True if valid JSON, false otherwise
 */
export function isValidJson(text: string): boolean {
  try {
    JSON.parse(text);
    return true;
  } catch {
    return false;
  }
}

/**
 * Safely parses JSON with better error messages
 * @param text - JSON string to parse
 * @returns Parsed object
 * @throws {LLMParseError} If parsing fails
 */
export function safeJsonParse<T = any>(text: string): T {
  try {
    return JSON.parse(text);
  } catch (error) {
    throw new LLMParseError(`Failed to parse JSON: ${error instanceof Error ? error.message : 'Unknown error'}`, error as Error);
  }
} 