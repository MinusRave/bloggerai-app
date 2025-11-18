import React from 'react';
import PillarBadge from '../shared/PillarBadge';
import StatusBadge from '../shared/StatusBadge';

export default function CalendarFilters({ pillars, stats, filters, onFilterChange }) {
  const handlePillarFilter = (pillarId) => {
    onFilterChange({
      ...filters,
      pillarId: filters.pillarId === pillarId ? null : pillarId,
    });
  };

  const handleStatusFilter = (status) => {
    onFilterChange({
      ...filters,
      status: filters.status === status ? null : status,
    });
  };

  const clearFilters = () => {
    onFilterChange({
      pillarId: null,
      status: null,
      dateRange: null,
    });
  };

  const hasActiveFilters = filters.pillarId || filters.status || filters.dateRange;

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sticky top-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Filters</h3>
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="text-sm text-blue-600 hover:text-blue-700"
          >
            Clear
          </button>
        )}
      </div>

      {/* Stats Summary */}
      <div className="mb-6 p-3 bg-gray-50 rounded-lg">
        <div className="text-2xl font-bold text-gray-900">{stats.totalPosts}</div>
        <div className="text-sm text-gray-600">Total Posts</div>
      </div>

      {/* Filter by Pillar */}
      <div className="mb-6">
        <h4 className="text-sm font-medium text-gray-700 mb-3">By Theme Pillar</h4>
        <div className="space-y-2">
          {pillars.map((pillar) => {
            const pillarStats = stats.byPillar.find((s) => s.pillarId === pillar.id);
            const isActive = filters.pillarId === pillar.id;

            return (
              <button
                key={pillar.id}
                onClick={() => handlePillarFilter(pillar.id)}
                className={`w-full flex items-center justify-between p-2 rounded-lg transition-colors ${
                  isActive ? 'bg-blue-50 border-2 border-blue-500' : 'hover:bg-gray-50'
                }`}
              >
                <PillarBadge pillar={pillar} size="sm" />
                <span className="text-sm text-gray-600">{pillarStats?.count || 0}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Filter by Status */}
      <div>
        <h4 className="text-sm font-medium text-gray-700 mb-3">By Status</h4>
        <div className="space-y-2">
          {['PROPOSED', 'APPROVED', 'MODIFIED', 'REJECTED'].map((status) => {
            const count = stats.byStatus[status] || 0;
            const isActive = filters.status === status;

            return (
              <button
                key={status}
                onClick={() => handleStatusFilter(status)}
                disabled={count === 0}
                className={`w-full flex items-center justify-between p-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                  isActive ? 'bg-blue-50 border-2 border-blue-500' : 'hover:bg-gray-50'
                }`}
              >
                <StatusBadge status={status} size="sm" />
                <span className="text-sm text-gray-600">{count}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}