export const env = {
  GOOGLE_API_KEY: process.env.GOOGLE_API_KEY,
  NODE_ENV: process.env.NODE_ENV,
  NEXT_PUBLIC_WEBSOCKET_URL: process.env.NEXT_PUBLIC_WEBSOCKET_URL,
} as const;

// Type checking for environment variables
type Environment = typeof env;

// Ensure all environment variables are defined
const validateEnv = () => {
  const missingVars: string[] = [];
  Object.entries(env).forEach(([key, value]) => {
    if (value === undefined) {
      missingVars.push(key);
    }
  });

  if (missingVars.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missingVars.join(', ')}`
    );
  }
};

// Validate environment variables in development
if (process.env.NODE_ENV !== 'production') {
  validateEnv();
}

export type { Environment };
