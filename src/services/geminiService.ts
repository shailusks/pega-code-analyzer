import { GoogleGenAI, GenerateContentResponse, Content } from "@google/genai";
import { PegaRuleAnalysis, PegaAnalysisError, isPegaAnalysisError, SeverityLevel, FeedbackItem, ChatMessage, AnalysisFunction, ChatFunction } from '../types';

const generateUUID = () => crypto.randomUUID();

export const analyzePegaXmlGemini: AnalysisFunction = async (
  xml: string, 
  apiKey: string, 
  systemInstruction: string,
  modelName: string
): Promise<PegaRuleAnalysis | PegaAnalysisError> => {
  const effectiveApiKey = apiKey || process.env.API_KEY;
  if (!effectiveApiKey) {
    return { error: "Google API Key not provided. Please enter a key in the UI or set the API_KEY environment variable." };
  }
  if (!xml.trim()) {
    return { error: "XML input provided for analysis is empty." };
  }

  const ai = new GoogleGenAI({ apiKey: effectiveApiKey });

  const userPrompt = `Here is the Pega XML code to analyze:\n---\n${xml}\n---`;

  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: modelName,
      contents: userPrompt, // User's actual request/data
      config: {
        systemInstruction: systemInstruction, // System instruction provided via config
        responseMimeType: "application/json",
      }
    });

    let jsonStr = response.text.trim();
    const fenceRegex = /^```(?:json)?\s*\n?(.*?)\n?\s*```$/s;
    const match = jsonStr.match(fenceRegex);
    if (match && match[1]) { 
      jsonStr = match[1].trim();
    }
    
    const parsedData = JSON.parse(jsonStr);

    if (isPegaAnalysisError(parsedData)) {
      return parsedData;
    }

    const validatedFeedbackItems = (parsedData.feedbackItems || []).map((item: any): FeedbackItem => ({
      id: generateUUID(),
      area: item.area || 'Unknown Area',
      issue: item.issue || 'No issue description provided.',
      suggestion: item.suggestion || 'No suggestion provided.',
      bestPracticeReference: item.bestPracticeReference || undefined,
      bestPracticeReasoning: item.bestPracticeReasoning || undefined,
      severity: Object.values(SeverityLevel).includes(item.severity as SeverityLevel) 
                  ? item.severity 
                  : SeverityLevel.UNKNOWN,
      category: item.category === 'Organization Standard' ? 'Organization Standard' : 'Pega Best Practice',
      chatHistory: [],
      isIgnored: false,
    }));
    
    const overallScore = typeof parsedData.overallScore === 'number' ? parsedData.overallScore : 0;
    const validatedAnalysis: PegaRuleAnalysis = {
        overallScore: overallScore,
        userAdjustedScore: overallScore,
        summary: parsedData.summary || 'No summary provided.',
        feedbackItems: validatedFeedbackItems,
    };

    return validatedAnalysis;

  } catch (e: any) {
    console.error("Error analyzing Pega XML with Gemini:", e);
    if (e.message && (e.message.toLowerCase().includes("api key not valid") || e.message.toLowerCase().includes("invalid api key"))) {
        return { error: "The provided Google API Key is invalid. Please check your input or the environment variable." };
    }
    if (e instanceof SyntaxError) {
      return { error: "Failed to parse the analysis response from Gemini. The AI may have returned non-JSON content or encountered an issue." };
    }
    if (e.message && (e.message.includes('permission denied') || e.message.includes('authentication'))) {
        return { error: `Gemini API Key authentication failed: ${e.message}` };
    }
    return { error: `An unexpected error occurred during Gemini analysis: ${e.message || 'Unknown error'}` };
  }
};


