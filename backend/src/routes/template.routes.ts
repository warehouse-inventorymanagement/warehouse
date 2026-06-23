import { Router, Response } from 'express';
import { authenticate, requirePermission, AuthRequest } from '../middleware/auth.middleware.js';
import { AppError } from '../middleware/error.middleware.js';
import { PERMISSIONS } from '../constants/permissions.js';
import { createAuditLog, getChanges } from '../services/audit.service.js';
import { DEFAULT_TEMPLATES, getDefaultTemplate } from '../data/defaultTemplates.js';
import prisma from '../lib/prisma.js';

const router = Router();

// Get all templates
router.get('/', authenticate, requirePermission(PERMISSIONS.TEMPLATES_READ), async (req: AuthRequest, res: Response, next) => {
  try {
    const active = req.query.active === 'true';
    const where = active ? { isActive: true } : {};

    const templates = await prisma.itemTemplate.findMany({
      where,
      include: {
        parent: { select: { id: true, name: true } },
        fields: { orderBy: { sortOrder: 'asc' } },
        suggestedItems: {
          include: {
            suggestedTemplate: {
              select: { id: true, name: true, icon: true, iconColor: true }
            }
          },
          orderBy: { sortOrder: 'asc' }
        },
        _count: { select: { items: true } }
      },
      orderBy: { name: 'asc' }
    });

    res.json({
      data: templates.map(t => ({
        ...t,
        itemCount: t._count.items,
        _count: undefined
      }))
    });
  } catch (error) {
    next(error);
  }
});

// Get single template
router.get('/:id', authenticate, requirePermission(PERMISSIONS.TEMPLATES_READ), async (req: AuthRequest, res: Response, next) => {
  try {
    const id = req.params.id as string;
    const template = await prisma.itemTemplate.findUnique({
      where: { id },
      include: {
        fields: { orderBy: { sortOrder: 'asc' } },
        suggestedItems: {
          include: {
            suggestedTemplate: {
              select: { id: true, name: true, icon: true, iconColor: true, description: true }
            }
          },
          orderBy: { sortOrder: 'asc' }
        },
        _count: { select: { items: true } }
      }
    });

    if (!template) {
      throw new AppError('Template not found', 404);
    }

    res.json({
      data: {
        ...template,
        itemCount: (template as any)._count.items,
        _count: undefined
      }
    });
  } catch (error) {
    next(error);
  }
});

// Create template
router.post('/', authenticate, requirePermission(PERMISSIONS.TEMPLATES_CREATE), async (req: AuthRequest, res: Response, next) => {
  try {
    const { name, description, icon, iconColor, iconBackgroundColor, isActive, parentId } = req.body;

    if (!name) {
      throw new AppError('Template name is required', 400);
    }

    const template = await prisma.itemTemplate.create({
      data: {
        name,
        description,
        icon,
        iconColor,
        iconBackgroundColor,
        isActive: isActive !== false,
        ...(parentId && { parentId }),
      },
      include: {
        fields: true,
        suggestedItems: {
          include: {
            suggestedTemplate: {
              select: { id: true, name: true, icon: true }
            }
          }
        }
      }
    });

    await createAuditLog({
      userId: req.user!.id,
      action: 'CREATE',
      entityType: 'template',
      entityId: template.id,
      entityName: template.name,
      req
    });

    res.status(201).json({ data: template });
  } catch (error: any) {
    if (error.code === 'P2002') {
      return next(new AppError('A template with this name already exists', 400));
    }
    next(error);
  }
});

