// Simple logger module to replace Trigger.dev's logger

export const logger = {
  log: (message: string, data?: Record<string, any>) => {
    console.log(`[LOG] ${message}`, data ? JSON.stringify(data, null, 2) : '');
  },
  
  info: (message: string, data?: Record<string, any>) => {
    console.info(`[INFO] ${message}`, data ? JSON.stringify(data, null, 2) : '');
  },
  
  warn: (message: string, data?: Record<string, any>) => {
    console.warn(`[WARN] ${message}`, data ? JSON.stringify(data, null, 2) : '');
  },
  
  error: (message: string, data?: Record<string, any>) => {
    console.error(`[ERROR] ${message}`, data ? JSON.stringify(data, null, 2) : '');
  },
  
  debug: (message: string, data?: Record<string, any>) => {
    if (process.env.NODE_ENV === 'development') {
      console.debug(`[DEBUG] ${message}`, data ? JSON.stringify(data, null, 2) : '');
    }
  }
};

