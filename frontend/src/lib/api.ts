// API base URL - in dev uses Vite proxy, in production uses env variable
const API_BASE = import.meta.env.VITE_API_URL || '';

// ============================================================================
// Types - shared shape with backend (in real monorepo, these would be shared package)
// ============================================================================

export interface User {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export interface HealthResponse {
  status: string;
  message: string;
  database: string;
  timestamp: string;
}

// ============================================================================
// Token storage - localStorage abstraction
// ============================================================================

const TOKEN_KEY = 'splitmate_token';

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearStoredToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

// ============================================================================
// Custom error class - distinguishable from network/JS errors
// ============================================================================

export class ApiError extends Error {
  status: number;
  details?: unknown;

  constructor(status: number, details?: unknown, message?: string) {
    super(message ?? `API request failed with status ${status}`);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

// ============================================================================
// Core HTTP wrapper - handles auth, JSON, errors uniformly
// ============================================================================

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: unknown;
  requiresAuth?: boolean;
}

async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, requiresAuth = false } = options;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (requiresAuth) {
    const token = getStoredToken();
    if (!token) {
      throw new ApiError(401, undefined, 'No authentication token available');
    }
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  // Parse response body (may be JSON or empty)
  let data: unknown = null;
  const text = await response.text();
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  if (!response.ok) {
    const errorMessage =
      (data as { error?: string })?.error ?? `Request failed: ${response.status}`;
    throw new ApiError(response.status, data, errorMessage);
  }

  return data as T;
}

// ============================================================================
// Public API functions
// ============================================================================

/**
 * Check backend health and database connection.
 */
export async function fetchHealth(): Promise<HealthResponse> {
  return apiRequest<HealthResponse>('/api/health');
}

/**
 * Register a new user. Returns user + token.
 * Token is automatically stored in localStorage.
 */
export async function register(
  name: string,
  email: string,
  password: string
): Promise<AuthResponse> {
  const result = await apiRequest<AuthResponse>('/api/auth/register', {
    method: 'POST',
    body: { name, email, password },
  });
  setStoredToken(result.token);
  return result;
}

/**
 * Log in existing user. Returns user + token.
 * Token is automatically stored in localStorage.
 */
export async function login(email: string, password: string): Promise<AuthResponse> {
  const result = await apiRequest<AuthResponse>('/api/auth/login', {
    method: 'POST',
    body: { email, password },
  });
  setStoredToken(result.token);
  return result;
}

/**
 * Get current authenticated user.
 * Used on app load to restore session from stored token.
 */
export async function getMe(): Promise<{ user: User }> {
  return apiRequest<{ user: User }>('/api/auth/me', {
    requiresAuth: true,
  });
}

/**
 * Log out: clear token from storage.
 * Note: doesn't call backend (stateless JWT - no server-side session to invalidate).
 */
export function logout(): void {
  clearStoredToken();
}

// ============================================================================
// Group types
// ============================================================================

export interface GroupMember {
  id: string;
  name: string;
  email: string;
}

export interface Group {
  id: string;
  name: string;
  ownerId: string;
  memberIds: string[] | GroupMember[]; // strings in list view, populated in detail
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// Group API functions
// ============================================================================

/**
 * Create a new group. Current user becomes owner and first member.
 */
export async function createGroup(name: string): Promise<{ group: Group }> {
  return apiRequest<{ group: Group }>('/api/groups', {
    method: 'POST',
    body: { name },
    requiresAuth: true,
  });
}

/**
 * List all groups the current user is a member of.
 * memberIds is array of string IDs.
 */
export async function listGroups(): Promise<{ groups: Group[] }> {
  return apiRequest<{ groups: Group[] }>('/api/groups', {
    requiresAuth: true,
  });
}

/**
 * Get group details with populated members.
 * memberIds is array of GroupMember objects.
 */
export async function getGroup(groupId: string): Promise<{ group: Group }> {
  return apiRequest<{ group: Group }>(`/api/groups/${groupId}`, {
    requiresAuth: true,
  });
}

/**
 * Add a new member to the group by their email address.
 */
export async function addMember(
  groupId: string,
  email: string
): Promise<{ group: Group }> {
  return apiRequest<{ group: Group }>(`/api/groups/${groupId}/members`, {
    method: 'POST',
    body: { email },
    requiresAuth: true,
  });
}

/**
 * Delete a group. Only the owner can delete.
 */
export async function deleteGroup(groupId: string): Promise<void> {
  await apiRequest<void>(`/api/groups/${groupId}`, {
    method: 'DELETE',
    requiresAuth: true,
  });
}