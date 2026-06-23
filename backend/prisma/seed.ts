import bcrypt from 'bcryptjs';
import prisma from '../src/lib/prisma.js';

const ALL_PERMISSIONS = [
  'items:create', 'items:read', 'items:update', 'items:delete',
  'categories:create', 'categories:read', 'categories:update', 'categories:delete',
  'locations:create', 'locations:read', 'locations:update', 'locations:delete', 'locations:barcode',
  'tags:create', 'tags:read', 'tags:update', 'tags:delete',
  'users:create', 'users:read', 'users:update', 'users:delete',
  'roles:create', 'roles:read', 'roles:update', 'roles:delete',
  'groups:create', 'groups:read', 'groups:update', 'groups:delete',
  'templates:create', 'templates:read', 'templates:update', 'templates:delete',
  'icons:read', 'icons:create', 'icons:update', 'icons:delete',
  'settings:read', 'settings:update',
  'audit:read',
  'quarantine:manage'
];

async function main() {
  console.log('Seeding database...');

  // Create Admin role
  const adminRole = await prisma.role.upsert({
    where: { name: 'Admin' },
    update: { permissions: ALL_PERMISSIONS },
    create: {
      name: 'Admin',
      description: 'Full system access',
      permissions: ALL_PERMISSIONS,
      isSystem: true
    }
  });
  console.log('Created/updated Admin role');

  // Create Manager role
  await prisma.role.upsert({
    where: { name: 'Manager' },
    update: {},
    create: {
      name: 'Manager',
      description: 'Manage inventory and users',
      permissions: [
        'items:create', 'items:read', 'items:update', 'items:delete',
        'categories:create', 'categories:read', 'categories:update', 'categories:delete',
        'locations:create', 'locations:read', 'locations:update', 'locations:delete', 'locations:barcode',
        'tags:create', 'tags:read', 'tags:update', 'tags:delete',
        'templates:read',
        'users:read',
        'groups:read',
        'audit:read'
      ],
      isSystem: true
    }
  });
  console.log('Created/updated Manager role');

  // Create User role
  await prisma.role.upsert({
    where: { name: 'User' },
    update: {},
    create: {
      name: 'User',
      description: 'Standard inventory access',
      permissions: [
        'items:create', 'items:read', 'items:update',
        'categories:read',
        'locations:read',
        'tags:read',
        'templates:read'
      ],
      isSystem: true
    }
  });
  console.log('Created/updated User role');

  // Create Viewer role
  await prisma.role.upsert({
    where: { name: 'Viewer' },
    update: {},
    create: {
      name: 'Viewer',
      description: 'Read-only access',
      permissions: [
        'items:read',
        'categories:read',
        'locations:read',
        'tags:read'
      ],
      isSystem: true
    }
  });
  console.log('Created/updated Viewer role');

  // Create default admin user (configurable via env vars)
  const adminUsername = process.env.ADMIN_USERNAME || 'warehouse';
  const adminPassword = process.env.ADMIN_PASSWORD || 'warehouse';
  const passwordHash = await bcrypt.hash(adminPassword, 10);

  await prisma.user.upsert({
    where: { username: adminUsername },
    update: {
      passwordHash,
      roleId: adminRole.id,
      isActive: true
    },
    create: {
      username: adminUsername,
      email: 'admin@warehouse.local',
      passwordHash,
      roleId: adminRole.id,
      isActive: true
    }
  });
  console.log(`Created/updated default admin user (${adminUsername})`);

  console.log('Database seeding completed!');
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
