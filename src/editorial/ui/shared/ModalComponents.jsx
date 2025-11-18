import React from 'react';

// ============================================
// CONFIRMATION MODAL
// ============================================

export function ConfirmModal({ isOpen, onClose, onConfirm, title, message, confirmText = 'Confirm', cancelText = 'Cancel', variant = 'primary' }) {
  if (!isOpen) return null;

  const variantStyles = {
    primary: 'bg-blue-600 hover:bg-blue-700',
    success: 'bg-green-600 hover:bg-green-700',
    danger: 'bg-red-600 hover:bg-red-700',
    warning: 'bg-orange-600 hover:bg-orange-700',
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">{title}</h3>
        <p className="text-gray-700 mb-6">{message}</p>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg font-medium transition-colors"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className={`px-6 py-2 text-white rounded-lg font-medium transition-colors ${variantStyles[variant]}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================
// PROGRESS MODAL (for strategy generation)
// ============================================

export function ProgressModal({ isOpen, title, steps, currentStep, error = null }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full p-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-6">{title}</h3>

        {error ? (
          // Error state
          <div className="space-y-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <svg
                  className="w-6 h-6 text-red-600 flex-shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <div className="flex-1">
                  <p className="text-sm font-medium text-red-900 mb-1">
                    Generation Failed
                  </p>
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              </div>
            </div>
            <button
              onClick={() => window.location.reload()}
              className="w-full px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors"
            >
              Close & Reload
            </button>
          </div>
        ) : (
          // Progress state
          <div className="space-y-4">
            {steps.map((step, index) => {
              const isCompleted = index < currentStep;
              const isCurrent = index === currentStep;
              const isPending = index > currentStep;

              return (
                <div key={index} className="flex items-start gap-4">
                  {/* Icon */}
                  <div className="flex-shrink-0 mt-1">
                    {isCompleted && (
                      <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
                        <svg
                          className="w-4 h-4 text-white"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      </div>
                    )}
                    {isCurrent && (
                      <div className="w-6 h-6 rounded-full border-2 border-blue-600 flex items-center justify-center">
                        <div className="w-2 h-2 rounded-full bg-blue-600 animate-pulse"></div>
                      </div>
                    )}
                    {isPending && (
                      <div className="w-6 h-6 rounded-full border-2 border-gray-300"></div>
                    )}
                  </div>

                  {/* Text */}
                  <div className="flex-1 pt-0.5">
                    <p
                      className={`text-sm font-medium ${
                        isCompleted
                          ? 'text-green-700'
                          : isCurrent
                          ? 'text-blue-900'
                          : 'text-gray-500'
                      }`}
                    >
                      {step.label}
                    </p>
                    {step.description && (
                      <p className="text-xs text-gray-600 mt-0.5">
                        {step.description}
                      </p>
                    )}
                    {isCurrent && step.duration && (
                      <p className="text-xs text-blue-600 mt-1">
                        ⏱️ ~{step.duration}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================
// SUCCESS MODAL
// ============================================

export function SuccessModal({ isOpen, onClose, title, message, actionText = 'Got it' }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <div className="text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-green-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">{title}</h3>
          <p className="text-gray-600 mb-6">{message}</p>
          <button
            onClick={onClose}
            className="w-full px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
          >
            {actionText}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================
// ERROR MODAL
// ============================================

export function ErrorModal({ isOpen, onClose, title, message, actionText = 'Close' }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-red-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">{title}</h3>
          <p className="text-gray-600 mb-6">{message}</p>
          <button
            onClick={onClose}
            className="w-full px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
          >
            {actionText}
          </button>
        </div>
      </div>
    </div>
  );
}