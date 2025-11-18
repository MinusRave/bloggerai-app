import React, { useState } from 'react';
import PostCard from './PostCard';
import PostDetailModal from './PostDetailModal';

export default function CalendarGrid({ posts, pillars, strategy, onExtend, isExtending, onUpdate }) {
  const [selectedPost, setSelectedPost] = useState(null);
  const [viewMode, setViewMode] = useState('grid');

  // Group posts by month
  const postsByMonth = posts.reduce((acc, post) => {
    const date = new Date(post.publishDate);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    
    if (!acc[monthKey]) {
      acc[monthKey] = [];
    }
    acc[monthKey].push(post);
    return acc;
  }, {});

  const sortedMonths = Object.keys(postsByMonth).sort();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Editorial Calendar</h3>
          <p className="text-sm text-gray-600 mt-1">
            {posts.length} posts scheduled
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={onExtend}
            disabled={isExtending}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {isExtending ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Extending...
              </>
            ) : (
              <>
                <span>📅</span>
                Extend +30 Days
              </>
            )}
          </button>

          <div className="flex gap-1 border border-gray-300 rounded-lg p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                viewMode === 'grid'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              Grid
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                viewMode === 'list'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              List
            </button>
          </div>
        </div>
      </div>

      {/* Empty State */}
      {posts.length === 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <p className="text-gray-600">No posts found with current filters.</p>
        </div>
      )}

      {/* Calendar Content */}
      {sortedMonths.map((monthKey) => {
        const monthPosts = postsByMonth[monthKey];
        const [year, month] = monthKey.split('-');
        const monthName = new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString('en-US', {
          month: 'long',
          year: 'numeric',
        });

        return (
          <div key={monthKey} className="space-y-4">
            <h4 className="text-lg font-semibold text-gray-900">{monthName}</h4>
            
            {viewMode === 'grid' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {monthPosts.map((post) => (
                  <PostCard
                    key={post.id}
                    post={post}
                    onClick={() => setSelectedPost(post)}
                    onUpdate={onUpdate}
                  />
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {monthPosts.map((post) => (
                  <PostCard
                    key={post.id}
                    post={post}
                    onClick={() => setSelectedPost(post)}
                    onUpdate={onUpdate}
                    compact
                  />
                ))}
              </div>
            )}
          </div>
        );
      })}

      {/* Detail Modal */}
      {selectedPost && (
        <PostDetailModal
          post={selectedPost}
          pillars={pillars}
          onClose={() => setSelectedPost(null)}
          onUpdate={() => {
            setSelectedPost(null);
            onUpdate();
          }}
        />
      )}
    </div>
  );
}