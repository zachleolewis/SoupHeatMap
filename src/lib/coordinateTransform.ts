/**
 * Coordinate Transformation System for Valorant Maps
 * 
 * Uses official Valorant API transformation data from Riot Games.
 * Source: https://valorant-api.com/v1/maps
 * 
 * CRITICAL: game_x and game_y are SWAPPED per official API docs
 * Formula: normalizedX = gameY * xMultiplier + xScalarToAdd
 *          normalizedY = gameX * yMultiplier + yScalarToAdd
 * 
 * Data extracted from: maps.json (live API data)
 */

interface MapTransform {
  uuid: string;
  xMultiplier: number;
  yMultiplier: number;
  xScalarToAdd: number;
  yScalarToAdd: number;
  displayIcon: string;
}

// Official Valorant API transformation data (EXACT VALUES from live API)
// Source: https://valorant-api.com/v1/maps (via maps.json)
const MAP_TRANSFORMS: Record<string, MapTransform> = {
  'Abyss': {
    uuid: '224b0a95-48b9-f703-1bd8-67aca101a61f',
    xMultiplier: 0.000081,
    yMultiplier: -0.000081,
    xScalarToAdd: 0.5,
    yScalarToAdd: 0.5,
    displayIcon: 'https://media.valorant-api.com/maps/224b0a95-48b9-f703-1bd8-67aca101a61f/displayicon.png'
  },
  'Ascent': {
    uuid: '7eaecc1b-4337-bbf6-6ab9-04b8f06b3319',
    xMultiplier: 0.00007,
    yMultiplier: -0.00007,
    xScalarToAdd: 0.813895,
    yScalarToAdd: 0.573242,
    displayIcon: 'https://media.valorant-api.com/maps/7eaecc1b-4337-bbf6-6ab9-04b8f06b3319/displayicon.png'
  },
  'Bind': {
    uuid: '2c9d57ec-4431-9c5e-2939-8f9ef6dd5cba',
    xMultiplier: 0.000059,
    yMultiplier: -0.000059,
    xScalarToAdd: 0.576941,
    yScalarToAdd: 0.967566,
    displayIcon: 'https://media.valorant-api.com/maps/2c9d57ec-4431-9c5e-2939-8f9ef6dd5cba/displayicon.png'
  },
  'Breeze': {
    uuid: '2fb9a4fd-47b8-4e7d-a969-74b4046ebd53',
    xMultiplier: 0.00007,
    yMultiplier: -0.00007,
    xScalarToAdd: 0.465123,
    yScalarToAdd: 0.833078,
    displayIcon: 'https://media.valorant-api.com/maps/2fb9a4fd-47b8-4e7d-a969-74b4046ebd53/displayicon.png'
  },
  'Corrode': {
    uuid: '1c18ab1f-420d-0d8b-71d0-77ad3c439115',
    xMultiplier: 0.00007,
    yMultiplier: -0.00007,
    xScalarToAdd: 0.526158,
    yScalarToAdd: 0.5,
    displayIcon: 'https://media.valorant-api.com/maps/1c18ab1f-420d-0d8b-71d0-77ad3c439115/displayicon.png'
  },
  'Fracture': {
    uuid: 'b529448b-4d60-346e-e89e-00a4c527a405',
    xMultiplier: 0.000078,
    yMultiplier: -0.000078,
    xScalarToAdd: 0.556952,
    yScalarToAdd: 1.155886,
    displayIcon: 'https://media.valorant-api.com/maps/b529448b-4d60-346e-e89e-00a4c527a405/displayicon.png'
  },
  'Haven': {
    uuid: '2bee0dc9-4ffe-519b-1cbd-7fbe763a6047',
    xMultiplier: 0.000075,
    yMultiplier: -0.000075,
    xScalarToAdd: 1.09345,
    yScalarToAdd: 0.642728,
    displayIcon: 'https://media.valorant-api.com/maps/2bee0dc9-4ffe-519b-1cbd-7fbe763a6047/displayicon.png'
  },
  'Icebox': {
    uuid: 'e2ad5c54-4114-a870-9641-8ea21279579a',
    xMultiplier: 0.000072,
    yMultiplier: -0.000072,
    xScalarToAdd: 0.460214,
    yScalarToAdd: 0.304687,
    displayIcon: 'https://media.valorant-api.com/maps/e2ad5c54-4114-a870-9641-8ea21279579a/displayicon.png'
  },
  'Lotus': {
    // NOTE: Valorant API bug - Lotus uses Breeze's UUID in the official API
    // This is the CORRECT behavior per the live API data
    uuid: '2fe4ed3a-450a-948b-6d6b-e89a78e680a9',
    xMultiplier: 0.000072,
    yMultiplier: -0.000072,
    xScalarToAdd: 0.454789,
    yScalarToAdd: 0.917752,
    displayIcon: 'https://media.valorant-api.com/maps/2fe4ed3a-450a-948b-6d6b-e89a78e680a9/displayicon.png'
  },
  'Pearl': {
    uuid: 'fd267378-4d1d-484f-ff52-77821ed10dc2',
    xMultiplier: 0.000078,
    yMultiplier: -0.000078,
    xScalarToAdd: 0.480469,
    yScalarToAdd: 0.916016,
    displayIcon: 'https://media.valorant-api.com/maps/fd267378-4d1d-484f-ff52-77821ed10dc2/displayicon.png'
  },
  'Split': {
    uuid: 'd960549e-485c-e861-8d71-aa9d1aed12a2',
    xMultiplier: 0.000078,
    yMultiplier: -0.000078,
    xScalarToAdd: 0.842188,
    yScalarToAdd: 0.697578,
    displayIcon: 'https://media.valorant-api.com/maps/d960549e-485c-e861-8d71-aa9d1aed12a2/displayicon.png'
  },
  'Sunset': {
    uuid: '92584fbe-486a-b1b2-9faa-39b0f486b498',
    xMultiplier: 0.000078,
    yMultiplier: -0.000078,
    xScalarToAdd: 0.5,
    yScalarToAdd: 0.515625,
    displayIcon: 'https://media.valorant-api.com/maps/92584fbe-486a-b1b2-9faa-39b0f486b498/displayicon.png'
  },
  'Triad': {
    uuid: '9c91a445-4f78-1baa-a3ea-8f8aadf4914d',
    xMultiplier: 0.000063,
    yMultiplier: -0.000063,
    xScalarToAdd: 0.5,
    yScalarToAdd: 0.5,
    displayIcon: 'https://media.valorant-api.com/maps/9c91a445-4f78-1baa-a3ea-8f8aadf4914d/displayicon.png'
  }
};

