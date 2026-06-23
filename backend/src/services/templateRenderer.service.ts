import prisma from '../lib/prisma.js';
import { DEFAULT_EMAIL_TEMPLATES } from '../data/defaultEmailTemplates.js';
import type { EmailTemplateDefinition, NotificationTemplateSet } from '../data/defaultEmailTemplates.js';

/**
 * Replace {{variable}} placeholders in a template string with values from a data map.
 * Unrecognized placeholders are left as-is.
 */
export function renderTemplate(template: string, data: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return key in data ? data[key] : match;
  });
}

/**
 * Get the effective template for a notification type + variant.
 * Checks the Setting table for a custom override; falls back to the default.
 */
export async function getEffectiveTemplate(
  type: string,
  variant: 'immediate' | 'digest'
): Promise<{ subject: string; html: string; isCustom: boolean }> {
  const defaultSet = DEFAULT_EMAIL_TEMPLATES[type] as NotificationTemplateSet | undefined;
  const defaultTemplate = defaultSet?.[variant] as EmailTemplateDefinition | undefined;

  if (!defaultTemplate) {
    throw new Error(`No default template found for ${type}/${variant}`);
  }

  const htmlKey = `notification.template.${type}.${variant}`;
  const subjectKey = `notification.template.${type}.subject.${variant}`;

  const [customHtml, customSubject] = await Promise.all([
    prisma.setting.findUnique({ where: { key: htmlKey } }),
    prisma.setting.findUnique({ where: { key: subjectKey } }),
  ]);

  return {
    subject: customSubject?.value ?? defaultTemplate.subject,
    html: customHtml?.value ?? defaultTemplate.html,
    isCustom: !!(customHtml || customSubject),
  };
}

/**
 * Get full template info for a notification type (both variants),
 * including variables, sample data, and custom status.
 * Used by the API to populate the template editor.
 */
export async function getTemplateInfo(type: string): Promise<NotificationTemplateSet & {
  immediate?: { isCustom: boolean };
  digest?: { isCustom: boolean };
}> {
  const defaultSet = DEFAULT_EMAIL_TEMPLATES[type];
  if (!defaultSet) {
    throw new Error(`Unknown notification type: ${type}`);
  }

  const result: Record<string, any> = {};

  for (const variant of ['immediate', 'digest'] as const) {
    const def = defaultSet[variant];
    if (!def) continue;

    const { subject, html, isCustom } = await getEffectiveTemplate(type, variant);

    result[variant] = {
      subject,
      html,
      isCustom,
      variables: def.variables,
      sampleData: def.sampleData,
    };
  }

  return result as any;
}

/**
 * Save a custom template override for a notification type + variant.
 */
export async function saveCustomTemplate(
  type: string,
  variant: 'immediate' | 'digest',
  subject: string,
  html: string
): Promise<void> {
  const defaultSet = DEFAULT_EMAIL_TEMPLATES[type];
  if (!defaultSet?.[variant]) {
    throw new Error(`No template variant ${variant} for type ${type}`);
  }

  const htmlKey = `notification.template.${type}.${variant}`;
  const subjectKey = `notification.template.${type}.subject.${variant}`;

  await Promise.all([
    prisma.setting.upsert({
      where: { key: htmlKey },
      update: { value: html },
      create: { key: htmlKey, value: html },
    }),
    prisma.setting.upsert({
      where: { key: subjectKey },
      update: { value: subject },
      create: { key: subjectKey, value: subject },
    }),
  ]);
}

/**
 * Revert a custom template to default by deleting the Setting rows.
 */
export async function revertTemplate(
  type: string,
  variant: 'immediate' | 'digest'
): Promise<void> {
  const htmlKey = `notification.template.${type}.${variant}`;
  const subjectKey = `notification.template.${type}.subject.${variant}`;

  await prisma.setting.deleteMany({
    where: {
      key: { in: [htmlKey, subjectKey] },
    },
  });
}
