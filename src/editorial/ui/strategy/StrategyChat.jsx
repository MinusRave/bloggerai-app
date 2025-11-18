import React, { useState, useRef, useEffect } from 'react';
import { sendStrategyMessage } from 'wasp/client/operations';

export default function StrategyChat({ sessionId, messages, sessionStatus, project }) {
  const [inputValue, setInputValue] = useState('');
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!inputValue.trim() || isSending) return;

    setIsSending(true);
    const userMessage = inputValue;
    setInputValue('');

    try {
      await sendStrategyMessage({
        sessionId,
        content: userMessage,
      });
      
      // Refresh page to show new strategy version
      window.location.reload();
    } catch (error) {
      console.error('Failed to send message:', error);
      alert('Failed to send message: ' + error.message);
      setInputValue(userMessage); // Restore message on error
    } finally {
      setIsSending(false);
    }
  };

  const isSessionCompleted = sessionStatus === 'COMPLETED';

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 flex flex-col h-[600px] sticky top-4">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">Strategy Chat</h3>
        <p className="text-sm text-gray-600 mt-1">
          {isSessionCompleted ? 'Session completed' : 'Refine your strategy with AI'}
        </p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message, index) => {
          const isUser = message.role === 'USER';
          const isSystem = message.role === 'SYSTEM';

          return (
            <div
              key={index}
              className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-lg px-4 py-2 ${
                  isUser
                    ? 'bg-blue-600 text-white'
                    : isSystem
                    ? 'bg-gray-100 text-gray-700 italic text-sm'
                    : 'bg-gray-200 text-gray-900'
                }`}
              >
                {!isUser && !isSystem && (
                  <div className="text-xs font-semibold text-gray-600 mb-1">AI Assistant</div>
                )}
                <div className="whitespace-pre-wrap text-sm">{message.content}</div>
                <div className="text-xs mt-1 opacity-70">
                  {new Date(message.timestamp).toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </div>
              </div>
            </div>
          );
        })}

        {isSending && (
          <div className="flex justify-start">
            <div className="bg-gray-200 rounded-lg px-4 py-2">
              <div className="flex items-center gap-2">
                <div className="animate-pulse text-gray-600">AI is thinking...</div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-gray-200">
        {isSessionCompleted ? (
          <div className="text-center text-sm text-gray-600 py-2">
            Session completed. Strategy is locked.
          </div>
        ) : (
          <div className="flex gap-2">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
              placeholder="Ask to modify strategy..."
              disabled={isSending}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
            />
            <button
              onClick={handleSend}
              disabled={!inputValue.trim() || isSending}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSending ? '...' : 'Send'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}