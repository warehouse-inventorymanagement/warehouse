// Icon Sets Configuration
// Each set has metadata about whether it supports custom colors

export interface IconSetConfig {
  prefix: string;
  name: string;
  colorable: boolean; // false = multicolor icons (emoji, flags, etc.)
  description: string;
  category: 'ui' | 'tech' | 'colorful' | 'brands' | 'specialized';
}

export const ICON_SETS: IconSetConfig[] = [
  // Core UI Icons
  {
    prefix: 'lucide',
    name: 'Lucide',
    colorable: true,
    description: 'Clean, modern icons for UI',
    category: 'ui',
  },
  {
    prefix: 'tabler',
    name: 'Tabler Icons',
    colorable: true,
    description: 'Large set of outline icons',
    category: 'ui',
  },
  {
    prefix: 'bi',
    name: 'Bootstrap Icons',
    colorable: true,
    description: 'Filled and outline variants',
    category: 'ui',
  },

  // Technology & Development
  {
    prefix: 'carbon',
    name: 'Carbon',
    colorable: true,
    description: 'IBM design system icons',
    category: 'tech',
  },
  {
    prefix: 'devicon',
    name: 'Devicon',
    colorable: false,
    description: 'Programming languages and tools',
    category: 'tech',
  },
  {
    prefix: 'vscode-icons',
    name: 'VSCode Icons',
    colorable: false,
    description: 'File types and tech logos',
    category: 'tech',
  },

  // Colorful & Fun
  {
    prefix: 'openmoji',
    name: 'OpenMoji',
    colorable: false,
    description: 'Open source emoji',
    category: 'colorful',
  },
  {
    prefix: 'noto',
    name: 'Noto Emoji',
    colorable: false,
    description: 'Google emoji set',
    category: 'colorful',
  },

  // Brands & Logos
  {
    prefix: 'simple-icons',
    name: 'Simple Icons',
    colorable: true,
    description: 'Brand and company logos',
    category: 'brands',
  },

  // Specialized
  {
    prefix: 'circle-flags',
    name: 'Circle Flags',
    colorable: false,
    description: 'Country flags',
    category: 'specialized',
  },
  {
    prefix: 'fluent',
    name: 'Fluent UI',
    colorable: true,
    description: 'Microsoft design system',
    category: 'ui',
  },
  {
    prefix: 'ph',
    name: 'Phosphor',
    colorable: true,
    description: 'Flexible icon family with 6 weights',
    category: 'ui',
  },
];

// Helper to check if an icon set is colorable
export function isIconColorable(iconName: string): boolean {
  const prefix = iconName.split(':')[0];
  const iconSet = ICON_SETS.find(set => set.prefix === prefix);
  return iconSet?.colorable ?? true; // default to colorable if unknown
}

// Get icon set config by prefix
export function getIconSetConfig(prefix: string): IconSetConfig | undefined {
  return ICON_SETS.find(set => set.prefix === prefix);
}

// Get icon prefix from full icon name
export function getIconPrefix(iconName: string): string {
  return iconName.split(':')[0];
}

// Category labels for display
export const CATEGORY_LABELS: Record<IconSetConfig['category'], string> = {
  ui: 'UI Icons',
  tech: 'Technology',
  colorful: 'Colorful & Emoji',
  brands: 'Brands & Logos',
  specialized: 'Specialized',
};
