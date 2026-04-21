export function getErrorMessage(error: unknown, fallback: string): string {
  if (typeof error === 'object' && error !== null) {
    const maybeError = error as {
      response?: { status?: number; data?: { detail?: unknown } };
      message?: unknown;
    };

    if (maybeError.response?.status === 413) {
      return 'Файл слишком большой. Текущий лимит загрузки аудио: 512 MB.';
    }

    if (typeof maybeError.response?.data?.detail === 'string') {
      return maybeError.response.data.detail;
    }

    if (typeof maybeError.message === 'string' && maybeError.message.trim()) {
      return maybeError.message;
    }
  }

  return fallback;
}
