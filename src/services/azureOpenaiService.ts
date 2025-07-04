import { AzureOpenAI } from 'openai';
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';
import { PegaRuleAnalysis, PegaAnalysisError, isPegaAnalysisError, SeverityLevel, FeedbackItem, ChatMessage, AnalysisFunction, ChatFunction } from '../types';
import { AZURE_OPENAI_API_VERSION } from '../constants';

const generateUUID = () => crypto.randomUUID();

export const analyzePegaXmlAzureOpenAI: AnalysisFunction = async (
  xml: string,
  apiKey: string,
  systemInstruction: string,
  modelName: string, // This is the deployment ID for Azure OpenAI
  apiEndpoint?: string
): Promise<PegaRuleAnalysis | PegaAnalysisError> => {
  if (!apiKey) {
    return { error: "API Key not provided for Azure OpenAI. Please configure an API Key." };
  }
  if (!apiEndpoint) {
    return { error: "API Endpoint not provided for Azure OpenAI. Please configure an Endpoint URL." };
  }
  if (!xml.trim()) {
    return { error: "XML input provided for analysis is empty." };
  }

  const azureOpenai = new AzureOpenAI({ 
    apiKey, 
    endpoint: apiEndpoint,
    apiVersion: AZURE_OPENAI_API_VERSION,
    // Deployment is passed as 'model' in the completions.create call
  });

  const messages: ChatCompletionMessageParam[] = [
    { role: "system", content: systemInstruction },
    { role: "user", content: `Here is the Pega XML code to analyze:\n---\n${xml}\n---` }
  ];

  try {
    const completion = await azureOpenai.chat.completions.create({
      model: modelName, // modelName is your Azure OpenAI deployment ID
      messages: messages,
      response_format: { type: "json_object" },
    });

    const responseContent = completion.choices[0]?.message?.content;
    if (!responseContent) {
      return { error: "Azure OpenAI returned an empty response." };
    }
    
    let parsedData;
    try {
        parsedData = JSON.parse(responseContent);
    } catch (parseError) {
        console.error("Failed to parse JSON response from Azure OpenAI:", parseError, "Raw content:", responseContent);
        return { error: "Failed to parse JSON response from Azure OpenAI. The AI may have returned malformed JSON or non-JSON content. Check console for details." };
    }

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
    console.error("Error analyzing Pega XML with Azure OpenAI:", e);
    // OpenAI library errors for Azure often have a 'cause' or specific properties
    if (e instanceof Error) {
        if (e.message.toLowerCase().includes("api key") || e.message.toLowerCase().includes("authenticate")) {
             return { error: `Azure OpenAI API Key or Authentication Error: ${e.message}` };
        }
        if (e.message.toLowerCase().includes("endpoint") || e.message.toLowerCase().includes("host")) {
             return { error: `Azure OpenAI Endpoint Error: ${e.message}` };
        }
         if (e.message.toLowerCase().includes("deployment not found")) {
            return { error: `Azure OpenAI Deployment ID (model) "${modelName}" not found. Please check your deployment name. Error: ${e.message}`};
        }
    }
    return { error: `An unexpected error occurred during Azure OpenAI analysis: ${e.message || 'Unknown error'}` };
  }
};


export const getChatResponseForFeedbackItemAzureOpenAI: ChatFunction = async (
  itemContext: FeedbackItem,
  currentChatHistory: ChatMessage[],
  userQuery: string,
  apiKey: string,
  systemInstructionTemplate: (area: string, issue: string, suggestion: string) => string,
  modelName: string, // This is the deployment ID for Azure OpenAI
  apiEndpoint?: string
): Promise<string> => {
  if (!apiKey) {
    return "Azure OpenAI API Key not provided. Cannot process chat.";
  }
  if (!apiEndpoint) {
    return "Azure OpenAI API Endpoint not provided. Cannot process chat.";
  }
  if (itemContext.isIgnored) {
    return "This feedback item has been marked as ignored. Further discussion is disabled.";
  }

  const azureOpenai = new AzureOpenAI({ 
    apiKey, 
    endpoint: apiEndpoint,
    apiVersion: AZURE_OPENAI_API_VERSION,
  });

  const systemMessage = systemInstructionTemplate(itemContext.area, itemContext.issue, itemContext.suggestion);

  const messages: ChatCompletionMessageParam[] = [
    { role: "system", content: systemMessage },
    ...currentChatHistory.map(chatMsg => ({
      role: chatMsg.sender === 'user' ? 'user' : ('assistant' as 'user' | 'assistant'),
      content: chatMsg.message,
    })),
    { role: "user", content: userQuery }
  ];

  try {
    const completion = await azureOpenai.chat.completions.create({
      model: modelName, // modelName is your Azure OpenAI deployment ID
      messages: messages,
    });
    return completion.choices[0]?.message?.content || "Sorry, I couldn't get a response from Azure OpenAI.";
  } catch (e: any) {
    console.error("Error getting chat response from Azure OpenAI:", e);
     if (e instanceof Error) {
        if (e.message.toLowerCase().includes("api key") || e.message.toLowerCase().includes("authenticate")) {
             return `Sorry, there's an issue with the Azure OpenAI API Key/Authentication: ${e.message}`;
        }
         if (e.message.toLowerCase().includes("deployment not found")) {
            return `Sorry, the Azure OpenAI Deployment ID (model) "${modelName}" seems to be incorrect. Error: ${e.message}`;
        }
    }
    return `Sorry, I encountered an error trying to respond via Azure OpenAI: ${e.message || 'Unknown error'}`;
  }
};