// Update template
router.put('/:id', authenticate, requirePermission(PERMISSIONS.TEMPLATES_UPDATE), async (req: AuthRequest, res: Response, next) => {
  try {
    const id = req.params.id as string;
    const { name, description, icon, iconColor, iconBackgroundColor, isActive } = req.body;

    const existing = await prisma.itemTemplate.findUnique({
      where: { id }
    });

    if (!existing) {
      throw new AppError('Template not found', 404);
    }

    const template = await prisma.itemTemplate.update({
      where: { id },
      data: {
        name,
        description,
        icon,
        iconColor,
        iconBackgroundColor,
        isActive
      },
      include: {
        fields: { orderBy: { sortOrder: 'asc' } },
        suggestedItems: {
          include: {
            suggestedTemplate: {
              select: { id: true, name: true, icon: true }
            }
          }
        }
      }
    });

    const changes = getChanges(existing, template, ['name', 'description', 'icon', 'iconColor', 'iconBackgroundColor', 'isActive']);
    if (changes) {
      await createAuditLog({
        userId: req.user!.id,
        action: 'UPDATE',
        entityType: 'template',
        entityId: template.id,
        entityName: template.name,
        changes,
        req
      });
    }

    res.json({ data: template });
  } catch (error: any) {
    if (error.code === 'P2002') {
      return next(new AppError('A template with this name already exists', 400));
    }
    next(error);
  }
});

// Delete template
router.delete('/:id', authenticate, requirePermission(PERMISSIONS.TEMPLATES_DELETE), async (req: AuthRequest, res: Response, next) => {
  try {
    const id = req.params.id as string;
    const template = await prisma.itemTemplate.findUnique({
      where: { id },
      include: {
        _count: { select: { items: true } }
      }
    });

    if (!template) {
      throw new AppError('Template not found', 404);
    }

    if ((template as any)._count.items > 0) {
      throw new AppError(`Cannot delete template with ${(template as any)._count.items} items using it`, 400);
    }

    if (template.isStarter) {
      throw new AppError('Cannot delete starter templates', 400);
    }

    await prisma.itemTemplate.delete({
      where: { id }
    });

    await createAuditLog({
      userId: req.user!.id,
      action: 'DELETE',
      entityType: 'template',
      entityId: template.id,
      entityName: template.name,
      req
    });

    res.json({ message: 'Template deleted successfully' });
  } catch (error) {
    next(error);
  }
});

// Update field groups for template
router.put('/:id/field-groups', authenticate, requirePermission(PERMISSIONS.TEMPLATES_UPDATE), async (req: AuthRequest, res: Response, next) => {
  try {
    const id = req.params.id as string;
    const { fieldGroups } = req.body;

    if (!Array.isArray(fieldGroups)) {
      throw new AppError('fieldGroups must be an array', 400);
    }

    const template = await prisma.itemTemplate.findUnique({ where: { id } });
    if (!template) {
      throw new AppError('Template not found', 404);
    }

    const updated = await prisma.itemTemplate.update({
      where: { id },
      data: { fieldGroups: JSON.stringify(fieldGroups) },
    });

    res.json({ data: { fieldGroups: JSON.parse(updated.fieldGroups || '[]') } });
  } catch (error) {
    next(error);
  }
});

// Add field to template
router.post('/:id/fields', authenticate, requirePermission(PERMISSIONS.TEMPLATES_UPDATE), async (req: AuthRequest, res: Response, next) => {
  try {
    const id = req.params.id as string;
    const {
      fieldName, fieldType, isRequired, defaultValue, options, unitType, unitOptions, sortOrder,
      fieldGroup, placeholder, helpText, prefix, suffix, minValue, maxValue, pattern, showCondition
    } = req.body;

    if (!fieldName) {
      throw new AppError('Field name is required', 400);
    }

    const template = await prisma.itemTemplate.findUnique({
      where: { id }
    });

    if (!template) {
      throw new AppError('Template not found', 404);
    }

    const field = await prisma.itemTemplateField.create({
      data: {
        templateId: id,
        fieldName,
        fieldType: fieldType || 'text',
        isRequired: isRequired || false,
        defaultValue,
        options: options ? JSON.stringify(options) : null,
        unitType,
        unitOptions: unitOptions ? JSON.stringify(unitOptions) : null,
        sortOrder: sortOrder || 0,
        fieldGroup,
        placeholder,
        helpText,
        prefix,
        suffix,
        minValue: minValue !== undefined ? parseFloat(minValue) : null,
        maxValue: maxValue !== undefined ? parseFloat(maxValue) : null,
        pattern,
        showCondition: showCondition ? JSON.stringify(showCondition) : null,
      }
    });

    await createAuditLog({
      userId: req.user!.id,
      action: 'UPDATE',
      entityType: 'template',
      entityId: template.id,
      entityName: template.name,
      changes: JSON.stringify({ fields: { added: fieldName } }),
      req
    });

    res.status(201).json({ data: field });
  } catch (error: any) {
    if (error.code === 'P2002') {
      return next(new AppError('A field with this name already exists in the template', 400));
    }
    next(error);
  }
});

