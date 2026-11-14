import bcrypt from 'bcryptjs';
import { randomBytes } from 'node:crypto';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { User } from '../models/User.js';
import { makeFileRepository } from '../repositories/fileRepository.js';

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const invalid = (message, status = 400) => Object.assign(new Error(message), { status });
const secret = () => {
  if (process.env.AUTH_SECRET) return process.env.AUTH_SECRET;
  if (process.env.NODE_ENV === 'production') throw new Error('AUTH_SECRET must be configured in production.');
  return 'stableflow-local-demo-secret-change-before-deployment';
};

async function allUsers() {
  return mongoose.connection.readyState === 1 ? User.find().lean() : makeFileRepository('users').findAll();
}
async function byEmail(email) {
  const normalized = email.toLowerCase().trim();
  return mongoose.connection.readyState === 1
    ? User.findOne({ email: normalized })
    : (await makeFileRepository('users').findAll()).find((user) => user.email === normalized) || null;
}
async function addUser(user) {
  return mongoose.connection.readyState === 1 ? User.create(user) : makeFileRepository('users').create(user);
}
function publicUser(user) {
  return { id: String(user._id), name: user.name, email: user.email, role: user.role, staffId: user.staffId ? String(user.staffId) : null };
}
function issueToken(user) {
  return jwt.sign(publicUser(user), secret(), { expiresIn: '12h' });
}

async function createAccount({ name, email, password, role, staffId }) {
  if (!String(name || '').trim()) throw invalid('Name is required.');
  if (!emailPattern.test(String(email || '').trim())) throw invalid('Enter a valid email address.');
  if (typeof password !== 'string' || password.length < 8) throw invalid('Password must contain at least 8 characters.');
  if (await byEmail(email)) throw invalid('An account with this email already exists.', 409);
  if (staffId && !mongoose.isValidObjectId(staffId)) throw invalid('The staff profile link is invalid.');
  const passwordHash = await bcrypt.hash(password, 12);
  return addUser({ name: name.trim(), email: email.toLowerCase().trim(), passwordHash, role, staffId });
}

export async function authStatus() {
  return { needsSetup: (await allUsers()).length === 0 };
}

export async function setupManager(data) {
  if ((await allUsers()).length) throw invalid('Initial manager setup has already been completed.', 409);
  const user = await createAccount({ ...data, role: 'manager' });
  return { token: issueToken(user), user: publicUser(user) };
}

export async function login({ email, password }) {
  if (!email || !password) throw invalid('Email and password are required.');
  const user = await byEmail(email);
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) throw invalid('Email or password is incorrect.', 401);
  return { token: issueToken(user), user: publicUser(user) };
}

export async function createStaffAccount(data) {
  const user = await createAccount({ ...data, role: 'staff' });
  return publicUser(user);
}

export async function ensureDemoAccounts(staffRecord) {
  const credentials = [];
  const users = await allUsers();
  if (!users.some((user) => user.role === 'manager')) {
    const email = 'manager@stableflow.demo';
    const password = randomBytes(18).toString('base64url');
    await createAccount({ name: 'StableFlow Demo Manager', email, password, role: 'manager' });
    credentials.push({ role: 'manager', email, password });
  }

  const currentUsers = await allUsers();
  const linkedStaff = currentUsers.find((user) => user.role === 'staff' && String(user.staffId) === String(staffRecord._id));
  if (!linkedStaff) {
    const email = 'alex@stableflow.demo';
    const existingEmail = await byEmail(email);
    if (existingEmail) throw invalid(`The seed email ${email} is already used by a different account.`, 409);
    const password = randomBytes(18).toString('base64url');
    await createAccount({ name: staffRecord.name, email, password, role: 'staff', staffId: staffRecord._id });
    credentials.push({ role: 'staff', email, password });
  }
  return credentials;
}

export function verifyToken(token) {
  try { return jwt.verify(token, secret()); }
  catch { throw invalid('Your session has expired. Please sign in again.', 401); }
}
