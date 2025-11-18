import React from 'react';

export default function StrategyVersionSelector({ strategies, currentStrategy, sessionId }) {
  const handleVersionChange = (strategyId) => {
    // For MVP: simple page refresh with hash
    // In production: use proper state management
    window.location.hash = `strategy-${strategyId}`;
    window.location.reload();
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-gray-700">Strategy Version</label>
        <select
          value={currentStrategy.id}
          onChange={(e) => handleVersionChange(parseInt(e.target.value))}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          {strategies.map((strategy) => (
            <option key={strategy.id} value={strategy.id}>
              v{strategy.versionNumber} {strategy.isActive ? '(Active)' : '(Draft)'} - {strategy.postCount} posts
            </option>
          ))}
        </select>
      </div>

      {strategies.length > 1 && (
        <p className="text-xs text-gray-600 mt-2">
          {strategies.length} versions available. Switch to compare.
        </p>
      )}
    </div>
  );
}