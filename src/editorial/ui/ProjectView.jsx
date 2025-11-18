import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Link } from 'wasp/client/router';
import { useQuery } from 'wasp/client/operations';
import { getProjectById } from 'wasp/client/operations';
import StatusBadge from './shared/StatusBadge';
import OverviewTab from './overview/OverviewTab';
import StrategyTab from './strategy/StrategyTab';
import CalendarTab from './calendar/CalendarTab';
import SettingsTab from './settings/SettingsTab';
import KeywordResearchTab from './keywords/KeywordResearchTab';


const TABS = [
  { id: 'overview', label: 'Overview', icon: '📊' },
  { id: 'keywords', label: 'Keywords', icon: '🔍' },     
  { id: 'strategy', label: 'Strategy', icon: '🎯' },
  { id: 'calendar', label: 'Calendar', icon: '📅' },
  { id: 'settings', label: 'Settings', icon: '⚙️' },
];

export default function ProjectView() {
  const { id } = useParams();
  const [activeTab, setActiveTab] = useState('overview');
  
  const { data, isLoading, error } = useQuery(getProjectById, { id: parseInt(id) });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading project...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
          <p className="text-red-800">Failed to load project: {error.message}</p>
          <Link to="/projects" className="text-blue-600 hover:text-blue-700 mt-4 inline-block">
            ← Back to projects
          </Link>
        </div>
      </div>
    );
  }

  const { project, activeSession, activeStrategy } = data;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <Link
                  to="/projects"
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
                  </svg>
                </Link>
                <h1 className="text-2xl font-bold text-gray-900">{project.name}</h1>
                <StatusBadge status={project.status} />
              </div>
              <p className="text-gray-600">{project.description}</p>
            </div>
          </div>

          {/* Tabs */}
          <div className="mt-6 flex space-x-1 border-b border-gray-200">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-3 text-sm font-medium transition-colors border-b-2 ${
                  activeTab === tab.id
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'overview' && (
          <OverviewTab project={project} activeSession={activeSession} activeStrategy={activeStrategy} />
        )}
{activeTab === 'keywords' && (
  <KeywordResearchTab project={project} />
)}
        {activeTab === 'strategy' && activeSession && (
          <StrategyTab project={project} session={activeSession} />
        )}
        
        {activeTab === 'strategy' && !activeSession && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
            <p className="text-yellow-800">No active strategy session found.</p>
          </div>
        )}
        
        {activeTab === 'calendar' && activeStrategy && (
          <CalendarTab strategy={activeStrategy} project={project} />
        )}
        
        {activeTab === 'calendar' && !activeStrategy && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
            <p className="text-yellow-800">No active strategy found. Generate a strategy first.</p>
          </div>
        )}
        
        {activeTab === 'settings' && (
          <SettingsTab project={project} />
        )}
      </div>
    </div>
  );
}