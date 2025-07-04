

import React, { useState, useEffect, useRef } from 'react';
import { FeedbackItem, ChatMessage } from '../types';

interface FeedbackChatProps {
  item: FeedbackItem;
  onSendMessage: (itemId: string, userMessage: string) => Promise<void>;
  isSendingMessage: boolean;
}

const FeedbackChat: React.FC<FeedbackChatProps> = ({ item, onSendMessage, isSendingMessage }) => {
  const [newMessage, setNewMessage] = useState('');
  const chatMessagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    chatMessagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [item.chatHistory]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newMessage.trim() === '' || isSendingMessage) return;
    await onSendMessage(item.id, newMessage.trim());
    setNewMessage('');
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
      <h5 className="text-md font-semibold text-gray-700 mb-3">Discuss: <span className="font-normal italic">{item.area}</span></h5>
      <div className="max-h-60 overflow-y-auto mb-3 pr-2 space-y-3">
        {item.chatHistory.length === 0 && (
            <p className="text-sm text-gray-500 italic text-center py-2">No discussion yet. Ask a question about this feedback.</p>
        )}
        {item.chatHistory.map((chatMsg) => (
          <div key={chatMsg.id} className={`flex ${chatMsg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[70%] p-2.5 rounded-lg shadow-sm ${
                chatMsg.sender === 'user' 
                ? 'bg-sky-500 text-white rounded-br-none' 
                : 'bg-white text-gray-700 border border-gray-200 rounded-bl-none'
            }`}>
              <p className="text-sm">{chatMsg.message}</p>
              <p className={`text-xs mt-1 ${chatMsg.sender === 'user' ? 'text-sky-100' : 'text-gray-400'} text-right`}>
                {formatDate(chatMsg.timestamp)}
              </p>
            </div>
          </div>
        ))}
        <div ref={chatMessagesEndRef} />
      </div>
      <form onSubmit={handleSend} className="flex items-center space-x-2">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Ask a question..."
          className="flex-grow p-2.5 border border-gray-300 rounded-lg focus:ring-1 focus:ring-sky-500 focus:border-sky-500 text-sm"
          disabled={isSendingMessage}
          aria-label="Your message for chat"
        />
        <button
          type="submit"
          disabled={isSendingMessage || newMessage.trim() === ''}
          className="bg-sky-600 hover:bg-sky-700 text-white font-medium py-2.5 px-4 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-opacity-50 transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          aria-label="Send chat message"
        >
          {isSendingMessage ? (
            <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" />
            </svg>
          )}
        </button>
      </form>
    </div>
  );
};

export default FeedbackChat;