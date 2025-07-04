import React, { useState, useCallback, ChangeEvent, useEffect } from 'react';
import JSZip from 'jszip';
import { 
    PegaFileAnalysis, isPegaAnalysisError, FeedbackItem, ChatMessage, PegaRuleAnalysis, 
    LlmProvider, LLM_PROVIDER_NAMES, AnalysisFunction, ChatFunction, CustomStandard, SeverityLevel 
} from '../types';
import { analyzePegaXmlGemini, getChatResponseForFeedbackItemGemini } from '../services/geminiService';
import { analyzePegaXmlOpenAI, getChatResponseForFeedbackItemOpenAI } from '../services/openaiService';
import { analyzePegaXmlAzureOpenAI, getChatResponseForFeedbackItemAzureOpenAI } from '../services/azureOpenaiService';
import { 
    SEVERITY_SCORE_ADJUSTMENT,
    GEMINI_ANALYSIS_MODEL_NAME, GEMINI_CHAT_MODEL_NAME, PEGA_LSA_SYSTEM_INSTRUCTION_GEMINI, PEGA_LSA_CHAT_SYSTEM_INSTRUCTION_TEMPLATE_GEMINI,
    OPENAI_ANALYSIS_MODEL_NAME, OPENAI_CHAT_MODEL_NAME, PEGA_LSA_SYSTEM_INSTRUCTION_OPENAI, PEGA_LSA_CHAT_SYSTEM_INSTRUCTION_TEMPLATE_OPENAI,
    AZURE_OPENAI_ANALYSIS_DEPLOYMENT_NAME, AZURE_OPENAI_CHAT_DEPLOYMENT_NAME, PEGA_LSA_SYSTEM_INSTRUCTION_AZURE_OPENAI, PEGA_LSA_CHAT_SYSTEM_INSTRUCTION_TEMPLATE_AZURE_OPENAI
} from '../constants';

import { useAuth } from '../contexts/AuthContext';
import { useCustomStandards } from '../hooks/useCustomStandards';
import LoadingSpinner from '../components/LoadingSpinner';
import AnalysisDisplay from '../components/AnalysisDisplay';
import ErrorMessage from '../components/ErrorMessage';
import ApiKeyHelpModal from '../components/ApiKeyHelpModal'; 
import CustomStandardsModal from '../components/CustomStandardsModal';

const generateChatMsgUUID = () => crypto.randomUUID();

