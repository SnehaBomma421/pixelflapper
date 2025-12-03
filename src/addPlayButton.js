// src/addPlayButton.js
// Injects a Play button into the dashboard and ensures the SPA router (/src/main.js) is loaded.
// If /src/main.js isn't loaded, this script will dynamically add it (as a module) and then navigate to #/game.

document.addEventListener("DOMContentLoaded", async () => {
  const app = document.getElementById("app");
  if (!app) return;

  // Create wrapper/button (only if not already present)
  if (!document.getElementById('__pix_play_btn')) {
    const playWrap = document.createElement("div");
    playWrap.style.textAlign = "center";
    playWrap.style.marginTop = "30px";

    const btn = document.createElement("button");
    btn.id = "__pix_play_btn";
    btn.textContent = "PLAY GAME";
    btn.className = "btn-retro retro-font text-sm px-6 py-3 rounded";
    btn.style.cursor = "pointer";
    btn.style.fontSize = "14px";

    playWrap.appendChild(btn);
    app.appendChild(playWrap);

    btn.addEventListener('click', async () => {
      // Ensure the router main.js is loaded as a module (only once)
      if (!window.__pix_router_loaded) {
        try {
          // Dynamically insert script module tag for main.js
          await loadModule('/src/main.js');
          // mark loaded
          window.__pix_router_loaded = true;
        } catch (e) {
          console.error('Failed to load /src/main.js dynamically:', e);
          // fallback: try a simple page reload so any static <script> inserted manually will run
          location.hash = '#/game';
          location.reload();
          return;
        }
      }

      // Now navigate to game route
      location.hash = '#/game';
      // Some routers listen for hashchange; fire an event to be sure
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    });
  }

  // helper to dynamically load a module script
  function loadModule(src) {
    return new Promise((resolve, reject) => {
      // if already present, resolve
      const already = Array.from(document.querySelectorAll('script[type="module"]')).some(s => s.src && s.src.includes(src));
      if (already) {
        resolve();
        return;
      }
      const s = document.createElement('script');
      s.type = 'module';
      s.src = src;
      s.onload = () => resolve();
      s.onerror = (err) => reject(err);
      document.body.appendChild(s);
    });
  }
});
