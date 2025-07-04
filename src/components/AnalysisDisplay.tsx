import React from 'react';
import { PegaFileAnalysis, PegaRuleAnalysis, isPegaAnalysisError } from '../types';
import ScoreCard from './ScoreCard';
import FeedbackItemCard from './FeedbackItemCard';
import ErrorMessage from './ErrorMessage'; // For displaying file-specific errors

interface AnalysisDisplayProps {
  analysisData: PegaFileAnalysis[];
  activeTabFileName: string | null;
  onTabChange: (fileName: string) => void;
  onSendMessageToChat: (fileName: string, itemId: string, userMessage: string) => Promise<void>;
  onToggleIgnoreItem: (fileName: string, itemId: string) => void; // New prop
  chatProcessingItemId: string | null;
}

const AnalysisDisplay: React.FC<AnalysisDisplayProps> = ({ 
  analysisData, 
  activeTabFileName, 
  onTabChange, 
  onSendMessageToChat,
  onToggleIgnoreItem,
  chatProcessingItemId 
}) => {
  if (!analysisData || analysisData.length === 0 || !activeTabFileName) {
    return (
        <div className="text-center p-8 mt-8 bg-white rounded-lg shadow-md">
            <h2 className="text-xl font-semibold text-gray-700">No Analysis Available</h2>
            <p className="text-gray-500 mt-2">Please perform an analysis to see results.</p>
        </div>
    );
  }

  const activeFileAnalysis = analysisData.find(file => file.fileName === activeTabFileName);

  if (!activeFileAnalysis) {
     return <ErrorMessage message={`Could not find analysis for file: ${activeTabFileName}`} />;
  }
  
  const currentAnalysis = activeFileAnalysis.analysisResult;

  const pegaPracticeItems = isPegaAnalysisError(currentAnalysis) ? [] : currentAnalysis.feedbackItems.filter(item => item.category !== 'Organization Standard');
  const orgStandardItems = isPegaAnalysisError(currentAnalysis) ? [] : currentAnalysis.feedbackItems.filter(item => item.category === 'Organization Standard');

  return (
    <div className="mt-8">
      {/* Tab Navigation */}
      <div className="mb-6 border-b border-gray-300 flex flex-wrap">
        {analysisData.map((file) => (
          <button
            key={file.fileName}
            onClick={() => onTabChange(file.fileName)}
            className={`py-3 px-4 -mb-px text-sm font-medium text-center whitespace-nowrap
                        ${activeTabFileName === file.fileName 
                            ? 'border-b-2 border-sky-600 text-sky-700' 
                            : 'border-b-2 border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-400'
                        }
                        focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-opacity-50 rounded-t-md`}
            aria-current={activeTabFileName === file.fileName ? 'page' : undefined}
          >
            {file.fileName.length > 30 ? `${file.fileName.substring(0,27)}...` : file.fileName}
          </button>
        ))}
      </div>

      {/* Content for the active tab */}
      {isPegaAnalysisError(currentAnalysis) ? (
        <div className="bg-white p-6 rounded-xl shadow-lg">
          <ErrorMessage message={`Analysis Error for ${activeFileAnalysis.fileName}: ${currentAnalysis.error}`} />
        </div>
      ) : (
        <div className="space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            <div className="lg:col-span-1">
              <ScoreCard 
                score={currentAnalysis.userAdjustedScore} 
                originalScore={currentAnalysis.overallScore} 
              />
            </div>
            <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-lg">
              <h3 className="text-2xl font-semibold text-gray-800 mb-4">LSA Summary for <span className="italic text-sky-700">{activeFileAnalysis.fileName}</span></h3>
              <p className="text-gray-600 leading-relaxed whitespace-pre-wrap">{currentAnalysis.summary}</p>
            </div>
          </div>

          <div>
            <h3 className="text-2xl font-semibold text-gray-800 mb-6 mt-10">Detailed Feedback for <span className="italic text-sky-700">{activeFileAnalysis.fileName}</span></h3>
            
            {currentAnalysis.feedbackItems.length === 0 ? (
              <div className="bg-white p-8 rounded-lg shadow text-center">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-12 h-12 mx-auto text-green-500 mb-3">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                </svg>
                <p className="text-xl text-gray-700 font-medium">Excellent! No specific issues found for this file.</p>
                <p className="text-gray-500 mt-1">The AI found the code in <span className="italic">{activeFileAnalysis.fileName}</span> to be in good standing.</p>
              </div>
            ) : (
              <div className="space-y-10">
                {orgStandardItems.length > 0 && (
                  <div>
                    <h4 className="text-xl font-bold text-gray-800 mb-4 border-b pb-2 flex items-center gap-3">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-slate-600">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h6.375M9 12h6.375m-6.375 5.25h6.375" />
                      </svg>
                      Organization Standards ({orgStandardItems.length})
                    </h4>
                    <div className="space-y-4">
                      {orgStandardItems.map((item) => (
                        <FeedbackItemCard 
                          key={item.id} 
                          item={item}
                          onSendMessage={(itemId, userMessage) => onSendMessageToChat(activeFileAnalysis.fileName, itemId, userMessage)}
                          onToggleIgnore={(itemId) => onToggleIgnoreItem(activeFileAnalysis.fileName, itemId)}
                          isChatProcessingForItem={chatProcessingItemId === item.id}
                        />
                      ))}
                    </div>
                  </div>
                )}
                
                {pegaPracticeItems.length > 0 && (
                  <div>
                    <h4 className="text-xl font-bold text-gray-800 mb-4 border-b pb-2 flex items-center gap-3">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-sky-700">
                         <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                      </svg>
                      Pega Best Practices ({pegaPracticeItems.length})
                    </h4>
                    <div className="space-y-4">
                      {pegaPracticeItems.map((item) => (
                        <FeedbackItemCard 
                          key={item.id} 
                          item={item}
                          onSendMessage={(itemId, userMessage) => onSendMessageToChat(activeFileAnalysis.fileName, itemId, userMessage)}
                          onToggleIgnore={(itemId) => onToggleIgnoreItem(activeFileAnalysis.fileName, itemId)}
                          isChatProcessingForItem={chatProcessingItemId === item.id}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AnalysisDisplay;