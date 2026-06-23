const endpoints = [
    { name: "Player Overview", path: "/api/profile", desc: "Basic ID Card: Skyblock Level, Purse, Skill Average, Dungeons Selected Class & Active Pet." },
    { name: "Networth Breakdown", path: "/api/networth", desc: "Calculates total networth, unsoulbound networth, and gives price breakdowns of wardrobe/inventory." },
    { name: "Magic Power & Stones", path: "/api/mp", desc: "Fetches live Magic Power, selected Power Stone, tuning points distribution, and accessory enrichments." },
    { name: "Dungeons Sweat-Sheet", path: "/api/dungeons", desc: "Gets Catacombs Level, total secrets found, and Floor 7 / Master Floor 7 completion counts." },
    { name: "Mining & HOTM", path: "/api/hotm", desc: "Heart of the Mountain tier, active mining ability, and totals for Mithril, Gemstone & Glacite powders." },
    { name: "Pets Inspector", path: "/api/pets", desc: "Returns total pets count, Legendary/Mythic ratio, and the active pet's held item." },
    { name: "Crimson Isle Kuudra", path: "/api/kuudra", desc: "Faction choice (Mage/Barbarian), reputation points, and Kuudra completions across all 5 tiers." },
    { name: "Exact Skill Levels", path: "/api/skills", desc: "Raw list of all individual skills mapped to their current real-time levels." },
    { name: "Slayer Progression", path: "/api/slayers", desc: "XP and tier progress for Zombie, Spider, Wolf, Enderman, Blaze, and Vampire slayers." }
];

