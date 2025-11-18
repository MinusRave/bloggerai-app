import React, { useState } from 'react';
import { useQuery } from 'wasp/client/operations';
import { getCalendarView, extendCalendar } from 'wasp/client/operations';
import CalendarGrid from './CalendarGrid';
import CalendarFilters from './CalendarFilters';

export default function CalendarTab({ strategy, project }) {
  const [filters, setFilters] = useState({
    pillarId: null,
    status: null,
    dateRange: null,
  });
  const [isExtending, setIsExtending] = useState(false);

  const { data, isLoading, error, refetch } = useQuery(getCalendarView, {
    strategyId: strategy.id,
    filters,
  });

  const handleExtendCalendar = async () => {
    if (!confirm('Extend calendar by 30 more days? This will generate additional posts.')) {
      return;
    }

    setIsExtending(true);
    try {
      const result = await extendCalendar({
        strategyId: strategy.id,
        additionalDays: 30,
      });

      alert(`Successfully added ${result.newPostsCount} new posts!`);
      refetch();
    } catch (error) {
      console.error('Failed to extend calendar:', error);
      alert('Failed to extend calendar: ' + error.message);
    } finally {
      setIsExtending(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading calendar...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <p className="text-red-800">Failed to load calendar: {error.message}</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      {/* Filters Sidebar */}
      <div className="lg:col-span-1">
        <CalendarFilters
          pillars={data.pillars}
          stats={data.stats}
          filters={filters}
          onFilterChange={setFilters}
        />
      </div>

      {/* Calendar Grid */}
      <div className="lg:col-span-3">
        <CalendarGrid
          posts={data.posts}
          pillars={data.pillars}
          strategy={data.strategy}
          onExtend={handleExtendCalendar}
          isExtending={isExtending}
          onUpdate={refetch}
        />
      </div>
    </div>
  );
}