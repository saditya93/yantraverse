'use strict';

/**
 * Convert a route pattern like /users/:id/posts/:postId
 * into a regex and extract param names.
 */
function compilePattern(pattern) {
  const keys = [];

  if (pattern instanceof RegExp) return { regex: pattern, keys };

  // exact wildcard
  if (pattern === '*') return { regex: /^.*$/, keys: ['wildcard'] };

  const escaped = pattern
    .replace(/\//g, '\\/')             // escape slashes
    .replace(/:([a-zA-Z_][a-zA-Z0-9_]*)\*/g, (_, name) => {
      keys.push(name);
      return '(.+)';                   // greedy named param
    })
    .replace(/:([a-zA-Z_][a-zA-Z0-9_]*)\?/g, (_, name) => {
      keys.push(name);
      return '([^/]*)';               // optional named param
    })
    .replace(/:([a-zA-Z_][a-zA-Z0-9_]*)/g, (_, name) => {
      keys.push(name);
      return '([^/]+)';               // required named param
    })
    .replace(/\*/g, '.*');            // bare wildcard

  return { regex: new RegExp(`^${escaped}$`), keys };
}

const cache = new Map();

function matchRoute(pattern, reqPath) {
  let compiled = cache.get(pattern);
  if (!compiled) {
    compiled = compilePattern(pattern);
    cache.set(pattern, compiled);
  }

  const match = compiled.regex.exec(reqPath);
  if (!match) return null;

  const params = {};
  compiled.keys.forEach((key, i) => {
    params[key] = decodeURIComponent(match[i + 1] || '');
  });
  return params;
}

function extractParams(pattern, reqPath) {
  return matchRoute(pattern, reqPath) || {};
}

module.exports = { matchRoute, extractParams };
