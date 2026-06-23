module.exports = (req, res) => {
    const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>LiveBhai API Docs</title>
        <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #0f172a; color: #f8fafc; padding: 40px; max-width: 800px; margin: auto; }
            h1 { color: #38bdf8; border-bottom: 2px solid #1e293b; padding-bottom: 10px; }
            .endpoint { background: #1e293b; padding: 20px; margin: 15px 0; border-radius: 10px; border-left: 5px solid #38bdf8; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
            .method { background: #10b981; color: white; padding: 3px 8px; border-radius: 5px; font-size: 14px; font-weight: bold; margin-right: 10px; }
            a { color: #38bdf8; text-decoration: none; font-size: 16px; font-family: monospace; background: #0f172a; padding: 5px 10px; border-radius: 5px; }
            a:hover { background: #38bdf8; color: #0f172a; }
            p { color: #94a3b8; margin-top: 10px; }
        </style>
    </head>
    <body>
        <h1>🚀 LiveBhai SkyBlock API</h1>
        <p>Welcome to the Official LiveBhai Custom Hypixel API. Yahan saare available endpoints ki list hai:</p>
        
        <div class="endpoint">
            <span class="method">GET</span> 
            <a href="/api/profile?name=LiveBhai" target="_blank">/api/profile?name={user}</a>
            <p>Player ka basic overview (Level, Purse, Active Pet, Skill Average) nikalne ke liye.</p>
        </div>

        <div class="endpoint">
            <span class="method">GET</span> 
            <a href="/api/mp?name=LiveBhai" target="_blank">/api/mp?name={user}</a>
            <p>Magic Power, Selected Power Stone, Tuning Points aur Enrichments nikalne ke liye.</p>
        </div>

        <div class="endpoint">
            <span class="method">GET</span> 
            <a href="/api/skills?name=LiveBhai" target="_blank">/api/skills?name={user}</a>
            <p>Player ki har ek skill (Mining, Foraging, Combat etc.) ka exact level dekhne ke liye.</p>
        </div>

        <div class="endpoint">
            <span class="method">GET</span> 
            <a href="/api/slayers?name=LiveBhai" target="_blank">/api/slayers?name={user}</a>
            <p>Slayer Bosses (Zombie, Spider, Wolf, Voidgloom, Blaze, Vampire) ki details.</p>
        </div>
    </body>
    </html>
    `;

    // Hum Vercel ko bata rahe hain ki hum HTML bhej rahe hain, JSON nahi
    res.setHeader('Content-Type', 'text/html');
    res.status(200).send(htmlContent);
};
