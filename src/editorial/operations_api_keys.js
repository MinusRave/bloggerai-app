import { HttpError } from 'wasp/server';
import { validateAPIKey as validatePremiumKey } from './services/keywordResearchPremium.js';

// Simple encryption (in production use proper encryption like crypto)
function encryptAPIKey(apiKey) {
  // TODO: Use proper encryption in production
  // For MVP, just encode (NOT SECURE, placeholder only)
  return Buffer.from(apiKey).toString('base64');
}

function decryptAPIKey(encrypted) {
  // TODO: Use proper decryption in production
  return Buffer.from(encrypted, 'base64').toString('utf-8');
}

// ============================================
// USER API KEY OPERATIONS
// ============================================

/**
 * Save or update user's API key for premium tools
 */
export const saveUserAPIKey = async (args, context) => {
  if (!context.user) {
    throw new HttpError(401, 'Not authenticated');
  }

  const { provider, apiKey } = args;

  if (!['datafoerseo', 'ahrefs', 'semrush'].includes(provider)) {
    throw new HttpError(400, 'Invalid provider. Must be: datafoerseo, ahrefs, or semrush');
  }

  // Validate API key before saving
  const isValid = await validatePremiumKey(provider, apiKey);

  if (!isValid) {
    throw new HttpError(400, `Invalid ${provider} API key. Please check and try again.`);
  }

  // Encrypt API key
  const encryptedKey = encryptAPIKey(apiKey);

  // Upsert (create or update)
  const existingKey = await context.entities.UserAPIKey.findUnique({
    where: {
      userId_provider: {
        userId: context.user.id,
        provider,
      },
    },
  });

  let savedKey;

  if (existingKey) {
    savedKey = await context.entities.UserAPIKey.update({
      where: { id: existingKey.id },
      data: {
        apiKey: encryptedKey,
        isActive: true,
        updatedAt: new Date(),
      },
    });
  } else {
    savedKey = await context.entities.UserAPIKey.create({
      data: {
        userId: context.user.id,
        provider,
        apiKey: encryptedKey,
        isActive: true,
      },
    });
  }

  return {
    id: savedKey.id,
    provider: savedKey.provider,
    isActive: savedKey.isActive,
    createdAt: savedKey.createdAt,
    // Don't return the actual API key
  };
};

/**
 * Get user's saved API keys (without revealing actual keys)
 */
export const getUserAPIKeys = async (args, context) => {
  if (!context.user) {
    throw new HttpError(401, 'Not authenticated');
  }

  const keys = await context.entities.UserAPIKey.findMany({
    where: {
      userId: context.user.id,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  return keys.map((key) => ({
    id: key.id,
    provider: key.provider,
    isActive: key.isActive,
    lastUsedAt: key.lastUsedAt,
    usageCount: key.usageCount,
    createdAt: key.createdAt,
    // Mask the API key
    apiKeyPreview: `****${key.apiKey.slice(-4)}`,
  }));
};

/**
 * Delete user's API key
 */
export const deleteUserAPIKey = async (args, context) => {
  if (!context.user) {
    throw new HttpError(401, 'Not authenticated');
  }

  const { keyId } = args;

  const key = await context.entities.UserAPIKey.findUnique({
    where: { id: keyId },
  });

  if (!key) {
    throw new HttpError(404, 'API key not found');
  }

  if (key.userId !== context.user.id) {
    throw new HttpError(403, 'Not authorized');
  }

  await context.entities.UserAPIKey.delete({
    where: { id: keyId },
  });

  return { success: true };
};

/**
 * Validate an API key without saving it
 */
export const validateAPIKey = async (args, context) => {
  if (!context.user) {
    throw new HttpError(401, 'Not authenticated');
  }

  const { provider, apiKey } = args;

  try {
    const isValid = await validatePremiumKey(provider, apiKey);

    return {
      isValid,
      provider,
      message: isValid ? 'API key is valid' : 'API key is invalid',
    };
  } catch (error) {
    return {
      isValid: false,
      provider,
      message: `Validation failed: ${error.message}`,
    };
  }
};