// Update field
router.put('/:id/fields/:fieldId', authenticate, requirePermission(PERMISSIONS.TEMPLATES_UPDATE), async (req: AuthRequest, res: Response, next) => {
  try {
    const templateId = req.params.id as string;
    const fieldId = req.params.fieldId as string;
    const {
      fieldName, fieldType, isRequired, defaultValue, options, unitType, unitOptions, sortOrder,
      fieldGroup, placeholder, helpText, prefix, suffix, minValue, maxValue, pattern, showCondition
    } = req.body;

    const existing = await prisma.itemTemplateField.findUnique({
      where: { id: fieldId }
    });

    if (!existing || existing.templateId !== templateId) {
      throw new AppError('Field not found', 404);
    }

    const field = await prisma.itemTemplateField.update({
      where: { id: fieldId },
      data: {
        fieldName,
        fieldType,
        isRequired,
        defaultValue,
        options: options !== undefined ? (options ? JSON.stringify(options) : null) : undefined,
        unitType,
        unitOptions: unitOptions !== undefined ? (unitOptions ? JSON.stringify(unitOptions) : null) : undefined,
        sortOrder,
        fieldGroup,
        placeholder,
        helpText,
        prefix,
        suffix,
        minValue: minValue !== undefined ? (minValue !== null ? parseFloat(minValue) : null) : undefined,
        maxValue: maxValue !== undefined ? (maxValue !== null ? parseFloat(maxValue) : null) : undefined,
        pattern,
        showCondition: showCondition !== undefined ? (showCondition ? JSON.stringify(showCondition) : null) : undefined,
      }
    });

    res.json({ data: field });
  } catch (error: any) {
    if (error.code === 'P2002') {
      return next(new AppError('A field with this name already exists in the template', 400));
    }
    next(error);
  }
});

// Delete field
router.delete('/:id/fields/:fieldId', authenticate, requirePermission(PERMISSIONS.TEMPLATES_UPDATE), async (req: AuthRequest, res: Response, next) => {
  try {
    const templateId = req.params.id as string;
    const fieldId = req.params.fieldId as string;
    const field = await prisma.itemTemplateField.findUnique({
      where: { id: fieldId }
    });

    if (!field || field.templateId !== templateId) {
      throw new AppError('Field not found', 404);
    }

    await prisma.itemTemplateField.delete({
      where: { id: fieldId }
    });

    res.json({ message: 'Field deleted successfully' });
  } catch (error) {
    next(error);
  }
});

// Add suggested sub-item template
router.post('/:id/suggested', authenticate, requirePermission(PERMISSIONS.TEMPLATES_UPDATE), async (req: AuthRequest, res: Response, next) => {
  try {
    const id = req.params.id as string;
    const { suggestedTemplateId, description, quantityRequired, sortOrder } = req.body;

    if (!suggestedTemplateId) {
      throw new AppError('Suggested template ID is required', 400);
    }

    if (suggestedTemplateId === id) {
      throw new AppError('Template cannot suggest itself', 400);
    }

    const template = await prisma.itemTemplate.findUnique({
      where: { id }
    });

    if (!template) {
      throw new AppError('Template not found', 404);
    }

    const suggestedTemplate = await prisma.itemTemplate.findUnique({
      where: { id: suggestedTemplateId }
    });

    if (!suggestedTemplate) {
      throw new AppError('Suggested template not found', 404);
    }

    const suggestion = await prisma.itemTemplateSuggestedSubItem.create({
      data: {
        templateId: id,
        suggestedTemplateId,
        description,
        quantityRequired: quantityRequired || 1,
        sortOrder: sortOrder || 0
      },
      include: {
        suggestedTemplate: {
          select: { id: true, name: true, icon: true }
        }
      }
    });

    res.status(201).json({ data: suggestion });
  } catch (error: any) {
    if (error.code === 'P2002') {
      return next(new AppError('This template is already suggested', 400));
    }
    next(error);
  }
});

