module.exports = async (req, res) => {
    const docs = {
        message: "Welcome to LiveBhai's SkyBlock API Docs!",
        base_url: "https://my-skyblock-api.vercel.app",
        endpoints: [
            { path: "/api/collection?name={username}", description: "Get player's collection stats" },
            { path: "/api/skills?name={username}", description: "Get player's skill levels" },
            { path: "/api/slayers?name={username}", description: "Get player's slayer completion status" },
            { path: "/api/mp?name={username}", description: "Get player's Magic Power (Accessories)" }
        ]
    };
    res.status(200).json(docs);
};
