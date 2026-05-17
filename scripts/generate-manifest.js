const fs = require('fs');
const path = require('path');

const wallpapersDir = path.join(__dirname, '../data/wallpapers');
const manifestPath = path.join(__dirname, '../data/manifest/manifest.json');
const repoBaseUrl = 'https://forzayt.github.io/Live_Wallpaper_API/data/wallpapers/';

function generateManifest() {
    try {
        if (!fs.existsSync(wallpapersDir)) {
            console.error('Wallpapers directory not found:', wallpapersDir);
            return;
        }

        const files = fs.readdirSync(wallpapersDir);
        const wallpapers = files
            .filter(file => {
                const ext = path.extname(file).toLowerCase();
                return ['.mp4', '.webm', '.jpg', '.jpeg', '.png', '.gif'].includes(ext);
            })
            .map(file => {
                const filePath = path.join(wallpapersDir, file);
                const stats = fs.statSync(filePath);
                return {
                    name: file,
                    url: `${repoBaseUrl}${encodeURIComponent(file)}`,
                    mtime: stats.mtimeMs // Store modification time for sorting
                };
            })
            .sort((a, b) => b.mtime - a.mtime) // Sort by newest first
            .map(({ name, url }) => ({ name, url })); // Remove mtime from final JSON to keep it clean

        const manifest = {
            lastUpdated: new Date().toISOString(),
            count: wallpapers.length,
            wallpapers: wallpapers
        };

        // Ensure manifest directory exists
        const manifestDir = path.dirname(manifestPath);
        if (!fs.existsSync(manifestDir)) {
            fs.mkdirSync(manifestDir, { recursive: true });
        }

        fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
        console.log(`Manifest generated successfully at ${manifestPath}`);
        console.log(`Found ${wallpapers.length} wallpapers.`);
    } catch (error) {
        console.error('Error generating manifest:', error);
        process.exit(1);
    }
}

generateManifest();
