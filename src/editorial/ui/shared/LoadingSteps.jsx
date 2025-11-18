import React from 'react';

export default function LoadingSteps({ currentStep, steps }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full mx-4">
        <div className="space-y-4">
          {steps.map((step, index) => {
            const isActive = index === currentStep;
            const isCompleted = index < currentStep;
            
            return (
              <div
                key={index}
                className={`flex items-center space-x-3 p-3 rounded-lg transition-all ${
                  isActive ? 'bg-blue-50 border-2 border-blue-500' : ''
                } ${isCompleted ? 'bg-green-50' : ''}`}
              >
                <div
                  className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                    isCompleted
                      ? 'bg-green-500 text-white'
                      : isActive
                      ? 'bg-blue-500 text-white animate-pulse'
                      : 'bg-gray-200 text-gray-500'
                  }`}
                >
                  {isCompleted ? (
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  ) : (
                    <span className="text-sm font-semibold">{index + 1}</span>
                  )}
                </div>
                <div className="flex-1">
                  <p
                    className={`text-sm font-medium ${
                      isActive ? 'text-blue-900' : isCompleted ? 'text-green-900' : 'text-gray-700'
                    }`}
                  >
                    {step.title}
                  </p>
                  {isActive && step.description && (
                    <p className="text-xs text-gray-600 mt-1">{step.description}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        
        {currentStep < steps.length && (
          <div className="mt-6">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-500 h-2 rounded-full transition-all duration-500"
                style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
              />
            </div>
            <p className="text-xs text-gray-600 text-center mt-2">
              Step {currentStep + 1} of {steps.length}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}