module.exports = async (req, res) => {
    try {
        // Axios ki jagah native 'fetch' use kar rahe hain (Bina kisi extra package ke)
        const response = await fetch('https://api.liveva.me/auctions', {
            headers: { 
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            }
        });
        
        const auctionsData = await response.json();
        const results = [];

        for (const [key, stats] of Object.entries(auctionsData)) {
            let displayName = key;
            let imgKey = key; 

            // 1. Agar item ek PET hai
            if (key.startsWith('pet:')) {
                const parts = key.split(':');
                if (parts.length >= 3) {
                    imgKey = parts[1]; 
                    displayName = `${imgKey.replace(/_/g, ' ')} Pet (${parts[2]})`;
                }
            } 
            // 2. Agar item ek RUNE hai
            else if (key.startsWith('rune:')) {
                const parts = key.split(':');
                if (parts.length >= 3) {
                    imgKey = 'RUNE'; 
                    displayName = `${parts[1].replace(/_/g, ' ')} Rune T${parts[2]}`;
                }
            } 
            // 3. Normal items
            else {
                imgKey = key.replace(/:\d+/g, ''); 
                displayName = imgKey.replace(/_/g, ' '); 
            }

            // Display Name ko Title Case mein convert karna
            displayName = displayName.toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
            
            // SkyCrypt Open CDN (Cloudflare Bypass)
            const imgUrl = `https://sky.shiiyon.moe/item/${imgKey}`;

            results.push({
                name: displayName,
                lowest: Math.round(stats.lowest || 0),
                highest: Math.round(stats.highest || 0),
                mean: Math.round(stats.mean || 0),
                imgUrl: imgUrl,
                imgKey: imgKey
            });
        }

        res.status(200).json(results);
        
    } catch (error) {
        console.error("Backend Error:", error.message);
        res.status(500).json({ error: 'Failed to fetch auction data' });
    }
};
