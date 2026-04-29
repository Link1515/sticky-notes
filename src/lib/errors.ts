export type AppErrorCode =
  | 'NOTES_LOAD_FAILED'
  | 'NOTES_SAVE_FAILED'
  | 'SETTINGS_LOAD_FAILED'
  | 'SETTINGS_SAVE_FAILED'
  | 'AUTOSTART_ENABLE_FAILED'
  | 'AUTOSTART_DISABLE_FAILED'
  | 'UNKNOWN_ERROR';

export const getErrorDetail = (error: unknown) => {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'string') {
    return error;
  }

  try {
    return JSON.stringify(error);
  } catch {
    return undefined;
  }
};

export const humanizeError = (code: AppErrorCode, detail?: string) => {
  const suffix = detail ? ` (${detail})` : '';

  switch (code) {
    case 'NOTES_LOAD_FAILED':
      return `Unable to load sticky notes${suffix}`;
    case 'NOTES_SAVE_FAILED':
      return `Unable to save sticky notes${suffix}`;
    case 'SETTINGS_LOAD_FAILED':
      return `Unable to load settings${suffix}`;
    case 'SETTINGS_SAVE_FAILED':
      return `Unable to save settings${suffix}`;
    case 'AUTOSTART_ENABLE_FAILED':
      return `Unable to enable launch at startup${suffix}`;
    case 'AUTOSTART_DISABLE_FAILED':
      return `Unable to disable launch at startup${suffix}`;
    default:
      return `Unexpected error${suffix}`;
  }
};
