import React, { useState } from 'react';
import { useQuery, useAction } from 'wasp/client/operations';
import {
  getUserAPIKeys,
  saveUserAPIKey,
  deleteUserAPIKey,
  validateAPIKey,
} from 'wasp/client/operations';

export default function APIKeySettings() {
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState('datafoerseo');
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const { data: apiKeys, isLoading, error, refetch } = useQuery(getUserAPIKeys);
  const saveKeyFn = useAction(saveUserAPIKey);
  const deleteKeyFn = useAction(deleteUserAPIKey);
  const validateKeyFn = useAction(validateAPIKey);

  const providers = [
    {
      id: 'datafoerseo',
      name: 'DataForSEO',
      description: 'Comprehensive SEO data with exact search volumes and CPC',
      website: 'https://dataforseo.com',
      pricingInfo: 'Pay-as-you-go, starts at $0.01 per keyword',
    },
    {
      id: 'ahrefs',
      name: 'Ahrefs',
      description: 'Industry-leading backlink and keyword data',
      website: 'https://ahrefs.com/api',
      pricingInfo: 'Requires Ahrefs subscription + API access',
    },
    {
      id: 'semrush',
      name: 'SEMrush',
      description: 'Competitive analysis and keyword research',
      website: 'https://www.semrush.com/api-documentation/',
      pricingInfo: 'Requires SEMrush subscription + API units',
    },
  ];

  const handleValidateAndSave = async () => {
    if (!apiKeyInput.trim()) {
      alert('Please enter an API key');
      return;
    }

    // Validate first
    setIsValidating(true);
    try {
      const result = await validateKeyFn({
        provider: selectedProvider,
        apiKey: apiKeyInput.trim(),
      });

      if (!result.isValid) {
        alert(`Invalid API key: ${result.message}`);
        setIsValidating(false);
        return;
      }

      // If valid, save
      setIsSaving(true);
      await saveKeyFn({
        provider: selectedProvider,
        apiKey: apiKeyInput.trim(),
      });

      alert('API key saved successfully!');
      setShowAddModal(false);
      setApiKeyInput('');
      refetch();
    } catch (error) {
      console.error('Failed to save API key:', error);
      alert('Failed to save API key: ' + error.message);
    } finally {
      setIsValidating(false);
      setIsSaving(false);
    }
  };

  const handleDelete = async (keyId, provider) => {
    if (!confirm(`Delete ${provider} API key? This cannot be undone.`)) {
      return;
    }

    try {
      await deleteKeyFn({ keyId });
      alert('API key deleted successfully');
      refetch();
    } catch (error) {
      console.error('Failed to delete API key:', error);
      alert('Failed to delete API key: ' + error.message);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 text-sm">Loading API keys...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Info banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <div className="flex items-start gap-3">
          <div className="text-2xl">ℹ️</div>
          <div className="flex-1">
            <h3 className="font-semibold text-blue-900 mb-2">
              Premium Keyword Research Tools
            </h3>
            <p className="text-sm text-blue-800 mb-3">
              Connect your premium SEO tool API keys to get exact search volumes,
              keyword difficulty scores, CPC data, and more accurate metrics. Free tools
              will always be available as a fallback.
            </p>
            <div className="text-xs text-blue-700">
              <strong>Privacy:</strong> Your API keys are encrypted and stored securely.
              They're only used for keyword research requests you initiate.
            </div>
          </div>
        </div>
      </div>

      {/* Current API keys */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Connected API Keys</h3>
            <p className="text-sm text-gray-600 mt-1">
              {apiKeys?.length || 0} provider{apiKeys?.length !== 1 ? 's' : ''}{' '}
              connected
            </p>
          </div>

          <button
            onClick={() => setShowAddModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
          >
            <span>+</span>
            Add API Key
          </button>
        </div>

        {apiKeys && apiKeys.length > 0 ? (
          <div className="space-y-3">
            {apiKeys.map((key) => {
              const provider = providers.find((p) => p.id === key.provider);

              return (
                <div
                  key={key.id}
                  className="flex items-center justify-between p-4 border border-gray-200 rounded-lg"
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`w-3 h-3 rounded-full ${
                        key.isActive ? 'bg-green-500' : 'bg-gray-300'
                      }`}
                    />
                    <div>
                      <div className="font-medium text-gray-900">
                        {provider?.name || key.provider}
                      </div>
                      <div className="text-sm text-gray-600">
                        Key: {key.apiKeyPreview}
                      </div>
                      {key.lastUsedAt && (
                        <div className="text-xs text-gray-500 mt-1">
                          Last used:{' '}
                          {new Date(key.lastUsedAt).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}{' '}
                          ({key.usageCount} times)
                        </div>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => handleDelete(key.id, provider?.name || key.provider)}
                    className="text-red-600 hover:text-red-700 text-sm font-medium transition-colors"
                  >
                    Delete
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <p className="mb-4">No API keys connected</p>
            <p className="text-sm">
              Add a premium tool API key to get more accurate keyword data
            </p>
          </div>
        )}
      </div>

      {/* Provider comparison */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Available Providers
        </h3>

        <div className="grid gap-4">
          {providers.map((provider) => (
            <div
              key={provider.id}
              className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors"
            >
              <div className="flex items-start justify-between mb-2">
                <h4 className="font-semibold text-gray-900">{provider.name}</h4>
                <a
                  href={provider.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-600 hover:text-blue-700"
                >
                  Website →
                </a>
              </div>
              <p className="text-sm text-gray-600 mb-2">{provider.description}</p>
              <div className="text-xs text-gray-500">
                <strong>Pricing:</strong> {provider.pricingInfo}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Add API key modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full p-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">
              Add API Key
            </h3>

            {/* Provider selection */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Provider
              </label>
              <div className="grid grid-cols-3 gap-3">
                {providers.map((provider) => (
                  <button
                    key={provider.id}
                    onClick={() => setSelectedProvider(provider.id)}
                    className={`p-4 border-2 rounded-lg text-center transition-colors ${
                      selectedProvider === provider.id
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="font-semibold text-gray-900 mb-1">
                      {provider.name}
                    </div>
                    <div className="text-xs text-gray-600">
                      {provider.id === 'datafoerseo' && 'Most flexible'}
                      {provider.id === 'ahrefs' && 'Best backlinks'}
                      {provider.id === 'semrush' && 'Best competitive'}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* API key input */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                API Key
              </label>
              <input
                type="password"
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
                placeholder="Enter your API key"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-2">
                Your API key will be encrypted and stored securely. We'll validate it
                before saving.
              </p>
            </div>

            {/* Instructions */}
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <h4 className="text-sm font-semibold text-gray-900 mb-2">
                How to get your {providers.find((p) => p.id === selectedProvider)?.name}{' '}
                API key:
              </h4>
              <ol className="text-sm text-gray-700 space-y-1 list-decimal list-inside">
                {selectedProvider === 'datafoerseo' && (
                  <>
                    <li>
                      Go to{' '}
                      <a
                        href="https://app.dataforseo.com/register"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        DataForSEO dashboard
                      </a>
                    </li>
                    <li>Navigate to Settings → API Access</li>
                    <li>Copy your API login (username) and password</li>
                    <li>
                      Format: <code className="bg-gray-200 px-1 rounded">login</code>
                    </li>
                  </>
                )}
                {selectedProvider === 'ahrefs' && (
                  <>
                    <li>
                      Go to{' '}
                      <a
                        href="https://ahrefs.com/api"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        Ahrefs API page
                      </a>
                    </li>
                    <li>Subscribe to API access (requires subscription)</li>
                    <li>Navigate to Account → API access</li>
                    <li>Generate and copy your API token</li>
                  </>
                )}
                {selectedProvider === 'semrush' && (
                  <>
                    <li>
                      Go to{' '}
                      <a
                        href="https://www.semrush.com/api-documentation/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        SEMrush API page
                      </a>
                    </li>
                    <li>Subscribe to API units (requires subscription)</li>
                    <li>Find your API key in your account settings</li>
                    <li>Copy the API key</li>
                  </>
                )}
              </ol>
            </div>

            {/* Actions */}
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setApiKeyInput('');
                }}
                disabled={isValidating || isSaving}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg font-medium transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleValidateAndSave}
                disabled={isValidating || isSaving || !apiKeyInput.trim()}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isValidating
                  ? 'Validating...'
                  : isSaving
                  ? 'Saving...'
                  : 'Validate & Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
