// src/mock_api_shim.js
const STORAGE_SCORES_KEY = 'pixelflapper_scores';

export function saveScore(username, score) {
  const raw = localStorage.getItem(STORAGE_SCORES_KEY);
  let scores = [];
  try { scores = JSON.parse(raw || '[]'); } catch(e){ scores = []; }
  scores.push({ username, score, time: Date.now() });
  scores.sort((a,b) => b.score - a.score);
  localStorage.setItem(STORAGE_SCORES_KEY, JSON.stringify(scores.slice(0,50)));
}

// Also expose a global for the game's convenience
window.__pixelflapper_submitScore = (username, score) => {
  saveScore(username, score);
};
