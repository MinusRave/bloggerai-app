import React, { useState, useMemo } from 'react';
import { updateKeywordSelection } from 'wasp/client/operations';

export default function KeywordListView({ clusters, stats, onUpdate, isApproved }) {
  const [sortBy, setSortBy] = useState('priority'); // priority, volume, difficulty, alphabet
  const [filterFunnel, setFilterFunnel] = useState('all'); // all, ToF, MoF, BoF
  const [filterSelection, setFilterSelection] = useState('all'); // all, selected, unselected, ai
  const [searchQuery, setSearchQuery] = useState('');

  // Flatten all keywords
  const allKeywords = useMemo(() => {
    return clusters.flatMap((cluster) =>
      cluster.keywords.map((kw) => ({
        ...kw,
        clusterName: cluster.name,
        priorityScore: cluster.priorityScore,
      }))
    );
  }, [clusters]);

  // Filter and sort
  const filteredKeywords = useMemo(() => {
    let filtered = allKeywords;

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((kw) =>
        kw.keyword.toLowerCase().includes(query)
      );
    }

    // Funnel filter
    if (filterFunnel !== 'all') {
      filtered = filtered.filter((kw) => kw.funnelStage === filterFunnel);
    }

    // Selection filter
    if (filterSelection === 'selected') {
      filtered = filtered.filter((kw) => kw.isSelectedByAI || kw.isSelectedByUser);
    } else if (filterSelection === 'unselected') {
      filtered = filtered.filter((kw) => !kw.isSelectedByAI && !kw.isSelectedByUser);
    } else if (filterSelection === 'ai') {
      filtered = filtered.filter((kw) => kw.isSelectedByAI);
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'priority':
          return (b.priorityScore || 0) - (a.priorityScore || 0);
        case 'volume':
          return (b.premiumVolume || 0) - (a.premiumVolume || 0);
        case 'difficulty':
          const aDiff = a.premiumDifficulty || difficultyToNumber(a.freeDifficulty);
          const bDiff = b.premiumDifficulty || difficultyToNumber(b.freeDifficulty);
          return aDiff - bDiff; // Ascending (easier first)
        case 'alphabet':
          return a.keyword.localeCompare(b.keyword);
        default:
          return 0;
      }
    });

    return filtered;
  }, [allKeywords, searchQuery, filterFunnel, filterSelection, sortBy]);

  const handleKeywordToggle = async (keyword) => {
    if (isApproved) return;

    // ========== FIX: Logica corretta ==========
    const isCurrentlySelected = keyword.isSelectedByAI || keyword.isSelectedByUser;
    const newState = !isCurrentlySelected;
    
    const selectionType = (!newState && keyword.isSelectedByAI && !keyword.isSelectedByUser) 
      ? 'ai' 
      : 'user';
    // ========== FINE FIX ==========

    try {
      await updateKeywordSelection({
        keywordId: keyword.id,
        isSelected: newState,
        selectionType,
      });
      onUpdate();
    } catch (error) {
      console.error('Failed to update keyword:', error);
      alert('Failed to update keyword: ' + error.message);
    }
  };

  const getDifficultyColor = (difficulty) => {
    if (!difficulty) return 'text-gray-500';
    if (typeof difficulty === 'string') {
      if (difficulty === 'EASY') return 'text-green-600';
      if (difficulty === 'MEDIUM') return 'text-yellow-600';
      if (difficulty === 'HARD') return 'text-orange-600';
      if (difficulty === 'VERY_HARD') return 'text-red-600';
    }
    if (difficulty < 30) return 'text-green-600';
    if (difficulty < 50) return 'text-yellow-600';
    if (difficulty < 70) return 'text-orange-600';
    return 'text-red-600';
  };

  const formatVolume = (keyword) => {
    if (keyword.premiumVolume) {
      return keyword.premiumVolume.toLocaleString();
    }
    return keyword.freeVolume || 'N/A';
  };

  const formatDifficulty = (keyword) => {
    if (keyword.premiumDifficulty) {
      return keyword.premiumDifficulty.toFixed(0);
    }
    return keyword.freeDifficulty || 'N/A';
  };

  const difficultyToNumber = (difficulty) => {
    const map = { EASY: 25, MEDIUM: 50, HARD: 75, VERY_HARD: 90 };
    return map[difficulty] || 50;
  };

  const exportToCSV = () => {
    const headers = [
      'Keyword',
      'Cluster',
      'Volume',
      'Difficulty',
      'Funnel Stage',
      'Search Intent',
      'Selected',
      'AI Recommended',
      'Featured Snippet',
      'PAA',
      'Existing Content',
    ];

    const rows = filteredKeywords.map((kw) => [
      kw.keyword,
      kw.clusterName,
      kw.premiumVolume || kw.freeVolume || '',
      kw.premiumDifficulty || kw.freeDifficulty || '',
      kw.funnelStage || '',
      kw.searchIntent || '',
      kw.isSelectedByUser || kw.isSelectedByAI ? 'Yes' : 'No',
      kw.isSelectedByAI ? 'Yes' : 'No',
      kw.hasFeaturedSnippet ? 'Yes' : 'No',
      kw.hasPAA ? 'Yes' : 'No',
      kw.isInExistingContent ? 'Yes' : 'No',
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'keyword-research.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Filters and controls */}
      <div className="p-6 border-b border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          {/* Search */}
          <div className="md:col-span-2">
            <input
              type="text"
              placeholder="Search keywords..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Sort */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="priority">Sort: Priority</option>
            <option value="volume">Sort: Volume</option>
            <option value="difficulty">Sort: Difficulty</option>
            <option value="alphabet">Sort: A-Z</option>
          </select>

          {/* Export */}
          <button
            onClick={exportToCSV}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors"
          >
            📥 Export CSV
          </button>
        </div>

        <div className="flex gap-3">
          {/* Funnel filter */}
          <div className="flex gap-2">
            <button
              onClick={() => setFilterFunnel('all')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                filterFunnel === 'all'
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              All Funnel
            </button>
            <button
              onClick={() => setFilterFunnel('ToF')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                filterFunnel === 'ToF'
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              ToF
            </button>
            <button
              onClick={() => setFilterFunnel('MoF')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                filterFunnel === 'MoF'
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              MoF
            </button>
            <button
              onClick={() => setFilterFunnel('BoF')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                filterFunnel === 'BoF'
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              BoF
            </button>
          </div>

          <div className="border-r border-gray-300"></div>

          {/* Selection filter */}
          <div className="flex gap-2">
            <button
              onClick={() => setFilterSelection('all')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                filterSelection === 'all'
                  ? 'bg-green-100 text-green-700'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilterSelection('selected')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                filterSelection === 'selected'
                  ? 'bg-green-100 text-green-700'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              ✓ Selected
            </button>
            <button
              onClick={() => setFilterSelection('ai')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                filterSelection === 'ai'
                  ? 'bg-purple-100 text-purple-700'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              ✨ AI
            </button>
            <button
              onClick={() => setFilterSelection('unselected')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                filterSelection === 'unselected'
                  ? 'bg-gray-200 text-gray-700'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Unselected
            </button>
          </div>
        </div>

        <div className="mt-4 text-sm text-gray-600">
          Showing {filteredKeywords.length} of {allKeywords.length} keywords
        </div>
      </div>

      {/* Keywords table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {!isApproved && <th className="w-12 px-4 py-3"></th>}
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase">
                Keyword
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase">
                Cluster
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase">
                Volume
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase">
                Difficulty
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase">
                Funnel
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase">
                Intent
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase">
                SERP
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredKeywords.map((keyword) => {
              const isSelected = keyword.isSelectedByAI || keyword.isSelectedByUser;

              return (
                <tr
                  key={keyword.id}
                  className={`hover:bg-gray-50 transition-colors ${
                    isSelected ? 'bg-green-50' : ''
                  }`}
                >
                  {/* Checkbox */}
                  {!isApproved && (
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleKeywordToggle(keyword)}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                      />
                    </td>
                  )}

                  {/* Keyword */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900">
                        {keyword.keyword}
                      </span>
                      {keyword.isSelectedByAI && !keyword.isSelectedByUser && (
                        <span className="text-xs text-purple-600">✨</span>
                      )}
                      {keyword.isInExistingContent && (
                        <span className="text-xs text-orange-600" title="Already exists">
                          ⚠️
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Cluster */}
                  <td className="px-4 py-3">
                    <span className="text-sm text-gray-600">{keyword.clusterName}</span>
                  </td>

                  {/* Volume */}
                  <td className="px-4 py-3">
                    <span className="text-sm font-medium text-gray-900">
                      {formatVolume(keyword)}
                    </span>
                  </td>

                  {/* Difficulty */}
                  <td className="px-4 py-3">
                    <span
                      className={`text-sm font-semibold ${getDifficultyColor(
                        keyword.premiumDifficulty || keyword.freeDifficulty
                      )}`}
                    >
                      {formatDifficulty(keyword)}
                    </span>
                  </td>

                  {/* Funnel */}
                  <td className="px-4 py-3">
                    <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">
                      {keyword.funnelStage}
                    </span>
                  </td>

                  {/* Intent */}
                  <td className="px-4 py-3">
                    <span className="text-xs text-gray-600">
                      {keyword.searchIntent}
                    </span>
                  </td>

                  {/* SERP Features */}
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      {keyword.hasFeaturedSnippet && (
                        <span
                          className="px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-xs"
                          title="Featured Snippet"
                        >
                          FS
                        </span>
                      )}
                      {keyword.hasPAA && (
                        <span
                          className="px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded text-xs"
                          title="People Also Ask"
                        >
                          PAA
                        </span>
                      )}
                      {keyword.hasVideoCarousel && (
                        <span
                          className="px-1.5 py-0.5 bg-red-100 text-red-700 rounded text-xs"
                          title="Video Carousel"
                        >
                          Vid
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {filteredKeywords.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            No keywords match your filters
          </div>
        )}
      </div>
    </div>
  );
}