module.exports = (req, res) => {
    // 1. Permanently aapka domain lock kar diya hamesha ke liye
    const origin = 'https://www.liveva.me';

    const cardsHtml = endpoints.map((ep, i) => `
        <div class="endpoint-card" style="animation: slideUp 0.4s ease forwards ${i * 0.05}s">
            <div class="card-header">
                <span class="method-badge">GET</span>
                <h3 class="title">${ep.name}</h3>
            </div>
            <p class="desc">${ep.desc}</p>
            <div class="url-box">
                <div class="url-text">
                    <span class="base-url">${origin}</span>${ep.path}?name=<span class="user-highlight">LiveBhai</span>
                </div>
                <div class="btn-group">
                    <button class="btn copy" onclick="copyUrl('${ep.path}', this)">📋 Copy</button>
                    <a href="${origin}${ep.path}?name=LiveBhai" target="_blank" class="btn open-link" data-path="${ep.path}">🚀 Open</a>
                </div>
            </div>
        </div>
    `).join('');

    const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>LiveBhai's SkyBlock Engine</title>
        <style>
            :root {
                --bg: #0b0f19; --card-bg: #111827; --card-hover: #1f2937; 
                --accent: #38bdf8; --success: #10b981; --text-main: #f8fafc; --text-muted: #94a3b8;
            }
            * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; }
            body { background-color: var(--bg); color: var(--text-main); padding: 30px 15px; min-height: 100vh; display: flex; flex-direction: column; align-items: center; }
            .container { max-width: 850px; width: 100%; }

            /* Header */
            .header { text-align: center; margin-bottom: 35px; }
            .header h1 { font-size: 2.6rem; font-weight: 800; background: linear-gradient(to right, #38bdf8, #a855f7); -webkit-background-clip: text; color: transparent; letter-spacing: -0.5px; }
            .header p { color: var(--text-muted); font-size: 1.05rem; margin-top: 5px; }

            /* Sticky Input Section */
            .sticky-dock {
                position: sticky; top: 15px; z-index: 100; margin-bottom: 40px;
                background: rgba(15, 23, 42, 0.85); backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px);
                padding: 18px 25px; border-radius: 20px; border: 1px solid rgba(56, 189, 248, 0.25);
                box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 0 25px rgba(56, 189, 248, 0.1);
            }
            .input-wrapper { display: flex; gap: 12px; align-items: center; }
            .input-wrapper input {
                flex: 1; background: #070a12; border: 2px solid #334155; color: #fff;
                padding: 14px 20px; border-radius: 12px; font-size: 1.2rem; font-family: monospace; font-weight: 600;
                outline: none; transition: 0.2s ease;
            }
            .input-wrapper input:focus { border-color: var(--accent); box-shadow: 0 0 15px rgba(56, 189, 248, 0.3); }
            
            .pills-row { display: flex; gap: 8px; justify-content: center; align-items: center; margin-top: 12px; flex-wrap: wrap; }
            .pill { background: #1e293b; color: var(--text-muted); border: 1px solid #334155; padding: 4px 12px; border-radius: 20px; font-size: 0.8rem; cursor: pointer; transition: 0.2s; font-family: monospace; }
            .pill:hover { background: var(--accent); color: #000; font-weight: bold; transform: scale(1.05); }

            /* Endpoints Grid */
            .endpoints-list { display: flex; flex-direction: column; gap: 20px; }
            .endpoint-card {
                background: var(--card-bg); border: 1px solid #1f2937; border-radius: 16px; padding: 22px;
                transition: 0.25s cubic-bezier(0.4, 0, 0.2, 1); opacity: 0;
            }
            .endpoint-card:hover { border-color: var(--accent); transform: translateY(-3px); box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3); }
            
            .card-header { display: flex; align-items: center; gap: 12px; margin-bottom: 8px; }
            .method-badge { background: var(--success); color: #000; font-size: 0.75rem; font-weight: 800; padding: 4px 8px; border-radius: 6px; letter-spacing: 0.5px; }
            .title { font-size: 1.25rem; color: #fff; }
            .desc { color: var(--text-muted); font-size: 0.95rem; margin-bottom: 16px; line-height: 1.4; }

            .url-box { background: #06090f; border: 1px solid #1f2937; padding: 10px 14px; border-radius: 12px; display: flex; justify-content: space-between; align-items: center; gap: 10px; overflow-x: auto; }
            .url-text { font-family: monospace; font-size: 0.95rem; color: #64748b; white-space: nowrap; }
            .url-text .base-url { color: var(--accent); font-weight: 600; }
            .user-highlight { color: #facc15; font-weight: bold; background: rgba(250, 204, 21, 0.12); padding: 2px 6px; border-radius: 4px; display: inline-block; transition: 0.15s; }

            .btn-group { display: flex; gap: 8px; }
            .btn { background: #1f2937; color: #fff; border: none; padding: 8px 14px; border-radius: 8px; font-size: 0.85rem; font-weight: 600; cursor: pointer; text-decoration: none; transition: 0.2s; white-space: nowrap; }
            .btn:hover { background: var(--accent); color: #000; }
            .btn.copy:hover { background: var(--success); color: #fff; }

            /* Keyframe animations */
            @keyframes slideUp { from { opacity: 0; transform: translateY(25px); } to { opacity: 1; transform: translateY(0); } }
            @keyframes textBounce { 0% { transform: scale(1); background: #facc15; color: #000; } 50% { transform: scale(1.15); } 100% { transform: scale(1); } }
            .anim-bounce { animation: textBounce 0.35s ease; }
        </style>
    </head>
    <body>

        <div class="container">
            <div class="header">
                <h1>LiveBhai SkyBlock API</h1>
                <p>High-Performance Cache Engine • Realtime Router</p>
            </div>

            <div class="sticky-dock">
                <div class="input-wrapper">
                    <span style="font-size: 1.4rem;">🔍</span>
                    <input type="text" id="pInput" value="LiveBhai" placeholder="Type Minecraft Username..." autocomplete="off" spellcheck="false" />
                </div>
                <div class="pills-row">
                    <span style="color: #64748b; font-size: 0.85rem; font-weight: 600;">Presets:</span>
                    <button class="pill" onclick="setPill('LiveBhai')">LiveBhai</button>
                    <button class="pill" onclick="setPill('itsg')">itsg (Billionaire)</button>
                    <button class="pill" onclick="setPill('Refraction')">Refraction (YouTuber)</button>
                </div>
            </div>

            <div class="endpoints-list">
                ${cardsHtml}
            </div>
        </div>

        <script>
            // Java Script me origin variable ko string me fix kar diya
            const origin = "${origin}";

            const input = document.getElementById('pInput');
            const highlights = document.querySelectorAll('.user-highlight');
            const links = document.querySelectorAll('.open-link');

            function sync() {
                const val = input.value.trim() || 'LiveBhai';
                
                highlights.forEach(el => {
                    el.textContent = val;
                    el.classList.remove('anim-bounce');
                    void el.offsetWidth; // Trigger DOM reflow
                    el.classList.add('anim-bounce');
                });

                links.forEach(el => {
                    const base = el.getAttribute('data-path');
                    // Ab typing karte waqt bhi liveva.me hi link me rahega
                    el.href = origin + base + '?name=' + encodeURIComponent(val);
                });
            }

            // Input event register kiya taaki typing work kare
            input.addEventListener('input', sync);

            function setPill(name) {
                input.value = name;
                sync();
            }

            function copyUrl(path, btn) {
                const val = input.value.trim() || 'LiveBhai';
                const fullUrl = origin + path + '?name=' + encodeURIComponent(val);
                navigator.clipboard.writeText(fullUrl);

                const oldHtml = btn.innerHTML;
                btn.innerHTML = '✔ Copied!';
                btn.style.background = '#10b981';
                btn.style.color = '#fff';

                setTimeout(() => {
                    btn.innerHTML = oldHtml;
                    btn.style.background = '#1f2937';
                }, 1200);
            }
        </script>
    </body>
    </html>
    `;

    res.setHeader('Content-Type', 'text/html');
    res.status(200).send(htmlContent);
};
