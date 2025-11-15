# SoupHeatMap

A sleek, modern desktop application for analyzing Valorant match data through interactive heatmaps and advanced filtering.

<img width="1395" height="1199" alt="image" src="https://github.com/user-attachments/assets/7a7b7fe3-4bcf-48a9-a1b1-96e7fbaede62" />


## Tech Stack

- **Frontend**: React 19 + TypeScript
- **Desktop**: Tauri 2.0
- **Build Tool**: Vite 7
- **Styling**: Modern CSS with custom dark theme
- **Visualization**: D3.js + Konva.js

## Features

- **Interactive Heatmaps**: Visualize kill locations with customizable density and colors
- **Advanced Filtering**: Filter by players, weapons, rounds, and time ranges
- **Multiple View Modes**: Single match analysis or aggregated map statistics
- **Export Functionality**: Save heatmaps as PNG, JPG, or GIF files
- **Overlay Tools**: Add custom annotations and drawings to heatmaps
- **Modern UI**: Sleek dark theme with gradient accents and smooth animations

## Prerequisites

Before you begin, ensure you have the following installed:

- [Node.js](https://nodejs.org/) (v18 or higher)
- [Rust](https://www.rust-lang.org/tools/install) (for Tauri)
- [Visual Studio C++ Build Tools](https://visualstudio.microsoft.com/downloads/) (Windows only)

## Getting Started

### Installation

```bash
# Install dependencies
npm install
```

### Development

```bash
# Run the web version
npm run dev

# Run the Tauri desktop app
npm run tauri:dev
```

### Building

```bash
# Build for production
npm run build

# Build the Tauri desktop app
npm run tauri:build
```

## Project Structure

```
SoupHeatMap/
├── src/                          # React frontend source
│   ├── components/               # React components
│   │   ├── layout/              # Layout components (Header, etc.)
│   │   ├── panels/              # Panel components (Filters, etc.)
│   │   ├── controls/            # Control components (Selectors, etc.)
│   │   ├── Heatmap.tsx          # Main heatmap visualization
│   │   ├── OverlayCanvas.tsx    # Interactive overlay tools
│   │   └── ...
│   ├── lib/                     # Utility libraries
│   │   ├── tauri-api.ts         # Tauri backend communication
│   │   ├── export-utils.ts      # Export functionality
│   │   └── coordinateTransform.ts # Map coordinate transformations
│   ├── hooks/                   # Custom React hooks
│   ├── types.ts                 # TypeScript type definitions
│   ├── App.tsx                  # Main React component
│   ├── App.css                  # Main component styles
│   ├── main.tsx                 # React entry point
│   └── index.css                # Global styles
├── src-tauri/                   # Tauri backend (Rust)
│   ├── src/                     # Rust source files
│   ├── icons/                   # App icons
│   ├── Cargo.toml               # Rust dependencies
│   └── tauri.conf.json          # Tauri configuration
├── index.html                   # HTML entry point
├── vite.config.ts               # Vite configuration
├── tsconfig.json                # TypeScript configuration
└── package.json                 # Node dependencies
```


