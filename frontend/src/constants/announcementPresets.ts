import type { AnnouncementTemplate } from '../types';

export const BUILT_IN_ANNOUNCEMENT_PRESETS: Omit<AnnouncementTemplate, 'id' | 'createdAt'>[] = [
  { name: 'New Item Alert', titlePrefix: '[New Item] ', messageTemplate: '', icon: 'mdi:package-variant', color: '#3b82f6', isBuiltIn: true },
  { name: 'Maintenance Notice', titlePrefix: '[Maintenance] ', messageTemplate: '', icon: 'mdi:wrench', color: '#f59e0b', isBuiltIn: true },
  { name: 'Low Stock Warning', titlePrefix: '[Low Stock] ', messageTemplate: '', icon: 'mdi:alert-outline', color: '#ef4444', isBuiltIn: true },
  { name: 'Security Alert', titlePrefix: '[Security] ', messageTemplate: '', icon: 'mdi:shield-alert', color: '#dc2626', isBuiltIn: true },
  { name: 'General Update', titlePrefix: '[Update] ', messageTemplate: '', icon: 'mdi:information-outline', color: '#10b981', isBuiltIn: true },
];
