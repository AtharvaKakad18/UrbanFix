import rateLimit from 'express-rate-limit';

// General API rate limiter: 300 requests per 15 minutes
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: { message: 'Too many requests from this IP, please try again after 15 minutes.' },
  },
});

// Stricter auth limiter: 20 login/register attempts per 15 minutes
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: { message: 'Too many authentication attempts, please try again later.' },
  },
});

// Report creation rate limiter: 10 reports per hour
export const reportCreateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: { message: 'Report creation rate limit exceeded. Please wait before creating more reports.' },
  },
});
