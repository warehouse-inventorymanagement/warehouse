#!/usr/bin/env tsx
/**
 * CLI Tool: Password Reset
 *
 * Usage:
 *   npm run cli:reset-password -- --username <user> --password <newpass>
 *   npm run cli:reset-password -- --email <email> --password <newpass>
 *   npm run cli:reset-password -- --username <user> --generate
 *   npm run cli:reset-password -- --list
 *
 * Options:
 *   --username <user>   Find user by username
 *   --email <email>     Find user by email
 *   --password <pass>   Set this password (min 8 chars)
 *   --generate          Generate a random secure password
 *   --list              List all users
 *   --help              Show this help
 */

import 'dotenv/config';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import prisma from '../lib/prisma.js';

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message: string, color: string = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function logError(message: string) {
  console.error(`${colors.red}Error: ${message}${colors.reset}`);
}

function logSuccess(message: string) {
  console.log(`${colors.green}${message}${colors.reset}`);
}

function showHelp() {
  console.log(`
${colors.bright}Warehouse Password Reset CLI${colors.reset}

${colors.cyan}Usage:${colors.reset}
  npm run cli:reset-password -- [options]

${colors.cyan}Options:${colors.reset}
  --username <user>   Find user by username
  --email <email>     Find user by email
  --password <pass>   Set this password (minimum 8 characters)
  --generate          Generate a random secure password
  --list              List all users
  --help              Show this help message

${colors.cyan}Examples:${colors.reset}
  ${colors.yellow}# Reset password for warehouse user${colors.reset}
  npm run cli:reset-password -- --username warehouse --password NewPass123!

  ${colors.yellow}# Reset password by email${colors.reset}
  npm run cli:reset-password -- --email admin@warehouse.local --password NewPass123!

  ${colors.yellow}# Generate random password${colors.reset}
  npm run cli:reset-password -- --username warehouse --generate

  ${colors.yellow}# List all users${colors.reset}
  npm run cli:reset-password -- --list
`);
}

function parseArgs(args: string[]): Record<string, string | boolean> {
  const parsed: Record<string, string | boolean> = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      const nextArg = args[i + 1];

      // Check if next arg is a value (not another flag)
      if (nextArg && !nextArg.startsWith('--')) {
        parsed[key] = nextArg;
        i++; // Skip the value
      } else {
        parsed[key] = true; // Flag without value
      }
    }
  }

  return parsed;
}

function generateSecurePassword(length: number = 16): string {
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
  const randomBytes = crypto.randomBytes(length);
  let password = '';

  for (let i = 0; i < length; i++) {
    password += charset[randomBytes[i] % charset.length];
  }

  return password;
}

async function listUsers() {
  log('\nFetching users...', colors.cyan);

  const users = await prisma.user.findMany({
    select: {
      id: true,
      username: true,
      email: true,
      isActive: true,
      ldapDn: true,
      createdAt: true,
      role: {
        select: { name: true }
      }
    },
    orderBy: { username: 'asc' }
  });

  if (users.length === 0) {
    log('No users found.', colors.yellow);
    return;
  }

  console.log(`\n${colors.bright}Users (${users.length} total):${colors.reset}\n`);
  console.log('  %-20s %-30s %-10s %-10s %s', 'USERNAME', 'EMAIL', 'ROLE', 'STATUS', 'TYPE');
  console.log('  ' + '-'.repeat(90));

  for (const user of users) {
    const status = user.isActive ? `${colors.green}Active${colors.reset}` : `${colors.red}Inactive${colors.reset}`;
    const type = user.ldapDn ? `${colors.blue}LDAP${colors.reset}` : 'Local';
    const role = user.role?.name || 'None';

    console.log(`  %-20s %-30s %-10s %-19s %s`,
      user.username,
      user.email,
      role,
      status,
      type
    );
  }
  console.log();
}

async function resetPassword(username?: string, email?: string, password?: string, generate?: boolean) {
  // Find user
  let user;

  if (username) {
    user = await prisma.user.findUnique({
      where: { username },
      include: { role: { select: { name: true } } }
    });
  } else if (email) {
    user = await prisma.user.findUnique({
      where: { email },
      include: { role: { select: { name: true } } }
    });
  }

  if (!user) {
    logError(`User not found: ${username || email}`);
    log('\nTip: Use --list to see all users', colors.yellow);
    process.exit(1);
  }

  // Check if LDAP-only user
  if (user.ldapDn && !user.passwordHash) {
    logError(`User "${user.username}" is an LDAP-only user. Password must be changed in LDAP/Active Directory.`);
    process.exit(1);
  }

  // Determine password
  let newPassword: string;

  if (generate) {
    newPassword = generateSecurePassword(16);
    log(`\nGenerated password: ${colors.bright}${colors.yellow}${newPassword}${colors.reset}`);
    log('(Save this password - it will not be shown again)', colors.cyan);
  } else if (password) {
    newPassword = password;
  } else {
    logError('Must provide --password or --generate');
    process.exit(1);
  }

  // Validate password length
  if (newPassword.length < 8) {
    logError('Password must be at least 8 characters');
    process.exit(1);
  }

  // Hash password
  log('\nHashing password...', colors.cyan);
  const passwordHash = await bcrypt.hash(newPassword, 12);

  // Update user
  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash,
      resetToken: null,      // Clear any existing reset token
      resetTokenExp: null,   // Clear reset token expiry
    }
  });

  console.log();
  logSuccess('Password reset successfully!');
  console.log();
  log(`  User:     ${colors.bright}${user.username}${colors.reset}`);
  log(`  Email:    ${user.email}`);
  log(`  Role:     ${user.role?.name || 'None'}`);

  if (!generate) {
    log(`\n  You can now login with the new password.`);
  }
  console.log();
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  // Show help
  if (args.help || Object.keys(args).length === 0) {
    showHelp();
    process.exit(0);
  }

  try {
    // List users
    if (args.list) {
      await listUsers();
      process.exit(0);
    }

    // Reset password
    const username = typeof args.username === 'string' ? args.username : undefined;
    const email = typeof args.email === 'string' ? args.email : undefined;
    const password = typeof args.password === 'string' ? args.password : undefined;
    const generate = args.generate === true;

    if (!username && !email) {
      logError('Must provide --username or --email');
      process.exit(1);
    }

    if (!password && !generate) {
      logError('Must provide --password or --generate');
      process.exit(1);
    }

    await resetPassword(username, email, password, generate);

  } catch (error: any) {
    logError(error.message || 'An unexpected error occurred');
    if (process.env.DEBUG) {
      console.error(error);
    }
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
