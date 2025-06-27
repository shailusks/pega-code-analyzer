export enum SeverityLevel {
  CRITICAL = 'Critical',
  MAJOR = 'Major',
  MINOR = 'Minor',
  INFO = 'Info',
  UNKNOWN = 'Unknown'
}

export type ChatSender = 'user' | 'ai';

export interface ChatMessage {
  id: string; // Unique ID for each message
  sender: ChatSender;
  message: string;
  timestamp: Date;
}

export interface FeedbackItem {
  id: string; // Unique identifier for the feedback item
  area: string;
  issue: string;
  suggestion: string;
  bestPracticeReference?: string;
  bestPracticeReasoning?: string;
  severity: SeverityLevel;
  chatHistory: ChatMessage[]; // Chat history for this specific item
  isIgnored: boolean; 
}

export interface PegaRuleAnalysis {
  overallScore: number; 
  userAdjustedScore: number; 
  summary: string;
  feedbackItems: FeedbackItem[];
}

export interface PegaAnalysisError {
  error: string;
}

export function isPegaAnalysisError(response: any): response is PegaAnalysisError {
  return response && typeof response.error === 'string';
}

export interface PegaFileAnalysis {
  fileName: string;
  analysisResult: PegaRuleAnalysis | PegaAnalysisError;
}

// New types for multi-LLM support
export enum LlmProvider {
  GEMINI = 'gemini',
  OPENAI = 'openai',
  AZURE_OPENAI = 'azure_openai'
}

export const LLM_PROVIDER_NAMES: Record<LlmProvider, string> = {
  [LlmProvider.GEMINI]: 'Google Gemini',
  [LlmProvider.OPENAI]: 'OpenAI (ChatGPT)',
  [LlmProvider.AZURE_OPENAI]: 'Azure OpenAI (via Azure)'
};

export type AnalysisFunction = (
  code: string, 
  apiKey: string,
  systemInstruction: string,
  modelName: string,
  apiEndpoint?: string // Optional: for providers like Azure OpenAI
) => Promise<PegaRuleAnalysis | PegaAnalysisError>;

export type ChatFunction = (
  itemContext: FeedbackItem,
  currentChatHistory: ChatMessage[],
  userQuery: string,
  apiKey: string,
  systemInstructionTemplate: (area: string, issue: string, suggestion: string) => string,
  modelName: string,
  apiEndpoint?: string // Optional: for providers like Azure OpenAI
) => Promise<string>;