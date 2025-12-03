// src/dashboard.js
// Dashboard UI (converted from the static HTML the user provided)
// Uses localStorage keys and exports renderDashboard(container)

const USERS_KEY = 'flappy_bird_users';
const SCORES_KEY = 'flappy_bird_scores';
const API_SERVER_PORT = 8081; // shown on UI

function loadData() {
  const users = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
  const scores = JSON.parse(localStorage.getItem(SCORES_KEY) || '[]');
  return { users, scores };
}
function saveData(users, scores) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
  localStorage.setItem(SCORES_KEY, JSON.stringify(scores));
}
function renderLeaderboardTable(scores) {
  const tbodyRows = scores.length === 0
    ? `<tr><td colspan="3" class="text-center py-4 text-gray-500">No scores yet.</td></tr>`
    : scores
        .sort((a, b) => b.score - a.score)
        .map((entry, i) => {
          return `<tr class="${i < 3 ? 'text-yellow-300' : 'text-white'}">
            <td class="py-2">${i+1}</td>
            <td class="py-2">${escapeHtml(entry.username)}</td>
            <td class="py-2 text-right">${entry.score}</td>
          </tr>`;
        }).join('');
  return tbodyRows;
}

export function renderDashboard(container) {
  const { users, scores } = loadData();

  container.innerHTML = `
    <div id="frontpage" class="w-full max-w-4xl p-8 rounded-xl glass-card text-white">
      <h1 class="monoton-font text-5xl text-center mb-10 text-yellow-300 drop-shadow-lg">
          PIXEL FLAPPER
      </h1>

      <div class="mb-6 retro-font text-xs text-center p-3 rounded-lg border border-yellow-500 bg-yellow-900/50">
          <span id="status-icon" class="inline-block w-3 h-3 bg-red-500 rounded-full mr-2 animate-pulse"></span>
          API PORT: <span id="api-port">Loading...</span> | STATUS: <span id="api-status">Inactive</span>
      </div>

      <div class="flex flex-col md:flex-row gap-8">
        <div class="w-full md:w-1/2 p-6 rounded-lg bg-gray-900/50">
          <h2 class="retro-font text-xl mb-4 text-center text-pink-400">
              User Authentication
          </h2>

          <div id="auth-view">
            <input type="text" id="username-input" placeholder="Username (Java Client ID)"
                   class="w-full p-3 mb-4 rounded bg-gray-700 border border-gray-600 retro-font text-sm text-yellow-300 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-400">

            <div class="flex gap-4">
              <button id="login-btn" class="w-1/2 p-3 rounded btn-retro retro-font text-sm">
                  LOGIN (Simulated)
              </button>
              <button id="signup-btn" class="w-1/2 p-3 rounded btn-retro retro-font text-sm">
                  SIGN UP
              </button>
            </div>
          </div>

          <p id="auth-message" class="text-center mt-4 retro-font text-xs"></p>
          <p id="current-user" class="text-center mt-4 retro-font text-sm text-green-400 hidden">
              <span class="text-gray-400">Logged in as:</span>
              <span id="current-user-name" class="text-yellow-300"></span>
          </p>
        </div>

        <div class="w-full md:w-1/2 p-6 rounded-lg bg-gray-900/50">
          <h2 class="retro-font text-xl mb-4 text-center text-pink-400">
              Global Leaderboard
          </h2>
          <div class="h-64 overflow-y-auto">
            <table class="w-full retro-font text-xs">
              <thead>
                <tr class="text-gray-400 border-b border-gray-700">
                  <th class="py-2 text-left">Rank</th>
                  <th class="py-2 text-left">Player</th>
                  <th class="py-2 text-right">Score</th>
                </tr>
              </thead>
              <tbody id="leaderboard-body">
                ${ renderLeaderboardTable(scores) }
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  `;

  // Wire up elements
  const usernameInput = container.querySelector('#username-input');
  const loginBtn = container.querySelector('#login-btn');
  const signupBtn = container.querySelector('#signup-btn');
  const authMessage = container.querySelector('#auth-message');
  const currentUserDisplay = container.querySelector('#current-user');
  const currentUserName = container.querySelector('#current-user-name');
  const leaderboardBody = container.querySelector('#leaderboard-body');
  const apiPortDisplay = container.querySelector('#api-port');
  const apiStatusDisplay = container.querySelector('#api-status');
  const statusIcon = container.querySelector('#status-icon');

  // show API status
  apiPortDisplay.textContent = API_SERVER_PORT;
  apiStatusDisplay.textContent = 'Active (Ready for Java Client)';
  statusIcon.classList.remove('bg-red-500', 'animate-pulse');
  statusIcon.classList.add('bg-green-500');

  // helper to show messages
  function displayMessage(msg, isError = false) {
    authMessage.textContent = msg;
    authMessage.className = `text-center mt-4 retro-font text-xs ${isError ? 'text-red-400' : 'text-green-400'}`;
  }

  // refresh leaderboard UI
  function refreshLeaderboard() {
    const { scores } = loadData();
    leaderboardBody.innerHTML = renderLeaderboardTable(scores);
  }

  // Login handler
  loginBtn.addEventListener('click', () => {
    const username = (usernameInput.value || '').trim();
    if (!username) { displayMessage('Username required.', true); return; }
    const { users } = loadData();
    if (users.find(u => u.username === username)) {
      currentUserDisplay.classList.remove('hidden');
      currentUserName.textContent = username;
      displayMessage(`Welcome back, ${username}!`, false);
    } else {
      displayMessage('User not found. Please sign up first.', true);
    }
  });

  // Signup handler
  signupBtn.addEventListener('click', () => {
    const username = (usernameInput.value || '').trim();
    if (!username) { displayMessage('Username required.', true); return; }
    const data = loadData();
    if (data.users.find(u => u.username === username)) {
      displayMessage('Username already taken. Please login.', true);
      return;
    }
    data.users.push({ username });
    saveData(data.users, data.scores);
    currentUserDisplay.classList.remove('hidden');
    currentUserName.textContent = username;
    displayMessage(`Account created for ${username}! Logged in.`, false);
    refreshLeaderboard();
  });

  // Expose function for game to submit score
  // It will be called by the game code as: window.__pixelflapper_submitScore(username, score)
  window.__pixelflapper_submitScore = (username, score) => {
    if (!username || typeof score !== 'number') return;
    const data = loadData();
    // require user exists
    if (!data.users.find(u => u.username === username)) return;
    const existing = data.scores.find(s => s.username === username);
    if (existing) {
      if (score > existing.score) existing.score = score;
    } else {
      data.scores.push({ username, score });
    }
    saveData(data.users, data.scores);
    refreshLeaderboard();
  };
}

// small helper to avoid XSS if usernames come from outside
function escapeHtml(s = '') {
  return String(s).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
}
