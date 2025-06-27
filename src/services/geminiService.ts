import { GoogleGenAI, GenerateContentResponse, Content } from "@google/genai";
import { PegaRuleAnalysis, PegaAnalysisError, isPegaAnalysisError, SeverityLevel, FeedbackItem, ChatMessage, AnalysisFunction, ChatFunction } from '../types';

const generateUUID = () => crypto.randomUUID();

// This function will now ignore the apiKey parameter and use the environment variable.
export const analyzePegaXmlGemini: AnalysisFunction = async (
  xml: string, 
  _apiKey: string, // We ignore this to conform to the type, but use process.env
  systemInstruction: string,
  modelName: string
): Promise<PegaRuleAnalysis | PegaAnalysisError> => {
  if (!process.env.API_KEY) {
    return { error: "Google API Key is not configured. Please set the API_KEY environment variable." };
  }
  if (!xml.trim()) {
    return { error: "XML input provided for analysis is empty." };
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

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
        return { error: "The configured Google API Key is invalid. Please check the environment variable." };
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
  _apiKey: string, // We ignore this to conform to the type, but use process.env
  systemInstructionTemplate: (area: string, issue: string, suggestion: string) => string,
  modelName: string
): Promise<string> => {
  if (!process.env.API_KEY) {
    return "Google API Key is not configured. Cannot process chat.";
  }
   if (itemContext.isIgnored) {
    return "This feedback item has been marked as ignored. Further discussion is disabled.";
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

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