/**
 * Official GE Vernova Approved Color Palette Design Tokens
 * Captured from GE Vernova Brand Guidelines
 */

export const GE_VERNOVA_PALETTE = {
  // Primary Palette
  primary: {
    evergreen: {
      name: "Evergreen",
      hex: "#005E60",
      rgb: "0, 94, 96",
      cmyk: "94, 12, 43, 49",
      pantone: "7721 C",
    },
    day: {
      name: "Day",
      hex: "#FFFFFF",
      rgb: "255, 255, 255",
      cmyk: "0, 0, 0, 0",
      pantone: "N/A",
    },
  },

  // Primary Accent Palette
  accent: {
    urgencyGreen: {
      name: "Urgency Green",
      hex: "#C8FF08",
      rgb: "200, 255, 8",
      cmyk: "34, 0, 95, 0",
      pantone: "2290 C",
    },
    night: {
      name: "Night",
      hex: "#212121",
      rgb: "33, 33, 33",
      cmyk: "60, 40, 40, 100",
      pantone: "Black 6 C",
    },
  },

  // Evergreen Tint Palette
  evergreenTints: {
    darkEvergreen: {
      name: "Dark Evergreen",
      hex: "#004745",
      rgb: "0, 71, 69",
      cmyk: "100, 48, 65, 43",
    },
    tint1: {
      name: "Evergreen Tint 1",
      hex: "#458A8A",
      rgb: "69, 138, 138",
      cmyk: "74, 30, 45, 5",
    },
    tint2: {
      name: "Evergreen Tint 2",
      hex: "#96BDBD",
      rgb: "150, 189, 189",
      cmyk: "42, 13, 24, 0",
    },
    tint3: {
      name: "Evergreen Tint 3",
      hex: "#C7DBDB",
      rgb: "199, 219, 219",
      cmyk: "21, 6, 12, 0",
    },
  },

  // Secondary Palette (Grays)
  grays: {
    gray1: {
      name: "Gray 1",
      hex: "#FAFAFA",
      rgb: "250, 250, 250",
      cmyk: "0, 0, 0, 2",
    },
    gray2: {
      name: "Gray 2",
      hex: "#E3E3E3",
      rgb: "227, 227, 227",
      cmyk: "0, 0, 0, 11",
    },
    gray3: {
      name: "Gray 3",
      hex: "#CCCCCC",
      rgb: "204, 204, 204",
      cmyk: "0, 0, 0, 20",
    },
    gray4: {
      name: "Gray 4",
      hex: "#696969",
      rgb: "105, 105, 105",
      cmyk: "0, 0, 0, 59",
    },
    gray5: {
      name: "Gray 5",
      hex: "#484848",
      rgb: "72, 72, 72",
      cmyk: "0, 0, 0, 72",
    },
  },

  // Tertiary Palette
  tertiary: {
    darkSky: {
      name: "Dark Sky",
      hex: "#2176FF",
      rgb: "33, 118, 255",
    },
    sky: {
      name: "Sky",
      hex: "#5FB7FF",
      rgb: "95, 183, 255",
    },
    darkForest: {
      name: "Dark Forest",
      hex: "#3E9E00",
      rgb: "62, 158, 0",
    },
    forest: {
      name: "Forest",
      hex: "#7BDD3C",
      rgb: "123, 221, 60",
    },
    darkEarth: {
      name: "Dark Earth",
      hex: "#4A2419",
      rgb: "74, 36, 25",
    },
    earth: {
      name: "Earth",
      hex: "#774936",
      rgb: "119, 73, 54",
    },
  },
} as const;

export type GEColorToken =
  | keyof typeof GE_VERNOVA_PALETTE.primary
  | keyof typeof GE_VERNOVA_PALETTE.accent
  | keyof typeof GE_VERNOVA_PALETTE.evergreenTints
  | keyof typeof GE_VERNOVA_PALETTE.grays
  | keyof typeof GE_VERNOVA_PALETTE.tertiary;