// Remove suggested sub-item
router.delete('/:id/suggested/:suggestedId', authenticate, requirePermission(PERMISSIONS.TEMPLATES_UPDATE), async (req: AuthRequest, res: Response, next) => {
  try {
    const templateId = req.params.id as string;
    const suggestedId = req.params.suggestedId as string;
    const suggestion = await prisma.itemTemplateSuggestedSubItem.findUnique({
      where: { id: suggestedId }
    });

    if (!suggestion || suggestion.templateId !== templateId) {
      throw new AppError('Suggestion not found', 404);
    }

    await prisma.itemTemplateSuggestedSubItem.delete({
      where: { id: suggestedId }
    });

    res.json({ message: 'Suggestion removed successfully' });
  } catch (error) {
    next(error);
  }
});

// Duplicate a template
router.post('/:id/duplicate', authenticate, requirePermission(PERMISSIONS.TEMPLATES_CREATE), async (req: AuthRequest, res: Response, next) => {
  try {
    const id = req.params.id as string;
    const { name: customName } = req.body;

    const original = await prisma.itemTemplate.findUnique({
      where: { id },
      include: {
        fields: { orderBy: { sortOrder: 'asc' } },
        suggestedItems: true
      }
    });

    if (!original) {
      throw new AppError('Template not found', 404);
    }

    // Generate unique name
    let newName = customName || `${original.name} (Copy)`;
    let counter = 1;

    // Check if name exists and add number if needed
    while (true) {
      const existing = await prisma.itemTemplate.findUnique({
        where: { name: newName }
      });
      if (!existing) break;
      counter++;
      newName = customName ? `${customName} (${counter})` : `${original.name} (Copy ${counter})`;
    }

    // Create duplicate template with all fields and suggestions
    const duplicate = await prisma.itemTemplate.create({
      data: {
        name: newName,
        description: original.description,
        icon: original.icon,
        iconColor: original.iconColor,
        iconBackgroundColor: original.iconBackgroundColor,
        isActive: true,
        isStarter: false, // Duplicates are never starter templates
        fields: {
          create: original.fields.map(f => ({
            fieldName: f.fieldName,
            fieldType: f.fieldType,
            isRequired: f.isRequired,
            defaultValue: f.defaultValue,
            options: f.options,
            unitType: f.unitType,
            unitOptions: f.unitOptions,
            sortOrder: f.sortOrder,
            fieldGroup: f.fieldGroup,
            placeholder: f.placeholder,
            helpText: f.helpText,
            prefix: f.prefix,
            suffix: f.suffix,
            minValue: f.minValue,
            maxValue: f.maxValue,
            pattern: f.pattern
          }))
        },
        suggestedItems: {
          create: original.suggestedItems.map(s => ({
            suggestedTemplateId: s.suggestedTemplateId,
            description: s.description,
            quantityRequired: s.quantityRequired,
            sortOrder: s.sortOrder
          }))
        }
      },
      include: {
        fields: { orderBy: { sortOrder: 'asc' } },
        suggestedItems: {
          include: {
            suggestedTemplate: {
              select: { id: true, name: true, icon: true, iconColor: true }
            }
          }
        }
      }
    });

    await createAuditLog({
      userId: req.user!.id,
      action: 'CREATE',
      entityType: 'template',
      entityId: duplicate.id,
      entityName: duplicate.name,
      changes: JSON.stringify({ duplicatedFrom: original.name }),
      req
    });

    res.status(201).json({
      success: true,
      data: duplicate,
      message: `Template duplicated as "${newName}"`
    });
  } catch (error: any) {
    if (error.code === 'P2002') {
      return next(new AppError('A template with this name already exists', 400));
    }
    next(error);
  }
});

