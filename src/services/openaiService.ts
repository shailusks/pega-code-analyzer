import OpenAI from "openai";
import { PegaRuleAnalysis, PegaAnalysisError, isPegaAnalysisError, SeverityLevel, FeedbackItem, ChatMessage, AnalysisFunction, ChatFunction } from '../types';

const generateUUID = () => crypto.randomUUID();

export const analyzePegaXmlOpenAI: AnalysisFunction = async (
  xml: string, 
  apiKey: string,
  systemInstruction: string,
  modelName: string
): Promise<PegaRuleAnalysis | PegaAnalysisError> => {
  if (!apiKey) {
    return { error: "API Key not provided for OpenAI. Please configure or enter an API Key." };
  }
  if (!xml.trim()) {
    return { error: "XML input provided for analysis is empty." };
  }

  const openai = new OpenAI({ apiKey, dangerouslyAllowBrowser: true });

  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: "system", content: systemInstruction },
    { role: "user", content: `Here is the Pega XML code to analyze:\n---\n${xml}\n---` }
  ];

  try {
    const completion = await openai.chat.completions.create({
      model: modelName,
      messages: messages,
      response_format: { type: "json_object" }, // Request JSON output
    });

    const responseContent = completion.choices[0]?.message?.content;
    if (!responseContent) {
      return { error: "OpenAI returned an empty response." };
    }

    let parsedData;
    try {
        parsedData = JSON.parse(responseContent);
    } catch (parseError) {
        console.error("Failed to parse JSON response from OpenAI:", parseError, "Raw content:", responseContent);
        return { error: "Failed to parse JSON response from OpenAI. The AI may have returned malformed JSON or non-JSON content. Check console for details." };
    }
    

    if (isPegaAnalysisError(parsedData)) {
      return parsedData;
    }
    
    // Validate and structure the data according to PegaRuleAnalysis
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
    console.error("Error analyzing Pega XML with OpenAI:", e);
     if (e.response && e.response.data && e.response.data.error && e.response.data.error.message) {
        // More specific OpenAI error
        if (e.response.data.error.message.toLowerCase().includes("incorrect api key")) {
             return { error: `Invalid API Key for OpenAI. ${e.response.data.error.message}` };
        }
        return { error: `OpenAI API Error: ${e.response.data.error.message}` };
    }
    if (e.message && (e.message.toLowerCase().includes("incorrect api key") || e.message.toLowerCase().includes("api key"))) {
         return { error: "Invalid API Key for OpenAI. Please check your API Key." };
    }
    return { error: `An unexpected error occurred during OpenAI analysis: ${e.message || 'Unknown error'}` };
  }
};


export const getChatResponseForFeedbackItemOpenAI: ChatFunction = async (
  itemContext: FeedbackItem,
  currentChatHistory: ChatMessage[],
  userQuery: string,
  apiKey: string,
  systemInstructionTemplate: (area: string, issue: string, suggestion: string) => string,
  modelName: string
): Promise<string> => {
  if (!apiKey) {
    return "OpenAI API Key not provided. Cannot process chat.";
  }
  if (itemContext.isIgnored) {
    return "This feedback item has been marked as ignored. Further discussion is disabled.";
  }

  const openai = new OpenAI({ apiKey, dangerouslyAllowBrowser: true });
  const systemMessage = systemInstructionTemplate(itemContext.area, itemContext.issue, itemContext.suggestion);

  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: "system", content: systemMessage },
    ...currentChatHistory.map(chatMsg => ({
      role: chatMsg.sender === 'user' ? 'user' : ('assistant' as 'user' | 'assistant'), // OpenAI uses 'assistant'
      content: chatMsg.message,
    })),
    { role: "user", content: userQuery }
  ];

  try {
    const completion = await openai.chat.completions.create({
      model: modelName,
      messages: messages,
    });
    return completion.choices[0]?.message?.content || "Sorry, I couldn't get a response from OpenAI.";
  } catch (e: any) {
    console.error("Error getting chat response from OpenAI:", e);
    if (e.response && e.response.data && e.response.data.error && e.response.data.error.message) {
       return `Sorry, there's an issue with the OpenAI API: ${e.response.data.error.message}`;
    }
    if (e.message && (e.message.toLowerCase().includes("incorrect api key") || e.message.toLowerCase().includes("api key"))) {
        return `Sorry, there's an issue with the OpenAI API Key: ${e.message}`;
    }
    return `Sorry, I encountered an error trying to respond via OpenAI: ${e.message || 'Unknown error'}`;
  }
};