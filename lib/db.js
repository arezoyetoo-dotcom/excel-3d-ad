import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { hashPassword } from './auth.js';

let DB_FILE = path.join(process.cwd(), 'data/db.json');

// In-memory data store structure
let state = {
  users: [],
  sessions: {},
  orders: [],
  projects: []
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
      if (!state.projects) state.projects = [];
      if (state.projects.length === 0) seedInitialProjects();
      return;
    } catch {
      // Corrupt file, re-initialize
    }
  }

  // Seed default Senior Excel Architect
  state = {
    users: [],
    sessions: {},
    orders: [],
    projects: []
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

  seedInitialProjects();
  persist();
}

function seedInitialProjects() {
  if (state.projects && state.projects.length > 0) return;
  state.projects = [
    {
      id: 'EXCEL-8421',
      clientName: 'Julian Vance',
      clientEmail: 'julian@vancemodels.io',
      telegram: '@jvance_ny',
      projectTitle: 'Real Estate Multi-Family LBO & Waterfall Model',
      category: 'Financial Modeling',
      description: 'Dynamic 10-year cash flow model for a 240-unit property with 3 equity tiers, debt amortization, and automated sensitivity returns matrix.',
      offeredPrice: 850,
      turnaroundHours: 48,
      status: 'In Progress',
      adminNotes: 'Assigned to Senior Modeler. Modeling tier-3 IRR waterfall formulas with zero legacy circular references.',
      counterPrice: null,
      deliveryUrl: null,
      deliveryNotes: null,
      sha256Checksum: null,
      createdAt: new Date(Date.now() - 36 * 3600 * 1000).toISOString(),
      updatedAt: new Date(Date.now() - 12 * 3600 * 1000).toISOString()
    },
    {
      id: 'EXCEL-6319',
      clientName: 'Elena Rostova',
      clientEmail: 'elena@logistix-eu.com',
      telegram: '@elena_log',
      projectTitle: 'Automated Multi-Warehouse Inventory & Barcode VBA',
      category: 'VBA Automation',
      description: 'VBA macro that auto-syncs 6 warehouse CSV exports every morning, reconciles SKU variances, and triggers restock orders in under 5 seconds.',
      offeredPrice: 600,
      turnaroundHours: 24,
      status: 'Delivered',
      adminNotes: 'Delivered with 64-bit API compatibility and modular VBA scripts.',
      counterPrice: null,
      deliveryUrl: 'https://github.com/arezoyetoo-dotcom/excel-3d-ad/blob/main/README.md',
      deliveryNotes: 'Delivered complete inventory engine with 1-click batch sync and error logging.',
      sha256Checksum: '9e107d9d372bb6826bd81d3542a419d6dae1c4df234a974b7a13d7890f9c2d1b',
      createdAt: new Date(Date.now() - 72 * 3600 * 1000).toISOString(),
      updatedAt: new Date(Date.now() - 24 * 3600 * 1000).toISOString()
    },
    {
      id: 'EXCEL-9104',
      clientName: 'Marcus Sterling',
      clientEmail: 'm.sterling@sterlinggrowth.co',
      telegram: '@msterling',
      projectTitle: 'Executive C-Suite KPI Dashboard with Interactive Slicers',
      category: 'Interactive Dashboard',
      description: 'Clean obsidian dark mode dashboard synthesizing ARR, Churn, LTV:CAC, and Runway with dynamic fiscal year slicers and print-ready board PDF layout.',
      offeredPrice: 1200,
      turnaroundHours: 48,
      status: 'Pending Review',
      adminNotes: 'Under architecture review by Lead Architect.',
      counterPrice: null,
      deliveryUrl: null,
      deliveryNotes: null,
      sha256Checksum: null,
      createdAt: new Date(Date.now() - 4 * 3600 * 1000).toISOString(),
      updatedAt: new Date(Date.now() - 4 * 3600 * 1000).toISOString()
    }
  ];
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
  },

  /**
   * Create custom project offer ("say what you want & offer a price")
   */
  createProject({ clientName, clientEmail, telegram = '', projectTitle, category = 'Custom Excel System', description, offeredPrice, turnaroundHours = 48, userId = null }) {
    if (!projectTitle || !description || !clientEmail || !offeredPrice) {
      throw new Error('Project title, description, client email, and offered price are required');
    }

    const price = Math.max(10, parseInt(offeredPrice, 10) || 50);
    const hours = Math.max(12, parseInt(turnaroundHours, 10) || 48);
    const projNum = Math.floor(1000 + Math.random() * 9000);
    const id = `EXCEL-${projNum}`;

    const project = {
      id,
      userId,
      clientName: (clientName || 'Anonymous Client').trim().slice(0, 80),
      clientEmail: clientEmail.trim().toLowerCase().slice(0, 100),
      telegram: (telegram || '').trim().slice(0, 50),
      projectTitle: projectTitle.trim().slice(0, 120),
      category: category.trim().slice(0, 60),
      description: description.trim().slice(0, 2500),
      offeredPrice: price,
      turnaroundHours: hours,
      status: 'Pending Review', // 'Pending Review' | 'Accepted' | 'In Progress' | 'Countered' | 'Delivered'
      adminNotes: 'Awaiting review by Senior Excel Architect.',
      counterPrice: null,
      deliveryUrl: null,
      deliveryNotes: null,
      sha256Checksum: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    if (!state.projects) state.projects = [];
    state.projects.push(project);
    persist();
    return project;
  },

  /**
   * Get all projects (admin/architect view)
   */
  getAllProjects() {
    if (!state.projects) state.projects = [];
    return [...state.projects].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  },

  /**
   * Public feed of projects (sanitizes email for privacy)
   */
  getPublicProjects() {
    if (!state.projects) state.projects = [];
    return state.projects
      .map(p => {
        const parts = (p.clientEmail || '').split('@');
        const maskedEmail = parts.length === 2
          ? `${parts[0].slice(0, 2)}***@${parts[1]}`
          : 'client***@domain.com';

        return {
          id: p.id,
          clientName: p.clientName,
          maskedEmail,
          telegram: p.telegram ? `${p.telegram.slice(0, 3)}***` : '',
          projectTitle: p.projectTitle,
          category: p.category,
          description: p.description,
          offeredPrice: p.offeredPrice,
          turnaroundHours: p.turnaroundHours,
          status: p.status,
          adminNotes: p.adminNotes,
          counterPrice: p.counterPrice,
          deliveryUrl: p.deliveryUrl,
          deliveryNotes: p.deliveryNotes,
          createdAt: p.createdAt,
          updatedAt: p.updatedAt
        };
      })
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  },

  /**
   * Find project by ID
   */
  getProjectById(id) {
    if (!id || !state.projects) return null;
    return state.projects.find(p => p.id === id) || null;
  },

  /**
   * Admin updates project status / counter-offer / delivery
   */
  updateProjectAdminAction(id, { status, adminNotes, counterPrice, deliveryUrl, deliveryNotes, sha256Checksum }) {
    if (!state.projects) state.projects = [];
    const project = state.projects.find(p => p.id === id);
    if (!project) return null;

    if (status) project.status = status;
    if (adminNotes !== undefined) project.adminNotes = (adminNotes || '').trim().slice(0, 1000);
    if (counterPrice !== undefined && counterPrice !== null) {
      project.counterPrice = parseInt(counterPrice, 10) || null;
      if (project.counterPrice) project.status = 'Countered';
    }
    if (deliveryUrl !== undefined) project.deliveryUrl = (deliveryUrl || '').trim().slice(0, 500);
    if (deliveryNotes !== undefined) project.deliveryNotes = (deliveryNotes || '').trim().slice(0, 1500);
    if (sha256Checksum !== undefined) project.sha256Checksum = (sha256Checksum || '').trim().slice(0, 64);
    project.updatedAt = new Date().toISOString();

    persist();
    return project;
  },

  /**
   * Delete project
   */
  deleteProject(id) {
    if (!state.projects) return false;
    const initialLen = state.projects.length;
    state.projects = state.projects.filter(p => p.id !== id);
    if (state.projects.length !== initialLen) {
      persist();
      return true;
    }
    return false;
  }
};
