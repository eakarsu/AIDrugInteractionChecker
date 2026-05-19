const rateLimit = require('express-rate-limit');
const { ipKeyGenerator } = require('express-rate-limit');

const aiRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  keyGenerator: (req, res) => req.user ? `user:${req.user.id}` : ipKeyGenerator(req, res),
  message: { error: 'AI rate limit exceeded. Max 20 requests/hour.' }
});

module.exports = { aiRateLimiter };
