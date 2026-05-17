# Live Wallpaper API

A simple API and collection of live wallpapers.

## Features
- Automatic manifest generation
- High-quality live wallpapers (video format)
- Easy-to-use JSON manifest

## API Usage

The manifest is available at:
`https://forzayt.github.io/Live_Wallpaper_API/data/manifest/manifest.json`

### Example Response
```json
{
  "lastUpdated": "2026-05-17T10:10:49.780Z",
  "count": 4,
  "wallpapers": [
    {
      "name": "Cat_eats_chips_Windows_XP.mp4",
      "url": "https://forzayt.github.io/Live_Wallpaper_API/data/wallpapers/Cat_eats_chips_Windows_XP.mp4"
    }
  ]
}
```

## Development

### Installation
```bash
npm install
```

### Generate Manifest
To update the manifest after adding new wallpapers to `data/wallpapers/`:
```bash
npm run generate-manifest
```

## License
ISC
