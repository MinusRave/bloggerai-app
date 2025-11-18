import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { archiveProject } from 'wasp/client/operations';
import StatusBadge from './../shared/StatusBadge';
import APIKeySettings from './APIKeySettings';

export default function SettingsTab({ project }) {
  const navigate = useNavigate();
  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);
  const [activeSection, setActiveSection] = useState('project'); // 'project' | 'apikeys'

  const handleArchive = async () => {
    setIsArchiving(true);
    try {
      await archiveProject({ projectId: project.id });
      navigate('/projects');
    } catch (error) {
      console.error('Failed to archive project:', error);
      alert('Failed to archive project: ' + error.message);
    } finally {
      setIsArchiving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Archive Modal */}
      {showArchiveModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Archive Project?
            </h3>
            <div className="space-y-3 mb-6">
              <p className="text-sm text-gray-700">
                This will archive <strong>{project.name}</strong> and remove it from your active projects list.
              </p>
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  ℹ️ Archived projects can be restored later (feature coming soon).
                </p>
              </div>
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800">
                  ⚠️ All strategies, calendar posts, and data will be preserved but hidden.
                </p>
              </div>
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowArchiveModal(false)}
                disabled={isArchiving}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg font-medium transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleArchive}
                disabled={isArchiving}
                className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
              >
                {isArchiving ? 'Archiving...' : 'Archive Project'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Section Navigation */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveSection('project')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeSection === 'project'
                ? 'bg-blue-100 text-blue-700'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            ⚙️ Project Settings
          </button>
          <button
            onClick={() => setActiveSection('apikeys')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeSection === 'apikeys'
                ? 'bg-blue-100 text-blue-700'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            🔑 API Keys
          </button>
        </div>
      </div>

      {/* Project Settings Section */}
      {activeSection === 'project' && (
        <>
          {/* Project Info Summary */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Project Information</h3>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between py-3 border-b border-gray-100">
                <div>
                  <p className="text-sm font-medium text-gray-700">Project Name</p>
                  <p className="text-gray-900 mt-1">{project.name}</p>
                </div>
              </div>

              <div className="flex items-center justify-between py-3 border-b border-gray-100">
                <div>
                  <p className="text-sm font-medium text-gray-700">Status</p>
                  <div className="mt-1">
                    <StatusBadge status={project.status} />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between py-3 border-b border-gray-100">
                <div>
                  <p className="text-sm font-medium text-gray-700">Created</p>
                  <p className="text-gray-900 mt-1">
                    {new Date(project.createdAt).toLocaleDateString('en-US', {
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between py-3 border-b border-gray-100">
                <div>
                  <p className="text-sm font-medium text-gray-700">Last Updated</p>
                  <p className="text-gray-900 mt-1">
                    {new Date(project.updatedAt).toLocaleDateString('en-US', {
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm font-medium text-gray-700">Language</p>
                  <p className="text-gray-900 mt-1 capitalize">{project.language}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Data Management */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Data Management</h3>
            
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-2">Export Project Data</h4>
                <p className="text-sm text-gray-600 mb-3">
                  Download all project data including strategies, calendar posts, and knowledge base.
                </p>
                <button
                  disabled
                  className="px-4 py-2 bg-gray-300 text-gray-600 rounded-lg font-medium cursor-not-allowed"
                >
                  Export Data (Coming Soon)
                </button>
              </div>
            </div>
          </div>

          {/* Danger Zone */}
          <div className="bg-white rounded-lg shadow-sm border-2 border-red-200 p-6">
            <h3 className="text-lg font-semibold text-red-900 mb-4">Danger Zone</h3>
            
            <div className="space-y-6">
              {/* Archive Project */}
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-2">Archive Project</h4>
                <p className="text-sm text-gray-600 mb-3">
                  Hide this project from your dashboard. You can restore it later (feature coming soon).
                </p>
                <button
                  onClick={() => setShowArchiveModal(true)}
                  className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-medium transition-colors"
                >
                  Archive Project
                </button>
              </div>

              {/* Delete Project - Disabled for MVP */}
              <div className="pt-6 border-t border-gray-200">
                <h4 className="text-sm font-medium text-gray-900 mb-2">Delete Project</h4>
                <p className="text-sm text-gray-600 mb-3">
                  Permanently delete this project and all associated data. This action cannot be undone.
                </p>
                <button
                  disabled
                  className="px-4 py-2 bg-gray-300 text-gray-600 rounded-lg font-medium cursor-not-allowed"
                >
                  Delete Project (Coming Soon)
                </button>
                <p className="text-xs text-gray-500 mt-2">
                  For now, use Archive to remove projects from your dashboard.
                </p>
              </div>
            </div>
          </div>

          {/* System Information */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">System Information</h3>
            
            <div className="space-y-3 text-sm">
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-600">Project ID</span>
                <span className="text-gray-900 font-mono">{project.id}</span>
              </div>

              {project.blogUrl && (
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-600">Blog URL</span>
                  <a
                    href={project.blogUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-700 truncate max-w-xs"
                  >
                    {project.blogUrl}
                  </a>
                </div>
              )}

              {project.mainSiteUrl && (
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-600">Main Site URL</span>
                  <a
                    href={project.mainSiteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-700 truncate max-w-xs"
                  >
                    {project.mainSiteUrl}
                  </a>
                </div>
              )}

              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-600">Keyword Cannibalization Check</span>
                <span className="text-gray-900">
                  {project.avoidCannibalization ? 'Enabled' : 'Disabled'}
                </span>
              </div>

              <div className="flex justify-between py-2">
                <span className="text-gray-600">First Publish Date</span>
                <span className="text-gray-900">
                  {new Date(project.firstPublishDate).toLocaleDateString('en-US', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </span>
              </div>
            </div>
          </div>
        </>
      )}

      {/* API Keys Section */}
      {activeSection === 'apikeys' && <APIKeySettings />}
    </div>
  );
}