// Restore a starter template to its default configuration
router.post('/:id/restore', authenticate, requirePermission(PERMISSIONS.TEMPLATES_UPDATE), async (req: AuthRequest, res: Response, next) => {
  try {
    const id = req.params.id as string;

    const template = await prisma.itemTemplate.findUnique({
      where: { id },
      include: {
        fields: true,
        suggestedItems: true
      }
    });

    if (!template) {
      throw new AppError('Template not found', 404);
    }

    if (!template.isStarter) {
      throw new AppError('Only starter templates can be restored to defaults', 400);
    }

    // Find the default template definition
    const defaultTemplate = getDefaultTemplate(template.name);
    if (!defaultTemplate) {
      throw new AppError(`No default definition found for template "${template.name}"`, 400);
    }

    // Delete existing fields and suggestions
    await prisma.itemTemplateField.deleteMany({
      where: { templateId: id }
    });
    await prisma.itemTemplateSuggestedSubItem.deleteMany({
      where: { templateId: id }
    });

    // Update template properties and recreate fields
    const restored = await prisma.itemTemplate.update({
      where: { id },
      data: {
        description: defaultTemplate.description,
        icon: defaultTemplate.icon,
        iconColor: defaultTemplate.iconColor || null,
        iconBackgroundColor: defaultTemplate.iconBackgroundColor || null,
        isActive: true,
        fields: {
          create: defaultTemplate.fields.map(f => ({
            fieldName: f.fieldName,
            fieldType: f.fieldType,
            isRequired: f.isRequired || false,
            defaultValue: f.defaultValue || null,
            options: f.options ? JSON.stringify(f.options) : null,
            unitType: f.unitType || null,
            unitOptions: f.unitOptions ? JSON.stringify(f.unitOptions) : null,
            sortOrder: f.sortOrder,
            fieldGroup: f.fieldGroup || null,
            placeholder: f.placeholder || null,
            helpText: f.helpText || null,
            prefix: f.prefix || null,
            suffix: f.suffix || null,
            minValue: f.minValue ?? null,
            maxValue: f.maxValue ?? null,
            pattern: f.pattern || null
          }))
        }
      },
      include: {
        fields: { orderBy: { sortOrder: 'asc' } },
        suggestedItems: {
          include: {
            suggestedTemplate: {
              select: { id: true, name: true, icon: true, iconColor: true }
            }
          }
        }
      }
    });

    // Re-add suggestions (need to look up template IDs by name)
    if (defaultTemplate.suggests && defaultTemplate.suggests.length > 0) {
      for (let i = 0; i < defaultTemplate.suggests.length; i++) {
        const suggestedName = defaultTemplate.suggests[i];
        const suggestedTemplate = await prisma.itemTemplate.findUnique({
          where: { name: suggestedName }
        });

        if (suggestedTemplate) {
          await prisma.itemTemplateSuggestedSubItem.create({
            data: {
              templateId: id,
              suggestedTemplateId: suggestedTemplate.id,
              sortOrder: i
            }
          });
        }
      }
    }

    // Fetch the final result with suggestions
    const finalTemplate = await prisma.itemTemplate.findUnique({
      where: { id },
      include: {
        fields: { orderBy: { sortOrder: 'asc' } },
        suggestedItems: {
          include: {
            suggestedTemplate: {
              select: { id: true, name: true, icon: true, iconColor: true }
            }
          }
        }
      }
    });

    await createAuditLog({
      userId: req.user!.id,
      action: 'UPDATE',
      entityType: 'template',
      entityId: id,
      entityName: template.name,
      changes: JSON.stringify({ action: 'restored to defaults' }),
      req
    });

    res.json({
      success: true,
      data: finalTemplate,
      message: `Template "${template.name}" restored to defaults`
    });
  } catch (error) {
    next(error);
  }
});

