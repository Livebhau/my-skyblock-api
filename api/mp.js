// Is file ke liye hume hypixel-api-reborn ki zaroorat hi nahi hai, hum direct Vercel ka Native Fetch use karenge!
const cache = new Map();

module.exports = async (req, res) => {
    const playerName = req.query.name;
    if (!playerName) return res.status(400).json({ error: "Username missing! ?name=PlayerName daalo" });

    const cacheKey = playerName.toLowerCase() + "_mp";
    const currentTime = Date.now();

    // 5-Min Cache 
    if (cache.has(cacheKey) && (currentTime - cache.get(cacheKey).timestamp < 300000)) {
        return res.status(200).json(cache.get(cacheKey).data);
    }

    try {
        // Step 1: Pehle naam se player ka UUID nikalte hain (Mojang API)
        const mojangRes = await fetch(`https://api.mojang.com/users/profiles/minecraft/${playerName}`);
        if (!mojangRes.ok) return res.status(404).json({ error: "Bhai yeh player exist nahi karta!" });
        const mojangData = await mojangRes.json();
        const uuid = mojangData.id;

        // Step 2: Ab direct Hypixel ko call karte hain Raw Data ke liye
        const hypixelRes = await fetch(`https://api.hypixel.net/v2/skyblock/profiles?key=${process.env.HYPIXEL_KEY}&uuid=${uuid}`);
        const hypixelData = await hypixelRes.json();

        if (!hypixelData.success) {
            return res.status(500).json({ error: "Hypixel ne API block ki ya Key galat hai: " + hypixelData.cause });
        }
        if (!hypixelData.profiles || hypixelData.profiles.length === 0) {
            return res.status(404).json({ error: "Is bande ne SkyBlock khela hi nahi hai!" });
        }

        // Step 3: Sirf 'Active' Profile uthao
        const activeProfile = hypixelData.profiles.find(profile => profile.selected === true);
        if (!activeProfile) return res.status(404).json({ error: "Koi active profile nahi mili!" });

        // Step 4: Asli Raw Accessory Bag nikalna
        const playerData = activeProfile.members[uuid];
        const accBag = playerData.accessory_bag_storage || {};

        // Saara VIP data yahan extract kiya gaya hai:
        const mp = accBag.highest_magical_power || 0;
        const selectedPower = accBag.selected_power || "None";
        const tuningPoints = accBag.tuning?.slot_0 || {}; 
        const enrichments = accBag.enrichment_tracker || {};

        const result = {
            username: mojangData.name,
            activeProfileName: activeProfile.cute_name,
            magicPower: mp,
            selectedPower: selectedPower, // (eg. "bloody", "hurtful")
            tuningPoints: tuningPoints,   // (eg. { health: 5, speed: 10 })
            enrichments: enrichments,     // (eg. { MAGIC_FIND: 10, FEROCITY: 2 })
            warning: mp === 0 ? "Game me Inventory API band hai!" : "All Good"
        };

        // Cache save
        cache.set(cacheKey, { data: result, timestamp: currentTime });

        res.status(200).json(result);

    } catch (error) {
        res.status(500).json({ error: "System Error: " + error.message });
    }
};
