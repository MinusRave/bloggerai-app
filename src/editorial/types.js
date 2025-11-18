// ============================================
// INPUT TYPES (aggiornati con nuovi campi)
// ============================================

export const CreateEditorialProjectInput = {
  name: String,
  description: String,
  language: String,
  target: String,
  objectives: String,
  blogUrl: String, // optional
  mainSiteUrl: String, // optional - NEW
  competitorUrls: Array,
  keywordSeed: Array, // optional
  firstPublishDate: Date, // NEW
  avoidCannibalization: Boolean, // NEW
  knowledgeBase: String,
};

export const UpdateProjectMetadataInput = {
  projectId: Number,
  name: String, // optional
  description: String, // optional
  language: String, // optional
  target: String, // optional
  objectives: String, // optional
  blogUrl: String, // optional
  mainSiteUrl: String, // optional
  competitorUrls: Array, // optional
  keywordSeed: Array, // optional
  firstPublishDate: Date, // optional
  avoidCannibalization: Boolean, // optional
};

export const ArchiveProjectInput = {
  projectId: Number,
};

// ============================================
// ERROR HANDLING
// ============================================

export class EditorialError extends Error {
  constructor(message, code, statusCode = 400, details = null) {
    super(message);
    this.name = 'EditorialError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}

export const ErrorCodes = {
  PROJECT_NOT_FOUND: 'PROJECT_NOT_FOUND',
  SESSION_NOT_FOUND: 'SESSION_NOT_FOUND',
  STRATEGY_NOT_FOUND: 'STRATEGY_NOT_FOUND',
  POST_NOT_FOUND: 'POST_NOT_FOUND',
  UNAUTHORIZED: 'UNAUTHORIZED',
  INVALID_INPUT: 'INVALID_INPUT',
  AI_SERVICE_ERROR: 'AI_SERVICE_ERROR',
  RESEARCH_FAILED: 'RESEARCH_FAILED',
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  STRATEGY_ALREADY_ACTIVE: 'STRATEGY_ALREADY_ACTIVE',
  NO_ACTIVE_STRATEGY: 'NO_ACTIVE_STRATEGY',
  SESSION_COMPLETED: 'SESSION_COMPLETED',
  DUPLICATE_KEYWORD: 'DUPLICATE_KEYWORD',
  PROJECT_ARCHIVED: 'PROJECT_ARCHIVED',
};