const AnalyzerPage: React.FC = () => {
  const { currentUser } = useAuth();
  
  const { 
    standards,
    addStandard,
    addMultipleStandards,
    updateStandard,
    deleteStandard,
    toggleStandardIsEnabled,
    syncStandards
  } = useCustomStandards(currentUser?.id || null);

  const [isStandardsModalOpen, setIsStandardsModalOpen] = useState(false);

  const [xmlInput, setXmlInput] = useState<string>('');
  const [zipFile, setZipFile] = useState<File | null>(null);
  const [analysisData, setAnalysisData] = useState<PegaFileAnalysis[] | null>(null);
  const [activeTabFileName, setActiveTabFileName] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [chatProcessingItemId, setChatProcessingItemId] = useState<string | null>(null);
  
  const [selectedLlmProvider, setSelectedLlmProvider] = useState<LlmProvider>(LlmProvider.GEMINI);

  const initialApiKeyState = { [LlmProvider.GEMINI]: '', [LlmProvider.OPENAI]: '', [LlmProvider.AZURE_OPENAI]: '' };
  const initialApiKeyEnvState = { [LlmProvider.GEMINI]: undefined, [LlmProvider.OPENAI]: undefined, [LlmProvider.AZURE_OPENAI]: undefined };
  
  const [envApiKeys, setEnvApiKeys] = useState<Record<LlmProvider, string | undefined>>(initialApiKeyEnvState);
  const [userSetApiKeys, setUserSetApiKeys] = useState<Record<LlmProvider, string>>(initialApiKeyState);
  const [apiKeyInputValues, setApiKeyInputValues] = useState<Record<LlmProvider, string>>(initialApiKeyState);
  
  const [envAzureEndpoint, setEnvAzureEndpoint] = useState<string | undefined>(undefined);
  const [userSetAzureEndpoint, setUserSetAzureEndpoint] = useState<string>('');
  const [azureEndpointInputValue, setAzureEndpointInputValue] = useState<string>('');

  const [effectiveApiKey, setEffectiveApiKey] = useState<string>('');
  const [effectiveAzureEndpoint, setEffectiveAzureEndpoint] = useState<string>('');
  const [apiKeyStatusMessage, setApiKeyStatusMessage] = useState<string>('');
  const [showApiKeySuccess, setShowApiKeySuccess] = useState<boolean>(false);
  const [isHelpModalOpen, setIsHelpModalOpen] = useState<boolean>(false);

  useEffect(() => {
    const geminiEnvKey = process.env.API_KEY; 
    const openaiEnvKey = process.env.OPENAI_API_KEY; 
    const azureOpenaiEnvKey = process.env.AZURE_OPENAI_API_KEY;
    const azureOpenaiEnvEndpoint = process.env.AZURE_OPENAI_ENDPOINT;

    setEnvApiKeys({
        [LlmProvider.GEMINI]: geminiEnvKey,
        [LlmProvider.OPENAI]: openaiEnvKey,
        [LlmProvider.AZURE_OPENAI]: azureOpenaiEnvKey,
    });
    setEnvAzureEndpoint(azureOpenaiEnvEndpoint);
  }, []);

  useEffect(() => {
    const currentProvider = selectedLlmProvider;

    const envKey = envApiKeys[currentProvider];
    const userKey = userSetApiKeys[currentProvider];
    let currentEffectiveKey = '';
    let currentStatus = '';
    let currentEffectiveAzureEndpoint = '';

    if (userKey) {
      currentEffectiveKey = userKey;
      currentStatus = `Using user-provided API Key for ${LLM_PROVIDER_NAMES[currentProvider]} (ends in ...${userKey.slice(-4)}).`;
      if (envKey) currentStatus += ` This overrides its environment key.`;
    } else if (envKey) {
      currentEffectiveKey = envKey;
      currentStatus = `Using API Key from environment for ${LLM_PROVIDER_NAMES[currentProvider]}${envKey.length > 4 ? ` (ends in ...${envKey.slice(-4)})` : ''}. You can override below.`;
    } else {
      currentStatus = `${LLM_PROVIDER_NAMES[currentProvider]} API Key is required. Please enter your key below.`;
    }

    if (currentProvider === LlmProvider.AZURE_OPENAI) {
      if (userSetAzureEndpoint) {
        currentEffectiveAzureEndpoint = userSetAzureEndpoint;
        currentStatus += ` Using user-set Azure Endpoint.`;
        if (envAzureEndpoint) currentStatus += ` This overrides its environment endpoint.`;
      } else if (envAzureEndpoint) {
        currentEffectiveAzureEndpoint = envAzureEndpoint;
        currentStatus += ` Using Azure Endpoint from environment. You can override below.`;
      } else {
        currentStatus += ` Azure OpenAI Endpoint URL is also required.`;
      }
    }
    
    setEffectiveApiKey(currentEffectiveKey);
    setEffectiveAzureEndpoint(currentEffectiveAzureEndpoint);
    setApiKeyStatusMessage(currentStatus);
  }, [selectedLlmProvider, userSetApiKeys, envApiKeys, userSetAzureEndpoint, envAzureEndpoint]);


  const handleSetUserApiKeyAndEndpoint = () => {
    const keyToSet = apiKeyInputValues[selectedLlmProvider].trim();
    let success = false;

    if (keyToSet) {
      setUserSetApiKeys(prev => ({ ...prev, [selectedLlmProvider]: keyToSet }));
      setError(''); 
      success = true;
    } else {
      setUserSetApiKeys(prev => ({ ...prev, [selectedLlmProvider]: '' })); 
      if (!envApiKeys[selectedLlmProvider]) {
        setError(`API Key for ${LLM_PROVIDER_NAMES[selectedLlmProvider]} cannot be empty if no environment key is available.`);
      } else {
        setError(''); 
      }
    }

    if (selectedLlmProvider === LlmProvider.AZURE_OPENAI) {
        const endpointToSet = azureEndpointInputValue.trim();
        if(endpointToSet) {
            setUserSetAzureEndpoint(endpointToSet);
            if (!keyToSet && !envApiKeys[LlmProvider.AZURE_OPENAI]) { /* already handled */ } else { setError(''); }
            success = success && true;
        } else {
            setUserSetAzureEndpoint('');
            if (!envAzureEndpoint) {
                 setError(prevError => prevError + (prevError ? ' Also, ' : '') + `Azure Endpoint cannot be empty if no environment endpoint is available.`);
                 success = false;
            } else {
                 if (!keyToSet && !envApiKeys[LlmProvider.AZURE_OPENAI]) { /* already handled */ } else { setError(''); }
            }
        }
    }
    
    if (success) {
        setShowApiKeySuccess(true);
        setTimeout(() => setShowApiKeySuccess(false), 3000);
    }
  };
  
  const handleApiKeyInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    setApiKeyInputValues(prev => ({ ...prev, [selectedLlmProvider]: e.target.value }));
    if (error.includes("API Key")) setError('');
  };

  const handleAzureEndpointInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    setAzureEndpointInputValue(e.target.value);
    if (error.includes("Azure Endpoint")) setError('');
  };

  const handleLlmProviderChange = (e: ChangeEvent<HTMLSelectElement>) => {
    setSelectedLlmProvider(e.target.value as LlmProvider);
    setError('');
    setAnalysisData(null); 
    setActiveTabFileName(null);
  };

  const getSelectedLlmServices = (): { 
    analyze: AnalysisFunction, 
    chat: ChatFunction, 
    analysisModel: string, 
    chatModel: string,
    analysisSystemInstruction: string,
    chatSystemInstructionTemplate: (area: string, issue: string, suggestion: string) => string
  } => {
    switch (selectedLlmProvider) {
      case LlmProvider.OPENAI:
        return { 
          analyze: analyzePegaXmlOpenAI, 
          chat: getChatResponseForFeedbackItemOpenAI,
          analysisModel: OPENAI_ANALYSIS_MODEL_NAME,
          chatModel: OPENAI_CHAT_MODEL_NAME,
          analysisSystemInstruction: PEGA_LSA_SYSTEM_INSTRUCTION_OPENAI,
          chatSystemInstructionTemplate: PEGA_LSA_CHAT_SYSTEM_INSTRUCTION_TEMPLATE_OPENAI
        };
      case LlmProvider.AZURE_OPENAI:
        return {
          analyze: analyzePegaXmlAzureOpenAI,
          chat: getChatResponseForFeedbackItemAzureOpenAI,
          analysisModel: AZURE_OPENAI_ANALYSIS_DEPLOYMENT_NAME,
          chatModel: AZURE_OPENAI_CHAT_DEPLOYMENT_NAME,
          analysisSystemInstruction: PEGA_LSA_SYSTEM_INSTRUCTION_AZURE_OPENAI,
          chatSystemInstructionTemplate: PEGA_LSA_CHAT_SYSTEM_INSTRUCTION_TEMPLATE_AZURE_OPENAI
        };
      case LlmProvider.GEMINI:
      default:
        return { 
            analyze: analyzePegaXmlGemini, 
            chat: getChatResponseForFeedbackItemGemini,
            analysisModel: GEMINI_ANALYSIS_MODEL_NAME,
            chatModel: GEMINI_CHAT_MODEL_NAME,
            analysisSystemInstruction: PEGA_LSA_SYSTEM_INSTRUCTION_GEMINI,
            chatSystemInstructionTemplate: PEGA_LSA_CHAT_SYSTEM_INSTRUCTION_TEMPLATE_GEMINI
        };
    }
  };

  const generateFinalSystemInstruction = (baseInstruction: string, customStandards: CustomStandard[]): string => {
    const enabledStandards = customStandards.filter(s => s.isEnabled);

    if (enabledStandards.length === 0) {
        return baseInstruction;
    }

    const standardsText = enabledStandards.map(s => 
        `- Rule Name: "${s.name}"\n  Severity to Assign: "${s.severity}"\n  Instruction: ${s.description}`
    ).join('\n\n');

    return `${baseInstruction}\n\nAdditionally, you MUST strictly adhere to the following organization-specific standards. If you find a violation of these, create a feedback item with the specified severity and reference the rule name.\n\n--- ORGANIZATION-SPECIFIC STANDARDS ---\n${standardsText}\n--- END ORGANIZATION-SPECIFIC STANDARDS ---`;
  };

  const commonAnalyzeAction = async (
    analysisFnExecutor: (analyzeSvc: AnalysisFunction, model: string, instruction: string, endpoint?: string) => Promise<PegaFileAnalysis[] | PegaFileAnalysis>,
    customStandards: CustomStandard[]
  ) => {
    let apiKeyIsSet = !!effectiveApiKey;
    let endpointIsSetForAzure = selectedLlmProvider !== LlmProvider.AZURE_OPENAI || (selectedLlmProvider === LlmProvider.AZURE_OPENAI && !!effectiveAzureEndpoint);

    if (!apiKeyIsSet || !endpointIsSetForAzure) {
      let missingConfigError = `API Key for ${LLM_PROVIDER_NAMES[selectedLlmProvider]} is not set. `;
      if (selectedLlmProvider === LlmProvider.AZURE_OPENAI && !endpointIsSetForAzure) {
        missingConfigError += `Azure OpenAI Endpoint URL is also required. `;
      }
      missingConfigError += `Please provide the required configuration to proceed.`;
      setError(missingConfigError);
      setIsLoading(false);
      setAnalysisData(null);
      setActiveTabFileName(null);
      document.getElementById('apiKeyInputSection')?.scrollIntoView({ behavior: 'smooth' });
      return;
    }

    setError('');
    setIsLoading(true);
    setAnalysisData(null);
    setActiveTabFileName(null);

    const { analyze, analysisModel, analysisSystemInstruction } = getSelectedLlmServices();
    const finalSystemInstruction = generateFinalSystemInstruction(analysisSystemInstruction, customStandards);

    try {
      const result = await analysisFnExecutor(analyze, analysisModel, finalSystemInstruction, effectiveAzureEndpoint);
      const newAnalysisDataArray = Array.isArray(result) ? result : [result];
      
      let hasNonErrorResult = false;
      newAnalysisDataArray.forEach(res => {
          if (!isPegaAnalysisError(res.analysisResult)) {
              hasNonErrorResult = true;
          } else {
              console.warn(`Analysis error for ${res.fileName}: ${res.analysisResult.error}`);
          }
      });

      setAnalysisData(newAnalysisDataArray);

      if (newAnalysisDataArray.length > 0 && newAnalysisDataArray[0]) {
        setActiveTabFileName(newAnalysisDataArray[0].fileName);
        if (newAnalysisDataArray.length === 1 && isPegaAnalysisError(newAnalysisDataArray[0].analysisResult)){
            setError(`Analysis for ${newAnalysisDataArray[0].fileName} failed: ${newAnalysisDataArray[0].analysisResult.error}`);
        } else if (!hasNonErrorResult && newAnalysisDataArray.length > 0) {
            setError(`All files in the package resulted in analysis errors. Check individual tabs.`);
        }
      } else if (newAnalysisDataArray.length === 0 && (xmlInput.trim() || zipFile)) {
          setError("Analysis completed but returned no data. This might indicate an issue with the input or the LLM service.");
      }

    } catch (e: any) {
      console.error("Analysis submission failed:", e);
      setError(`An unexpected error occurred during analysis: ${e.message || 'Unknown error'}`);
      setAnalysisData(null);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleAnalyzeXmlClick = useCallback(async () => {
    if (!xmlInput.trim()) {
      setError("XML input cannot be empty.");
      setAnalysisData(null);
      setActiveTabFileName(null);
      return;
    }
    
    await commonAnalyzeAction(async (analyzeSvc, model, instruction, endpoint) => {
      const result = await analyzeSvc(xmlInput, effectiveApiKey, instruction, model, endpoint);
      return {
        fileName: "Pasted XML Snippet",
        analysisResult: result
      };
    }, standards);
  }, [xmlInput, effectiveApiKey, selectedLlmProvider, effectiveAzureEndpoint, standards]);

  const handleAnalyzeZipFile = useCallback(async () => {
    if (!zipFile) {
      setError('Please select a ZIP file to analyze.');
      return;
    }
    
    await commonAnalyzeAction(async (analyzeSvc, model, instruction, endpoint) => {
      const zip = new JSZip();
      const loadedZip = await zip.loadAsync(zipFile);
      const fileProcessingPromises: Promise<PegaFileAnalysis>[] = [];
      let xmlFileFoundInZip = false;

      loadedZip.forEach((relativePath, zipEntry) => {
        if (!zipEntry.dir && relativePath.toLowerCase().endsWith('.xml')) {
          xmlFileFoundInZip = true;
          fileProcessingPromises.push(
            zipEntry.async('string').then(async (xmlContent) => {
              if (!xmlContent.trim()) {
                return {
                  fileName: zipEntry.name,
                  analysisResult: { error: `Content of ${zipEntry.name} is empty or unreadable.` }
                };
              }
              const singleAnalysisResult = await analyzeSvc(xmlContent, effectiveApiKey, instruction, model, endpoint);
              return {
                fileName: zipEntry.name,
                analysisResult: singleAnalysisResult
              };
            }).catch(err => {
              console.error(`Error processing file ${zipEntry.name} from ZIP:`, err);
              return {
                fileName: zipEntry.name,
                analysisResult: { error: `Failed to read or analyze file ${zipEntry.name}: ${err.message || 'Unknown error'}` }
              };
            })
          );
        }
      });
      
      if (!xmlFileFoundInZip) {
        setError('No XML files found in the uploaded ZIP package.');
        setIsLoading(false); 
        return []; 
      }
      const resultsArray = await Promise.all(fileProcessingPromises);
       if (resultsArray.length === 0 && xmlFileFoundInZip) { 
            setError('XML files were found but could not be processed.');
            setIsLoading(false);
            return [];
        }
      return resultsArray;
    }, standards);
  }, [zipFile, effectiveApiKey, selectedLlmProvider, effectiveAzureEndpoint, standards]);


  const handleXmlInputChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    setXmlInput(e.target.value);
    if (e.target.value.trim() !== '' && zipFile) {
      setZipFile(null);
      const fileInput = document.getElementById('zipFileInput') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
      setAnalysisData(null);
      setActiveTabFileName(null);
    }
  };

  const handleZipFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setZipFile(file);
    if (file && xmlInput.trim() !== '') {
      setXmlInput(''); 
      setAnalysisData(null);
      setActiveTabFileName(null);
    }
  };

  const handleToggleIgnoreFeedbackItem = useCallback((targetFileName: string, itemId: string) => {
    setAnalysisData(prevAnalysisData => {
      if (!prevAnalysisData) return null;

      return prevAnalysisData.map(fileAnalysis => {
        if (fileAnalysis.fileName === targetFileName && !isPegaAnalysisError(fileAnalysis.analysisResult)) {
          const ruleAnalysis = fileAnalysis.analysisResult as PegaRuleAnalysis;
          let newAdjustedScore = ruleAnalysis.userAdjustedScore;
          
          const updatedFeedbackItems = ruleAnalysis.feedbackItems.map(item => {
            if (item.id === itemId) {
              const adjustment = SEVERITY_SCORE_ADJUSTMENT[item.severity] || 0;
              if (!item.isIgnored) { 
                newAdjustedScore += adjustment;
              } else { 
                newAdjustedScore -= adjustment;
              }
              return { ...item, isIgnored: !item.isIgnored };
            }
            return item;
          });
          newAdjustedScore = Math.max(0, Math.min(100, newAdjustedScore));
          return {
            ...fileAnalysis,
            analysisResult: { ...ruleAnalysis, feedbackItems: updatedFeedbackItems, userAdjustedScore: newAdjustedScore }
          };
        }
        return fileAnalysis;
      });
    });
  }, []);

  const handleSendMessageToChat = useCallback(async (targetFileName: string, itemId: string, userMessage: string) => {
    let apiKeyIsSet = !!effectiveApiKey;
    let endpointIsSetForAzure = selectedLlmProvider !== LlmProvider.AZURE_OPENAI || (selectedLlmProvider === LlmProvider.AZURE_OPENAI && !!effectiveAzureEndpoint);
    
    if (!apiKeyIsSet || !endpointIsSetForAzure) {
      setError(`Required configuration for ${LLM_PROVIDER_NAMES[selectedLlmProvider]} is missing. Cannot send chat message.`);
      return;
    }
    if (!analysisData) return;

    const fileAnalysisIndex = analysisData.findIndex(ar => ar.fileName === targetFileName);
    if (fileAnalysisIndex === -1) return;

    const currentFileAnalysis = analysisData[fileAnalysisIndex];
    if (isPegaAnalysisError(currentFileAnalysis.analysisResult)) return;

    const itemIndex = currentFileAnalysis.analysisResult.feedbackItems.findIndex(fi => fi.id === itemId);
    if (itemIndex === -1) return;

    const currentItem = currentFileAnalysis.analysisResult.feedbackItems[itemIndex];
     if (currentItem.isIgnored) {
        const ignoredMessage: ChatMessage = {
            id: generateChatMsgUUID(), sender: 'ai',
            message: "This feedback item is currently ignored. Discussion is disabled.", timestamp: new Date(),
        };
        setAnalysisData(prevData => prevData?.map((fa, fIdx) => fIdx === fileAnalysisIndex ? { ...fa, analysisResult: { ...(fa.analysisResult as PegaRuleAnalysis), feedbackItems: (fa.analysisResult as PegaRuleAnalysis).feedbackItems.map((item, iIdx) => iIdx === itemIndex ? { ...item, chatHistory: [...item.chatHistory, ignoredMessage] } : item) }} : fa) || null);
        return;
    }

    const newUserMessage: ChatMessage = { id: generateChatMsgUUID(), sender: 'user', message: userMessage, timestamp: new Date() };

    setAnalysisData(prevData => prevData?.map((fa, fIdx) => fIdx === fileAnalysisIndex ? { ...fa, analysisResult: { ...(fa.analysisResult as PegaRuleAnalysis), feedbackItems: (fa.analysisResult as PegaRuleAnalysis).feedbackItems.map((item, iIdx) => iIdx === itemIndex ? { ...item, chatHistory: [...item.chatHistory, newUserMessage] } : item) }} : fa) || null);
    setChatProcessingItemId(itemId);
    
    const { chat, chatModel, chatSystemInstructionTemplate } = getSelectedLlmServices();

    try {
      const aiResponseText = await chat(currentItem, currentItem.chatHistory, userMessage, effectiveApiKey, chatSystemInstructionTemplate, chatModel, effectiveAzureEndpoint);
      const aiResponseMessage: ChatMessage = { id: generateChatMsgUUID(), sender: 'ai', message: aiResponseText, timestamp: new Date() };
      
      setAnalysisData(prevData => prevData?.map((fa, fIdx) => fIdx === fileAnalysisIndex ? { ...fa, analysisResult: { ...(fa.analysisResult as PegaRuleAnalysis), feedbackItems: (fa.analysisResult as PegaRuleAnalysis).feedbackItems.map((item, iIdx) => iIdx === itemIndex ? { ...item, chatHistory: [...item.chatHistory, aiResponseMessage] } : item) }} : fa) || null);

    } catch (e: any) {
      console.error("Chat API call failed:", e);
      const errorMessage: ChatMessage = { id: generateChatMsgUUID(), sender: 'ai', message: "Sorry, I couldn't get a response. Please try again.", timestamp: new Date() };
       setAnalysisData(prevData => prevData?.map((fa, fIdx) => fIdx === fileAnalysisIndex ? { ...fa, analysisResult: { ...(fa.analysisResult as PegaRuleAnalysis), feedbackItems: (fa.analysisResult as PegaRuleAnalysis).feedbackItems.map((item, iIdx) => iIdx === itemIndex ? { ...item, chatHistory: [...item.chatHistory, errorMessage] } : item) }} : fa) || null);
    } finally {
      setChatProcessingItemId(null);
    }
  }, [analysisData, effectiveApiKey, selectedLlmProvider, effectiveAzureEndpoint]);

  const handleTabChange = (fileName: string) => setActiveTabFileName(fileName);
  
  const commonButtonClasses = "w-full sm:w-auto font-semibold py-3 px-8 rounded-lg shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-opacity-50 transition-all duration-300 ease-in-out disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center";
  
  const isConfigReadyForAnalysis = 
      (selectedLlmProvider === LlmProvider.AZURE_OPENAI && !!effectiveApiKey && !!effectiveAzureEndpoint) ||
      (selectedLlmProvider !== LlmProvider.AZURE_OPENAI && !!effectiveApiKey);

  const analyzeCodeButtonDisabled = isLoading || !xmlInput.trim() || !!chatProcessingItemId || !!zipFile || !isConfigReadyForAnalysis;
  const analyzePackageButtonDisabled = isLoading || !zipFile || !!chatProcessingItemId || xmlInput.trim() !== '' || !isConfigReadyForAnalysis;

  return (
    <>
      <div id="apiKeyInputSection" className="mb-8 p-6 bg-slate-50 border border-slate-300 rounded-lg shadow-md">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-4">
              <h2 className="text-xl font-semibold text-slate-800 mb-2 sm:mb-0">LLM Configuration</h2>
              <div className="flex items-center">
                  <label htmlFor="llmProviderSelect" className="mr-2 text-sm font-medium text-slate-700">Select Provider:</label>
                  <select 
                      id="llmProviderSelect"
                      value={selectedLlmProvider}
                      onChange={handleLlmProviderChange}
                      className="p-2 border border-slate-400 rounded-md shadow-sm focus:ring-2 focus:ring-sky-500 focus:border-sky-500 text-sm"
                  >
                      <option value={LlmProvider.GEMINI}>{LLM_PROVIDER_NAMES[LlmProvider.GEMINI]}</option>
                      <option value={LlmProvider.OPENAI}>{LLM_PROVIDER_NAMES[LlmProvider.OPENAI]}</option>
                      <option value={LlmProvider.AZURE_OPENAI}>{LLM_PROVIDER_NAMES[LlmProvider.AZURE_OPENAI]}</option>
                  </select>
              </div>
          </div>

          <div className="flex justify-between items-center mb-1">
                <h3 className="text-lg font-medium text-slate-700">
                  {LLM_PROVIDER_NAMES[selectedLlmProvider]} Configuration
              </h3>
                <button 
                  onClick={() => setIsHelpModalOpen(true)} 
                  className="ml-2 text-sky-600 hover:text-sky-800 focus:outline-none"
                  aria-label="Help with API Key and Endpoint"
                  title={`How to get your ${LLM_PROVIDER_NAMES[selectedLlmProvider]} API Key ${selectedLlmProvider === LlmProvider.AZURE_OPENAI ? '& Endpoint' : ''}`}
              >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 5.25h.008v.008H12V8.25Z" />
                  </svg>
              </button>
          </div>

          <p className={`text-sm mb-3 ${isConfigReadyForAnalysis ? 'text-green-700' : 'text-red-700'}`}>
              {apiKeyStatusMessage}
          </p>
          
          <>
              {showApiKeySuccess && (
                  <div className="mb-3 p-3 bg-green-100 text-green-700 rounded-md text-sm">
                      Configuration for {LLM_PROVIDER_NAMES[selectedLlmProvider]} set successfully!
                  </div>
              )}
              <div className="space-y-3">
                  <input
                      id="apiKeyInput"
                      type="password"
                      value={apiKeyInputValues[selectedLlmProvider]}
                      onChange={handleApiKeyInputChange}
                      placeholder={`Enter ${LLM_PROVIDER_NAMES[selectedLlmProvider]} API Key`}
                      className="w-full p-3 border border-slate-400 rounded-md shadow-sm focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                      aria-label={`${LLM_PROVIDER_NAMES[selectedLlmProvider]} API Key Input`}
                  />
                  {selectedLlmProvider === LlmProvider.AZURE_OPENAI && (
                      <input
                          id="azureEndpointInput"
                          type="text"
                          value={azureEndpointInputValue}
                          onChange={handleAzureEndpointInputChange}
                          placeholder="Enter Azure OpenAI Endpoint URL (e.g., https://your-resource.openai.azure.com/)"
                          className="w-full p-3 border border-slate-400 rounded-md shadow-sm focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                          aria-label="Azure OpenAI Endpoint URL Input"
                      />
                  )}
              </div>
              <div className="mt-3 flex flex-wrap gap-3 items-center">
                  <button
                      onClick={handleSetUserApiKeyAndEndpoint}
                      className="bg-sky-600 hover:bg-sky-700 text-white font-semibold py-3 px-6 rounded-md shadow-md focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-opacity-75 transition-colors duration-150"
                  >
                      Set Configuration
                  </button>
                   <button
                        onClick={() => setIsStandardsModalOpen(true)}
                        className="bg-slate-600 hover:bg-slate-700 text-white font-semibold py-3 px-6 rounded-md shadow-md focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-opacity-75 transition-colors duration-150 flex items-center gap-2"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M10.343 3.94c.09-.542.56-1.007 1.11-1.226m-2.22 0a2.25 2.25 0 0 0-2.22 2.22c0 .52.21 1.007.55 1.348l3.054 3.054a.75.75 0 0 1-1.06 1.06l-3.055-3.054a2.25 2.25 0 0 0-3.181 3.182l3.054 3.054a.75.75 0 0 1-1.06 1.06l-3.054-3.054a2.25 2.25 0 0 0-3.182 3.182l3.054 3.054a.75.75 0 1 1 1.06 1.06l-3.054-3.054a2.25 2.25 0 0 0 3.182-3.181l3.054-3.054.75-.75a.75.75 0 0 1 1.06 0l3.054 3.054a2.25 2.25 0 0 0 3.182 3.182l3.054-3.054a.75.75 0 0 1 1.06-1.06l-3.054-3.054a2.25 2.25 0 0 0-3.181-3.182l-3.054-3.054a.75.75 0 0 1-1.06-1.06l3.054-3.054a2.25 2.25 0 0 0-1.348-3.896Z" /></svg>
                        Manage Standards
                    </button>
              </div>
              {userSetApiKeys[selectedLlmProvider] && (
                  <button
                      onClick={() => {
                          setUserSetApiKeys(prev => ({ ...prev, [selectedLlmProvider]: '' }));
                          setApiKeyInputValues(prev => ({ ...prev, [selectedLlmProvider]: '' }));
                          if (selectedLlmProvider === LlmProvider.AZURE_OPENAI) {
                              setUserSetAzureEndpoint('');
                              setAzureEndpointInputValue('');
                          }
                      }}
                      className="mt-3 text-xs text-red-500 hover:text-red-700 underline"
                  >
                      Clear user-set configuration for {LLM_PROVIDER_NAMES[selectedLlmProvider]}
                  </button>
              )}
          </>
        </div>
      
      <div className="bg-white p-6 sm:p-8 rounded-xl shadow-xl space-y-8">
        <div>
          <h2 className="text-2xl font-semibold text-gray-800 mb-1">Analyze Pega XML Snippet</h2>
          <p className="text-gray-600 mb-6">
            Paste your Pega Rule-Obj-XML or other Pega XML snippets below. Analysis via <span className="font-semibold text-sky-700">{LLM_PROVIDER_NAMES[selectedLlmProvider]}</span>.
          </p>
          <textarea
            value={xmlInput}
            onChange={handleXmlInputChange}
            placeholder="&lt;Rule-Obj-Activity pzRuleName=&quot;MyActivityName&quot; pzClassName=&quot;My-App-Work-MyCase&quot;&gt;...&lt;/Rule-Obj-Activity&gt;"
            className="w-full h-60 p-4 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-colors duration-200 resize-y font-mono text-xs sm:text-sm"
            disabled={isLoading || !!chatProcessingItemId || !!zipFile || !isConfigReadyForAnalysis}
            aria-label="Pega XML input"
          />
          <button
            onClick={handleAnalyzeXmlClick}
            disabled={analyzeCodeButtonDisabled}
            title={!isConfigReadyForAnalysis ? `Configuration for ${LLM_PROVIDER_NAMES[selectedLlmProvider]} is required` : "Analyze the XML snippet"}
            className={`mt-6 bg-sky-600 hover:bg-sky-700 text-white ${commonButtonClasses}`}
          >
            {isLoading && !zipFile ? (
              <><svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>Analyzing Snippet...</>
            ) : (
              <><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 mr-2"><path strokeLinecap="round" strokeLinejoin="round" d="m21 7.5-9-5.25L3 7.5m18 0-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" /></svg>Analyze Snippet</>
            )}
          </button>
        </div>

        <hr className="my-8 border-gray-300" />
        
        <div>
          <h2 className="text-2xl font-semibold text-gray-800 mb-1">Analyze Pega Product Package</h2>
          <p className="text-gray-600 mb-6">
            Upload a Pega product ZIP file. Each XML rule found will be analyzed individually via <span className="font-semibold text-sky-700">{LLM_PROVIDER_NAMES[selectedLlmProvider]}</span>.
          </p>
          <input
            id="zipFileInput"
            type="file"
            accept=".zip,application/zip"
            onChange={handleZipFileChange}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-sky-50 file:text-sky-700 hover:file:bg-sky-100 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isLoading || !!chatProcessingItemId || xmlInput.trim() !== '' || !isConfigReadyForAnalysis}
            aria-label="Pega product package ZIP file"
          />
          {zipFile && <p className="mt-2 text-sm text-gray-600">Selected file: {zipFile.name}</p>}
          <button
            onClick={handleAnalyzeZipFile}
            disabled={analyzePackageButtonDisabled}
            title={!isConfigReadyForAnalysis ? `Configuration for ${LLM_PROVIDER_NAMES[selectedLlmProvider]} is required` : "Analyze the Pega package"}
            className={`mt-6 bg-teal-600 hover:bg-teal-700 text-white ${commonButtonClasses}`}
          >
            {isLoading && !!zipFile ? (
                <><svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>Analyzing Package...</>
            ) : (
              <><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 mr-2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 4.5v15m6-15v15m-10.875 0h15.75c.621 0 1.125-.504 1.125-1.125V5.625c0-.621-.504-1.125-1.125-1.125H4.125C3.504 4.5 3 5.004 3 5.625v13.75c0 .621.504 1.125 1.125 1.125Z" /></svg>Analyze Package</>
            )}
          </button>
          <p className="mt-3 text-xs text-gray-500">
            Note: Large packages with many XML files may take some time. Each XML is analyzed separately.
          </p>
        </div>
      </div>

      {isLoading && <LoadingSpinner />}
      {error && !isLoading && <ErrorMessage message={error} />}
      
      {!isLoading && !error && analysisData && analysisData.length > 0 && activeTabFileName && (
          <AnalysisDisplay 
            analysisData={analysisData}
            activeTabFileName={activeTabFileName}
            onTabChange={handleTabChange}
            onSendMessageToChat={handleSendMessageToChat}
            onToggleIgnoreItem={handleToggleIgnoreFeedbackItem}
            chatProcessingItemId={chatProcessingItemId}
          />
      )}
        {!isLoading && !error && (!analysisData || analysisData.length === 0) && !xmlInput && !zipFile && isConfigReadyForAnalysis && (
          <div className="text-center p-8 mt-8 bg-white rounded-lg shadow-md">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-16 h-16 mx-auto text-gray-400 mb-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 1 1-3 0m3 0a1.5 1.5 0 1 0-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-9.75 0h9.75" />
          </svg>
          <h2 className="text-xl font-semibold text-gray-700">Ready for Analysis with {LLM_PROVIDER_NAMES[selectedLlmProvider]}</h2>
          <p className="text-gray-500 mt-2">Paste your Pega XML code snippet or upload a Pega product package ZIP file to get started.</p>
      </div>
      )}
        {!isLoading && !error && (!analysisData || analysisData.length === 0) && !isConfigReadyForAnalysis && (
          <div className="text-center p-8 mt-8 bg-yellow-50 border border-yellow-200 rounded-lg shadow-md">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-16 h-16 mx-auto text-yellow-500 mb-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m0-10.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.75c0 5.592 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.57-.598-3.75h-.152c-3.196 0-6.1-1.248-8.25-3.286Zm0 13.036h.008v.008H12v-.008Z" />
          </svg>
          <h2 className="text-xl font-semibold text-yellow-700">
              Configuration Required for {LLM_PROVIDER_NAMES[selectedLlmProvider]}
          </h2>
          <p className="text-yellow-600 mt-2">
              Please provide your {LLM_PROVIDER_NAMES[selectedLlmProvider]} API Key {selectedLlmProvider === LlmProvider.AZURE_OPENAI ? 'and Endpoint URL ' : ''} 
              using the form above to enable code analysis. 
              Click the <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 inline align-text-bottom"><path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 5.25h.008v.008H12V8.25Z" /></svg> icon for help.
          </p>
      </div>
      )}

      <ApiKeyHelpModal 
        isOpen={isHelpModalOpen} 
        onClose={() => setIsHelpModalOpen(false)}
        selectedProvider={selectedLlmProvider}
      />
      <CustomStandardsModal
        isOpen={isStandardsModalOpen}
        onClose={() => setIsStandardsModalOpen(false)}
        standards={standards}
        onAdd={addStandard}
        onAddMultiple={addMultipleStandards}
        onUpdate={updateStandard}
        onDelete={deleteStandard}
        onToggle={toggleStandardIsEnabled}
        onSync={syncStandards}
        effectiveApiKey={effectiveApiKey}
        analysisModelName={getSelectedLlmServices().analysisModel}
        llmProvider={selectedLlmProvider}
        isLoggedIn={!!currentUser}
    />
    </>
  );
};

export default AnalyzerPage;