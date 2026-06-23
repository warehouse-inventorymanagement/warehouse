import { addCollection } from '@iconify/react';
import type { IconifyJSON as IconifyJSONType } from '@iconify/types';

// Import all icon set data
// These will be bundled at build time
import lucideData from '@iconify-json/lucide/icons.json';
import tablerData from '@iconify-json/tabler/icons.json';
import biData from '@iconify-json/bi/icons.json';
import carbonData from '@iconify-json/carbon/icons.json';
import deviconData from '@iconify-json/devicon/icons.json';
import vscodeIconsData from '@iconify-json/vscode-icons/icons.json';
import openmojiData from '@iconify-json/openmoji/icons.json';
import notoData from '@iconify-json/noto/icons.json';
import simpleIconsData from '@iconify-json/simple-icons/icons.json';
import circleFlagsData from '@iconify-json/circle-flags/icons.json';
import fluentData from '@iconify-json/fluent/icons.json';
import phData from '@iconify-json/ph/icons.json';

// Type for Iconify icon set data (simplified for internal use)
interface IconifyJSON {
  prefix: string;
  icons: Record<string, unknown>;
  aliases?: Record<string, unknown>;
}

// Map of prefix to data
const iconSetsData: Record<string, IconifyJSON> = {
  lucide: lucideData as IconifyJSON,
  tabler: tablerData as IconifyJSON,
  bi: biData as IconifyJSON,
  carbon: carbonData as IconifyJSON,
  devicon: deviconData as IconifyJSON,
  'vscode-icons': vscodeIconsData as IconifyJSON,
  openmoji: openmojiData as IconifyJSON,
  noto: notoData as IconifyJSON,
  'simple-icons': simpleIconsData as IconifyJSON,
  'circle-flags': circleFlagsData as IconifyJSON,
  fluent: fluentData as IconifyJSON,
  ph: phData as IconifyJSON,
};

// Track if icons have been initialized
let iconsInitialized = false;

// Initialize all icon collections (call this once at app start)
export function initializeIconSets(): void {
  if (iconsInitialized) return;

  Object.values(iconSetsData).forEach((data) => {
    addCollection(data as IconifyJSONType);
  });

  iconsInitialized = true;
  console.log('Icon sets initialized:', Object.keys(iconSetsData).length, 'sets loaded');
}

// Get all icon names for a specific set
export function getIconNames(prefix: string): string[] {
  const data = iconSetsData[prefix];
  if (!data) return [];

  const iconNames = Object.keys(data.icons);

  // Also include aliases if available
  if (data.aliases) {
    iconNames.push(...Object.keys(data.aliases));
  }

  return iconNames.sort();
}

// Get icon count for a set
export function getIconCount(prefix: string): number {
  const data = iconSetsData[prefix];
  if (!data) return 0;

  let count = Object.keys(data.icons).length;
  if (data.aliases) {
    count += Object.keys(data.aliases).length;
  }
  return count;
}

// Get total icon count across all sets
export function getTotalIconCount(): number {
  return Object.keys(iconSetsData).reduce((total, prefix) => {
    return total + getIconCount(prefix);
  }, 0);
}

// Check if an icon exists in bundled sets
export function isIconBundled(iconName: string): boolean {
  const [prefix, name] = iconName.split(':');
  if (!prefix || !name) return false;

  const data = iconSetsData[prefix];
  if (!data) return false;

  return name in data.icons || (data.aliases ? name in data.aliases : false);
}

// Search icons across all sets or a specific set
export function searchIcons(
  query: string,
  prefix?: string,
  limit: number = 100
): Array<{ prefix: string; name: string; fullName: string }> {
  const results: Array<{ prefix: string; name: string; fullName: string }> = [];
  const queryLower = query.toLowerCase().replace(/[-_]/g, ' ');

  const prefixesToSearch = prefix ? [prefix] : Object.keys(iconSetsData);

  for (const p of prefixesToSearch) {
    const iconNames = getIconNames(p);

    for (const name of iconNames) {
      if (results.length >= limit) break;

      const nameLower = name.toLowerCase().replace(/[-_]/g, ' ');
      if (nameLower.includes(queryLower)) {
        results.push({
          prefix: p,
          name,
          fullName: `${p}:${name}`,
        });
      }
    }

    if (results.length >= limit) break;
  }

  return results;
}

// Get all prefixes
export function getAvailablePrefixes(): string[] {
  return Object.keys(iconSetsData);
}