/**
 * Transform game coordinates to normalized [0, 1] space
 * 
 * CRITICAL: X and Y are SWAPPED per Valorant API specification
 * Formula: normalizedX = gameY * xMultiplier + xScalarToAdd
 *          normalizedY = gameX * yMultiplier + yScalarToAdd
 */
export function transformCoordinates(
  x: number,
  y: number,
  mapName: string
): { x: number; y: number } | null {
  // Filter out invalid coordinates (common in VCT JSON)
  if (x === -999 || y === -999 || x === 0 || y === 0) {
    return null;
  }

  const transform = MAP_TRANSFORMS[mapName];
  
  // Return null for unknown maps (per reference implementation)
  if (!transform) {
    console.warn(`Unknown map: ${mapName}. Available maps:`, Object.keys(MAP_TRANSFORMS));
    return null;
  }
  
  // Apply official Valorant API formula with X/Y swap
  const normalizedX = y * transform.xMultiplier + transform.xScalarToAdd;
  const normalizedY = x * transform.yMultiplier + transform.yScalarToAdd;
  
  // Clamp to [0, 1] range
  const clampedX = Math.max(0, Math.min(1, normalizedX));
  const clampedY = Math.max(0, Math.min(1, normalizedY));
  
  return { x: clampedX, y: clampedY };
}

/**
 * Get official Valorant API map image URL
 */
export function getMapImageUrl(mapName: string): string {
  const transform = MAP_TRANSFORMS[mapName];
  
  if (!transform) {
    console.warn(`Unknown map: ${mapName}. Using default image.`);
    // Return Ascent as fallback
    return MAP_TRANSFORMS['Ascent'].displayIcon;
  }
  
  return transform.displayIcon;
}

/**
 * Get list of available maps
 */
export function getAvailableMaps(): string[] {
  return Object.keys(MAP_TRANSFORMS);
}
