import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { hashPassword } from './auth.js';

let DB_FILE = path.join(process.cwd(), 'data/db.json');

// In-memory data store structure
let state = {
  users: [],
  sessions: {},
  orders: []
};

/**
 * Atomic write to disk to prevent corrupted JSON states
 */
function persist() {
  try {
    const dir = path.dirname(DB_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const tempFile = `${DB_FILE}.${crypto.randomBytes(4).toString('hex')}.tmp`;
    fs.writeFileSync(tempFile, JSON.stringify(state, null, 2), 'utf8');
    fs.renameSync(tempFile, DB_FILE);
  } catch (err) {
    console.error('Database persist error:', err);
  }
}

/**
 * Initializes database from disk or creates initial seed
 * @param {string} [customPath]
 */
export function initDatabase(customPath = null) {
  if (customPath) {
    DB_FILE = customPath;
  }
  const dir = path.dirname(DB_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  if (fs.existsSync(DB_FILE)) {
    try {
      const content = fs.readFileSync(DB_FILE, 'utf8');
      state = JSON.parse(content);
      if (!state.users) state.users = [];
      if (!state.sessions) state.sessions = {};
      if (!state.orders) state.orders = [];
      return;
    } catch {
      // Corrupt file, re-initialize
    }
  }

  // Seed default Senior Excel Architect
  state = {
    users: [],
    sessions: {},
    orders: []
  };

  const defaultAdminPass = process.env.ADMIN_PASSWORD || 'SeniorArchitect2026!';
  const { salt, hash } = hashPassword(defaultAdminPass);

  state.users.push({
    id: 'arch-primary-01',
    name: 'Senior Excel Architect',
    email: 'architect@sheetfix.dev',
    role: 'architect',
    salt,
    passwordHash: hash,
    createdAt: new Date().toISOString()
  });

  persist();
}

// Auto-initialize default DB
initDatabase();

export const db = {
  /**
   * Find user by email (case-insensitive)
   */
  findUserByEmail(email) {
    if (!email || typeof email !== 'string') return null;
    const normalized = email.trim().toLowerCase();
    return state.users.find(u => u.email.toLowerCase() === normalized) || null;
  },

  /**
   * Find user by ID
   */
  findUserById(id) {
    if (!id) return null;
    return state.users.find(u => u.id === id) || null;
  },

  /**
   * Create a new user (role: 'client' or 'architect')
   */
  createUser({ name, email, password, role = 'client' }) {
    if (!email || !password || !name) {
      throw new Error('Name, email, and password are required');
    }
    const normalizedEmail = email.trim().toLowerCase();
    if (this.findUserByEmail(normalizedEmail)) {
      throw new Error('Email is already registered');
    }
    if (password.length < 8) {
      throw new Error('Password must be at least 8 characters');
    }

    const { salt, hash } = hashPassword(password);
    const user = {
      id: `usr-${crypto.randomUUID()}`,
      name: name.trim().slice(0, 80),
      email: normalizedEmail,
      role: role === 'architect' ? 'architect' : 'client',
      salt,
      passwordHash: hash,
      createdAt: new Date().toISOString()
    };

    state.users.push(user);
    persist();

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt
    };
  },

  /**
   * Create a secure 256-bit session token with 24-hour expiry
   */
  createSession(userId, role) {
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = Date.now() + 24 * 60 * 60 * 1000; // 24 hours

    state.sessions[token] = {
      token,
      userId,
      role,
      expiresAt
    };
    persist();
    return token;
  },

  /**
   * Retrieve active session (validates expiration)
   */
  getSession(token) {
    if (!token || typeof token !== 'string') return null;
    const session = state.sessions[token];
    if (!session) return null;

    if (Date.now() > session.expiresAt) {
      delete state.sessions[token];
      persist();
      return null;
    }
    return session;
  },

  /**
   * Revoke session on logout
   */
  deleteSession(token) {
    if (token && state.sessions[token]) {
      delete state.sessions[token];
      persist();
    }
  },

  /**
   * Create an architecture intake order ticket
   */
  createOrder({ userId, clientName, clientEmail, architectureTier, fileCount = 1, notes = '' }) {
    const orderNum = Math.floor(1000 + Math.random() * 9000);
    const order = {
      id: `SF-${orderNum}`,
      userId,
      clientName: (clientName || '').trim().slice(0, 80),
      clientEmail: (clientEmail || '').trim().toLowerCase().slice(0, 100),
      architectureTier: architectureTier || 'Core Spreadsheet Architecture',
      fileCount: Math.min(Math.max(parseInt(fileCount, 10) || 1, 1), 50),
      notes: (notes || '').trim().slice(0, 1000),
      status: 'Audit Queued', // Audit Queued -> Refactoring -> Security QA -> Delivered
      ndaSigned: true,
      sha256Checksum: null,
      createdAt: new Date().toISOString()
    };

    state.orders.push(order);
    persist();
    return order;
  },

  /**
   * Client-scoped orders
   */
  getOrdersByUser(userId) {
    return state.orders
      .filter(o => o.userId === userId)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  },

  /**
   * Architect-scoped: all orders
   */
  getAllOrders() {
    return [...state.orders].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  },

  /**
   * Update workflow status and attach deliverable checksum
   */
  updateOrderStatus(orderId, status, sha256Checksum = null) {
    const order = state.orders.find(o => o.id === orderId);
    if (!order) return null;

    if (status) order.status = status;
    if (sha256Checksum) order.sha256Checksum = sha256Checksum;
    order.updatedAt = new Date().toISOString();

    persist();
    return order;
  }
};
