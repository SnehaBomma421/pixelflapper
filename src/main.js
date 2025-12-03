import { renderDashboard } from './dashboard.js';
import { renderGame } from './game.js';

const app = document.getElementById('app');

function route() {
  const hash = location.hash || '#/';
  app.innerHTML = ''; // clear
  if (hash.startsWith('#/game')) {
    renderGame(app);
  } else {
    renderDashboard(app);
  }
}

window.addEventListener('hashchange', route);
window.addEventListener('load', route);
