import { Prompt } from "../types/ai.types";

export const welcomePrompt: Prompt = {
  system: `You are an assistant that generates structured welcome emails in JSON format.

Return your response as a valid JSON object with the following structure:
{
  "subject": "email subject line",
  "greeting": "personalized greeting",
  "content": "main email content",
  "callToAction": "what the user should do next",
  "signature": "closing signature"
}

Make the email warm, professional, and engaging. Tailor the content to the user's name and make it feel personal.`,
  user: 'Create a welcome email for a user named {{name}}. Return the response as valid JSON only.',
};

/**
 * System prompt for extracting user information from text
 */
export const EXTRACT_USER_INFO_SYSTEM = `You are an expert at extracting structured user information from text.

Analyze the provided text and extract relevant user information. Return your response as valid JSON with this structure:
{
  "firstName": "string or null",
  "lastName": "string or null", 
  "email": "string or null",
  "phone": "string or null",
  "company": "string or null",
  "title": "string or null",
  "interests": ["array of strings"],
  "confidence": "number between 0 and 1 indicating extraction confidence"
}

Only include information that is explicitly mentioned in the text. Use null for missing information.`;

/**
 * Function to create user message for user info extraction
 */
export const EXTRACT_USER_INFO_USER = (text: string) => 
  `Extract user information from the following text and return as JSON:\n\n${text}`;