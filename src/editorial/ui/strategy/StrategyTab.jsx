import React from 'react';
import { useQuery } from 'wasp/client/operations';
import { getStrategyConversation } from 'wasp/client/operations';
import StrategyChat from './StrategyChat';
import StrategyContent from './StrategyContent';
import StrategyVersionSelector from './StrategyVersionSelector';
import GenerateStrategyButton from './GenerateStrategyButton';


export default function StrategyTab({ project, session }) {
  const { data, isLoading, error, refetch } = useQuery(getStrategyConversation, {
    sessionId: session.id,
  });

  const handleUpdate = () => {
    refetch();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading strategy...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <p className="text-red-800">Failed to load strategy: {error.message}</p>
      </div>
    );
  }

  const { messages, strategies, currentStrategy } = data;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Main Content - 2/3 width */}
      <div className="lg:col-span-2 space-y-6">
        {/* Version Selector */}
        {strategies.length > 1 && (
          <StrategyVersionSelector
            strategies={strategies}
            currentStrategy={currentStrategy}
            sessionId={session.id}
          />
        )}

        {/* Strategy Content */}
        {currentStrategy && (
          <StrategyContent
            strategy={currentStrategy}
            project={project}
            sessionId={session.id}
            onUpdate={handleUpdate}
          />
        )}

        {/* No Strategy - Show Generate Button */}
        {!currentStrategy && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
            <div className="max-w-md mx-auto">
              <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-10 h-10 text-blue-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </div>

              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                Ready to Generate Strategy
              </h3>

              <p className="text-gray-600 mb-6">
                Your keyword research has been approved. Click below to generate a complete 30-day editorial calendar with content pillars, post titles, and linking strategy.
              </p>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 text-left">
                <h4 className="font-medium text-blue-900 mb-2">What will be generated:</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>✓ 3-5 thematic content pillars</li>
                  <li>✓ 30 blog posts with unique primary keywords</li>
                  <li>✓ Internal linking suggestions</li>
                  <li>✓ External resource recommendations</li>
                  <li>✓ Publish date schedule</li>
                </ul>
              </div>

              <GenerateStrategyButton 
                project={project}
                onSuccess={handleUpdate}
              />

              <p className="text-xs text-gray-500 mt-4">
                Generation takes approximately 1-2 minutes
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Chat Sidebar - 1/3 width */}
      <div className="lg:col-span-1">
        <StrategyChat
          sessionId={session.id}
          messages={messages}
          sessionStatus={session.status}
          project={project}
          onUpdate={handleUpdate}
        />
      </div>
    </div>
  );
}