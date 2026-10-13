const { GEMINI_UNAVAILABLE, analyseSkinGuidanceInLanguage, geminiUnavailable } = require('./aiGuidance');
const { IMAGE_REJECTED } = require('./imageCheck');

// With a consented backup available, Gemini gets one short attempt so the switch happens quickly.
const GEMINI_BEFORE_BACKUP_POLICY = { maxAttempts: 1, attemptTimeoutMs: 5000 };

function withPolicy(provider, policy) {
  return { analyseSkinIssue: (input, options) => provider.analyseSkinIssue(input, { ...policy, ...options }) };
}

function mark(error, stage, backup) {
  if (error && typeof error === 'object') {
    if (stage) {
      error.stage = stage;
    }
    error.backup = backup;
  }
  return error;
}

/**
 * Resolves to { imageCheck, guidance, provider, backup }. Gemini answers first. The backup provider
 * runs only when the user allowed it, it is configured, and Gemini produced no usable guidance.
 * A Gemini image rejection is final. A backup rejection is not trusted as a verdict on the photo,
 * so it ends as unavailable (offline guidance) rather than asking the user to retake it.
 * Errors carry `stage` and `backup` for the route's outcome log.
 */
async function analyseSkinGuidance({ gemini, backup }, input, { allowBackupProvider = false } = {}) {
  let backupState = 'not_allowed';
  if (allowBackupProvider === true) {
    backupState = backup && backup.isConfigured() ? 'ready' : 'not_configured';
  }
  const primary = backupState === 'ready' ? withPolicy(gemini, GEMINI_BEFORE_BACKUP_POLICY) : gemini;
  const unusedBackup = backupState === 'ready' ? 'not_needed' : backupState;

  let primaryFailure;
  try {
    const checked = await analyseSkinGuidanceInLanguage(primary, input);
    if (checked) {
      return { ...checked, provider: 'gemini', backup: unusedBackup };
    }
    primaryFailure = mark(
      geminiUnavailable(new Error('Gemini returned unusable or wrong-language skin guidance.')),
      'unusable_guidance',
    );
  } catch (error) {
    if (!error || error.code !== GEMINI_UNAVAILABLE) {
      throw mark(error, null, unusedBackup);
    }
    primaryFailure = mark(error, 'gemini');
  }

  if (backupState !== 'ready') {
    throw mark(primaryFailure, null, backupState);
  }

  let backupStage;
  try {
    const checked = await analyseSkinGuidanceInLanguage(backup, input);
    if (checked) {
      return { ...checked, provider: 'groq', backup: 'used' };
    }
    backupStage = 'backup_unusable_guidance';
  } catch (error) {
    if (error && error.code === IMAGE_REJECTED) {
      backupStage = 'backup_rejected_photo';
    } else if (error && error.code === GEMINI_UNAVAILABLE) {
      backupStage = 'backup';
    } else {
      throw mark(error, 'backup', 'failed');
    }
  }
  throw mark(primaryFailure, backupStage, 'failed');
}

module.exports = {
  GEMINI_BEFORE_BACKUP_POLICY,
  analyseSkinGuidance,
};