export const getChatResponseForFeedbackItemGemini: ChatFunction = async (
  itemContext: FeedbackItem,
  currentChatHistory: ChatMessage[],
  userQuery: string,
  apiKey: string, 
  systemInstructionTemplate: (area: string, issue: string, suggestion: string) => string,
  modelName: string
): Promise<string> => {
  const effectiveApiKey = apiKey || process.env.API_KEY;
  if (!effectiveApiKey) {
    return "Google API Key is not configured. Cannot process chat.";
  }
   if (itemContext.isIgnored) {
    return "This feedback item has been marked as ignored. Further discussion is disabled.";
  }

  const ai = new GoogleGenAI({ apiKey: effectiveApiKey });

  const systemInstruction = systemInstructionTemplate(
    itemContext.area,
    itemContext.issue,
    itemContext.suggestion
  );

  const geminiChatHistory: Content[] = currentChatHistory.map(chatMsg => ({
    role: chatMsg.sender === 'user' ? 'user' : 'model',
    parts: [{ text: chatMsg.message }],
  }));
  
  const contents: Content[] = [
    ...geminiChatHistory,
    {
      role: 'user',
      parts: [{ text: userQuery }],
    }
  ];

  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
        model: modelName,
        contents: contents, 
        config: {
          systemInstruction: systemInstruction, // System instruction provided via config
        }
    });
    return response.text;
  } catch (e: any) {
    console.error("Error getting chat response from Gemini:", e);
     if (e.message && (e.message.includes('api key not valid') || e.message.includes('permission denied') || e.message.includes('authentication'))) {
        return `Sorry, there's an issue with the Google API Key: ${e.message}`;
    }
    return `Sorry, I encountered an error trying to respond via Gemini: ${e.message || 'Unknown error'}`;
  }
};

const RULE_EXTRACTION_SYSTEM_INSTRUCTION = `You are an expert system that analyzes text containing software coding standards and extracts them into a structured format.
Analyze the following text and identify each distinct coding standard or rule.
For each standard, create a concise 'name' and a detailed 'description'.
The 'name' should be a short, clear title for the rule (e.g., "Avoid hardcoded values").
The 'description' should be the full explanation of the rule, suitable for another AI to understand and enforce it during code analysis.
Respond ONLY in JSON format. The JSON object must strictly follow this structure:
{
  "extractedRules": [
    {
      "name": "<string - concise title of the rule>",
      "description": "<string - detailed explanation of the rule>"
    }
  ]
}
If no rules can be reasonably extracted from the text, return an empty array: {"extractedRules": []}.
Do not include any explanations or text outside of the specified JSON structure.`;


export const extractStandardsFromTextGemini = async (
  text: string,
  apiKey: string,
  modelName: string
): Promise<{ name: string; description: string; }[] | PegaAnalysisError> => {
  if (!apiKey) {
    return { error: "Google API Key not provided. Please provide a key to analyze the document." };
  }
  if (!text.trim()) {
    return { error: "Document text is empty." };
  }

  const ai = new GoogleGenAI({ apiKey });

  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: modelName,
      contents: `Please extract coding standards from the following text:\n---\n${text}\n---`,
      config: {
        systemInstruction: RULE_EXTRACTION_SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
      }
    });

    let jsonStr = response.text.trim();
    const fenceRegex = /^```(?:json)?\s*\n?(.*?)\n?\s*```$/s;
    const match = jsonStr.match(fenceRegex);
    if (match && match[1]) {
      jsonStr = match[1].trim();
    }
    
    const parsedData = JSON.parse(jsonStr);

    if (parsedData && Array.isArray(parsedData.extractedRules)) {
        // Basic validation of the array items
        return parsedData.extractedRules.filter(
            (rule: any) => typeof rule.name === 'string' && typeof rule.description === 'string'
        );
    } else {
        return { error: "AI response did not contain the expected 'extractedRules' array." };
    }

  } catch (e: any) {
    console.error("Error extracting standards with Gemini:", e);
    if (e.message?.toLowerCase().includes("api key not valid")) {
        return { error: "The provided Google API Key is invalid." };
    }
    if (e instanceof SyntaxError) {
      return { error: "Failed to parse the extraction response from Gemini. The AI may have returned non-JSON content." };
    }
    return { error: `An unexpected error occurred during rule extraction: ${e.message || 'Unknown error'}` };
  }
};