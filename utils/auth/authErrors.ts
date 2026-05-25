export const getApiErrorStatus = (error: any): number | undefined => {
  const status = error?.status ?? error?.statusCode ?? error?.response?.status;
  const numericStatus = Number(status);
  return Number.isFinite(numericStatus) ? numericStatus : undefined;
};

export const getApiErrorMessage = (error: any, fallback = 'Request failed'): string => {
  if (typeof error === 'string') return error;
  if (typeof error?.message === 'string' && error.message.trim()) return error.message;
  if (typeof error?.error === 'string' && error.error.trim()) return error.error;
  if (typeof error?.response?.data?.message === 'string' && error.response.data.message.trim()) {
    return error.response.data.message;
  }
  if (typeof error?.response?.data === 'string' && error.response.data.trim()) {
    return error.response.data;
  }

  return fallback;
};

export const normalizeApiError = (error: any, fallback = 'Request failed') => {
  const status = getApiErrorStatus(error);
  const data = error?.response?.data;

  if (data && typeof data === 'object') {
    return {
      ...data,
      status: data.status ?? status,
      message: getApiErrorMessage({ ...data, status }, fallback),
    };
  }

  return {
    status,
    message: getApiErrorMessage(error, fallback),
  };
};

export const isSessionExpiredError = (error: any) => {
  const status = getApiErrorStatus(error);
  const message = getApiErrorMessage(error, '');

  return (
    status === 401 ||
    /jwt expired|token expired|session expired|please login|please log in|login again|no token|invalid token|authentication required/i.test(message)
  );
};

export const isForbiddenRouteError = (error: any) => {
  const status = getApiErrorStatus(error);
  const message = getApiErrorMessage(error, '');

  return status === 403 || /not authorized|forbidden|access denied/i.test(message);
};
