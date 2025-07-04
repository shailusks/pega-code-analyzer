

import React, { useState } from 'react';
import { FeedbackItem, SeverityLevel, ChatMessage } from '../types';
import FeedbackChat from './FeedbackChat'; 

interface FeedbackItemCardProps {
  item: FeedbackItem;
  onSendMessage: (itemId: string, userMessage: string) => Promise<void>;
  onToggleIgnore: (itemId: string) => void; // New prop
  isChatProcessingForItem: boolean;
}

const getSeverityStyles = (severity: SeverityLevel): { icon: React.ReactNode; bgColor: string; textColor: string; borderColor: string; name: string; } => {
  switch (severity) {
    case SeverityLevel.CRITICAL:
      return { 
        icon: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" /></svg>,
        bgColor: 'bg-red-100', 
        textColor: 'text-red-700', 
        borderColor: 'border-red-500',
        name: 'Critical'
      };
    case SeverityLevel.MAJOR:
      return { 
        icon: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" /></svg>,
        bgColor: 'bg-orange-100', 
        textColor: 'text-orange-700', 
        borderColor: 'border-orange-500',
        name: 'Major'
      };
    case SeverityLevel.MINOR:
      return { 
        icon: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 5.25h.008v.008H12v-.008Z" /></svg>,
        bgColor: 'bg-yellow-100', 
        textColor: 'text-yellow-700', 
        borderColor: 'border-yellow-500',
        name: 'Minor'
      };
    case SeverityLevel.INFO:
    default:
      return { 
        icon: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" /></svg>,
        bgColor: 'bg-sky-100', 
        textColor: 'text-sky-700', 
        borderColor: 'border-sky-500',
        name: 'Info'
      };
  }
};

const FeedbackItemCard: React.FC<FeedbackItemCardProps> = ({ item, onSendMessage, onToggleIgnore, isChatProcessingForItem }) => {
  const { icon, bgColor, textColor, borderColor, name } = getSeverityStyles(item.severity);
  const [isChatOpen, setIsChatOpen] = useState(false);

  const toggleChat = () => {
    if (item.isIgnored) return; // Don't open chat if item is ignored
    setIsChatOpen(!isChatOpen);
  }

  const handleIgnoreToggle = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation(); // Prevent card click or other events if needed
    onToggleIgnore(item.id);
    if (item.isIgnored && isChatOpen) { // If un-ignoring, chat remains as is. If ignoring, close chat.
      // No, if it becomes ignored, chat should close.
    } else if (!item.isIgnored && isChatOpen) {
      // if it becomes un-ignored, chat remains as is.
    }
     if (!item.isIgnored) { // if item is about to be ignored
        setIsChatOpen(false); // Close chat when ignoring
    }
  };

  const ignoredStyles = item.isIgnored ? 'opacity-60 bg-gray-50' : 'bg-white';
  const textIgnoredStyles = item.isIgnored ? 'line-through text-gray-500' : 'text-gray-600';

  return (
    <div className={`p-5 rounded-lg shadow-md border-l-4 ${borderColor} mb-4 transition-all duration-300 hover:shadow-xl ${ignoredStyles}`}>
      <div className="flex items-start">
        <span className={`mr-3 mt-1 shrink-0 ${textColor} ${item.isIgnored ? 'opacity-50' : ''}`}>{icon}</span>
        <div className="flex-grow">
          <div className="flex justify-between items-center">
            <h4 className={`text-lg font-semibold ${textColor} ${item.isIgnored ? 'line-through' : ''}`}>{item.area}</h4>
            <div className="flex items-center space-x-2">
              {item.isIgnored && (
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-200 text-gray-600">Ignored</span>
              )}
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${bgColor} ${textColor} ${item.isIgnored ? 'opacity-50' : ''}`}>{name}</span>
            </div>
          </div>
        </div>
      </div>
      
      <div className="mt-3 pl-8 space-y-3">
        <div>
            <strong className={`text-gray-700 block ${item.isIgnored ? 'line-through opacity-70' : ''}`}>Issue:</strong>
            <p className={`${textIgnoredStyles}`}>{item.issue}</p>
        </div>
        <div>
            <strong className={`text-gray-700 block ${item.isIgnored ? 'line-through opacity-70' : ''}`}>Suggestion:</strong>
            <p className={`${textIgnoredStyles}`}>{item.suggestion}</p>
        </div>
        {item.bestPracticeReference && (
          <div>
            <strong className={`text-gray-700 block ${item.isIgnored ? 'line-through opacity-70' : ''}`}>Best Practice:</strong>
            <p className={`text-sm ${item.isIgnored ? 'line-through text-gray-400' : 'text-gray-500'}`}>{item.bestPracticeReference}</p>
          </div>
        )}
        {item.bestPracticeReasoning && (
          <div>
            <strong className={`text-gray-700 block ${item.isIgnored ? 'line-through opacity-70' : ''}`}>Reasoning:</strong>
            <p className={`text-sm italic ${item.isIgnored ? 'line-through text-gray-400' : 'text-gray-500'}`}>{item.bestPracticeReasoning}</p>
          </div>
        )}
        <div className="pt-2 flex justify-between items-center">
            <button
                onClick={toggleChat}
                className={`text-sm font-medium flex items-center ${item.isIgnored ? 'text-gray-400 cursor-not-allowed' : 'text-sky-600 hover:text-sky-800'}`}
                aria-expanded={isChatOpen}
                aria-controls={`chat-${item.id}`}
                disabled={item.isIgnored}
                title={item.isIgnored ? "Item is ignored" : (isChatOpen ? 'Close Discussion' : 'Discuss Further')}
            >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 mr-1">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-3.86 8.25-8.625 8.25S3.75 16.556 3.75 12 .375 3.75 8.625 3.75 12 5.094 12 7.5h8.25Z" />
                </svg>
                {isChatOpen ? 'Close Discussion' : 'Discuss Further'}
            </button>
            <button
                onClick={handleIgnoreToggle}
                className={`text-xs px-3 py-1 rounded-md font-medium flex items-center transition-colors
                            ${item.isIgnored 
                                ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200' 
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                title={item.isIgnored ? 'Mark as Not Ignored' : 'Ignore this Item'}
            >
                {item.isIgnored ? (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 mr-1.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                    </svg>
                ) : (
                     <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 mr-1.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9.75L14.25 12m0 0l2.25 2.25M14.25 12l2.25-2.25M14.25 12L12 14.25m-2.58 4.92l-6.375-6.375a1.125 1.125 0 0 1 0-1.59L9.42 4.83c.211-.211.498-.33.796-.33H19.5a2.25 2.25 0 0 1 2.25 2.25v10.5a2.25 2.25 0 0 1-2.25 2.25h-9.284c-.298 0-.585-.119-.796-.33Z" />
                    </svg>
                )}
                {item.isIgnored ? 'Un-ignore' : 'Ignore'}
            </button>
        </div>
      </div>

      {isChatOpen && !item.isIgnored && (
        <div id={`chat-${item.id}`} className="mt-4 pt-4 border-t border-gray-200">
            <FeedbackChat
                item={item}
                onSendMessage={onSendMessage}
                isSendingMessage={isChatProcessingForItem}
            />
        </div>
      )}
    </div>
  );
};

export default FeedbackItemCard;