// Get available default templates (for seeding info)
router.get('/defaults/available', authenticate, requirePermission(PERMISSIONS.TEMPLATES_READ), async (req: AuthRequest, res: Response, next) => {
  try {
    // Get existing template names
    const existingTemplates = await prisma.itemTemplate.findMany({
      select: { name: true, isStarter: true }
    });
    const existingNames = new Set(existingTemplates.map(t => t.name));

    const availableTemplates = DEFAULT_TEMPLATES.map(dt => ({
      name: dt.name,
      description: dt.description,
      icon: dt.icon,
      iconColor: dt.iconColor,
      fieldCount: dt.fields.length,
      exists: existingNames.has(dt.name),
      isStarter: existingTemplates.find(t => t.name === dt.name)?.isStarter || false
    }));

    res.json({
      success: true,
      data: availableTemplates
    });
  } catch (error) {
    next(error);
  }
});

// Seed starter templates (uses DEFAULT_TEMPLATES from defaultTemplates.ts)
router.post('/seed', authenticate, requirePermission(PERMISSIONS.TEMPLATES_CREATE), async (req: AuthRequest, res: Response, next) => {
  try {
    const created: string[] = [];
    const skipped: string[] = [];
    const templateIdMap: Record<string, string> = {};

    // First pass: create all templates without suggestions
    for (const templateData of DEFAULT_TEMPLATES) {
      const existing = await prisma.itemTemplate.findUnique({
        where: { name: templateData.name }
      });

      if (existing) {
        skipped.push(templateData.name);
        templateIdMap[templateData.name] = existing.id;
        continue;
      }

      const template = await prisma.itemTemplate.create({
        data: {
          name: templateData.name,
          description: templateData.description,
          icon: templateData.icon,
          iconColor: templateData.iconColor || null,
          iconBackgroundColor: templateData.iconBackgroundColor || null,
          isStarter: true,
          isActive: true,
          fields: {
            create: templateData.fields.map((f) => ({
              fieldName: f.fieldName,
              fieldType: f.fieldType,
              isRequired: f.isRequired || false,
              defaultValue: f.defaultValue || null,
              options: f.options ? JSON.stringify(f.options) : null,
              unitType: f.unitType || null,
              unitOptions: f.unitOptions ? JSON.stringify(f.unitOptions) : null,
              sortOrder: f.sortOrder,
              fieldGroup: f.fieldGroup || null,
              placeholder: f.placeholder || null,
              helpText: f.helpText || null,
              prefix: f.prefix || null,
              suffix: f.suffix || null,
              minValue: f.minValue ?? null,
              maxValue: f.maxValue ?? null,
              pattern: f.pattern || null
            }))
          }
        }
      });

      created.push(templateData.name);
      templateIdMap[templateData.name] = template.id;
    }

    // Second pass: add suggestions
    for (const templateData of DEFAULT_TEMPLATES) {
      if (templateData.suggests && templateData.suggests.length > 0) {
        const templateId = templateIdMap[templateData.name];

        for (let i = 0; i < templateData.suggests.length; i++) {
          const suggestedName = templateData.suggests[i];
          const suggestedId = templateIdMap[suggestedName];

          if (templateId && suggestedId) {
            // Check if suggestion already exists
            const existingSuggestion = await prisma.itemTemplateSuggestedSubItem.findUnique({
              where: {
                templateId_suggestedTemplateId: {
                  templateId,
                  suggestedTemplateId: suggestedId
                }
              }
            });

            if (!existingSuggestion) {
              await prisma.itemTemplateSuggestedSubItem.create({
                data: {
                  templateId,
                  suggestedTemplateId: suggestedId,
                  sortOrder: i
                }
              });
            }
          }
        }
      }
    }

    res.json({
      success: true,
      message: `Created ${created.length} templates, skipped ${skipped.length} existing`,
      data: { created, skipped }
    });
  } catch (error) {
    next(error);
  }
});

export default router;
