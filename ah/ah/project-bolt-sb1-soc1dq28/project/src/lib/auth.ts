export type CampusRole = 'Admin' | 'Teacher' | 'Student';

export interface UserAccount {
  id: string;
  name: string;
  email: string;
  password?: string;
  role: CampusRole;
  department?: string;
  studentId?: string;
  semester?: number;
  designation?: string;
  specialization?: string;
  avatarColor?: string;
  createdAt: string;
}

const STORAGE_KEY_ACCOUNTS = 'smartcampus_accounts_v2';
const STORAGE_KEY_SESSION = 'smartcampus_session_v2';

export const DEFAULT_USERS: UserAccount[] = [
  {
    id: 'usr-admin-1',
    name: 'Dr. Evelyn Vance',
    email: 'admin@college.edu',
    password: 'password123',
    role: 'Admin',
    department: 'Institutional Administration',
    designation: 'Dean of Academic Analytics',
    avatarColor: 'from-amber-500 to-indigo-600',
    createdAt: new Date('2024-01-15').toISOString(),
  },
  {
    id: 'usr-teacher-1',
    name: 'Prof. Rajesh Sharma',
    email: 'prof.sharma@college.edu',
    password: 'password123',
    role: 'Teacher',
    department: 'Computer Science & Engineering',
    designation: 'Associate Professor & Student Mentor',
    avatarColor: 'from-blue-500 to-indigo-600',
    createdAt: new Date('2024-02-10').toISOString(),
  },
  {
    id: 'usr-student-1',
    name: 'Aarav Patel',
    email: 'aarav.stu1001@college.edu',
    password: 'password123',
    role: 'Student',
    department: 'Computer Science & Engineering',
    studentId: 'STU1001',
    semester: 6,
    avatarColor: 'from-emerald-500 to-teal-600',
    createdAt: new Date('2024-03-01').toISOString(),
  },
];

export function getStoredAccounts(): UserAccount[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_ACCOUNTS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY_ACCOUNTS, JSON.stringify(DEFAULT_USERS));
      return DEFAULT_USERS;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
  } catch (error) {
    console.error('Failed to load stored accounts:', error);
  }
  return DEFAULT_USERS;
}

export function saveStoredAccounts(accounts: UserAccount[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_ACCOUNTS, JSON.stringify(accounts));
  } catch (error) {
    console.error('Failed to save accounts:', error);
  }
}

export function getSessionUser(): UserAccount | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SESSION);
    if (!raw) return null;
    return JSON.parse(raw) as UserAccount;
  } catch {
    return null;
  }
}

export function setSessionUser(user: UserAccount | null): void {
  try {
    if (user) {
      localStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(user));
    } else {
      localStorage.removeItem(STORAGE_KEY_SESSION);
    }
  } catch (error) {
    console.error('Failed to update session:', error);
  }
}

export function loginUser(
  email: string,
  password: string,
  expectedRole?: CampusRole,
): { success: boolean; error?: string; user?: UserAccount } {
  const accounts = getStoredAccounts();
  const normalizedEmail = email.trim().toLowerCase();
  
  const user = accounts.find((acc) => acc.email.toLowerCase() === normalizedEmail);

  if (!user) {
    return {
      success: false,
      error: 'No account registered with this email address. Please check your spelling or create an account.',
    };
  }

  if (user.password && user.password !== password) {
    return {
      success: false,
      error: 'Incorrect password entered. Please try again or use password reset.',
    };
  }

  // If a role was specified in the login selector and doesn't match the account's registered role:
  if (expectedRole && user.role !== expectedRole) {
    return {
      success: false,
      error: `This account is registered as a "${user.role}", but you selected "${expectedRole}". Please select the correct portal role or change it in the dropdown.`,
    };
  }

  setSessionUser(user);
  return { success: true, user };
}

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
  role: CampusRole;
  department?: string;
  studentId?: string;
  semester?: number;
  designation?: string;
  specialization?: string;
}

export function registerUser(
  payload: RegisterPayload,
): { success: boolean; error?: string; user?: UserAccount } {
  const accounts = getStoredAccounts();
  const normalizedEmail = payload.email.trim().toLowerCase();

  if (!payload.name.trim()) {
    return { success: false, error: 'Full name is required.' };
  }

  if (!normalizedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    return { success: false, error: 'Please provide a valid email address.' };
  }

  if (!payload.password || payload.password.length < 6) {
    return { success: false, error: 'Password must be at least 6 characters long.' };
  }

  const existing = accounts.find((acc) => acc.email.toLowerCase() === normalizedEmail);
  if (existing) {
    return {
      success: false,
      error: 'An account with this email address already exists. Please log in instead.',
    };
  }

  const roleGradients: Record<CampusRole, string> = {
    Admin: 'from-amber-500 to-indigo-600',
    Teacher: 'from-blue-500 to-indigo-600',
    Student: 'from-emerald-500 to-teal-600',
  };

  const newUser: UserAccount = {
    id: `usr-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    name: payload.name.trim(),
    email: normalizedEmail,
    password: payload.password,
    role: payload.role,
    department: payload.department?.trim() || 'General Studies',
    studentId: payload.studentId?.trim().toUpperCase(),
    semester: payload.semester || 1,
    designation: payload.designation?.trim(),
    specialization: payload.specialization?.trim(),
    avatarColor: roleGradients[payload.role] || 'from-indigo-500 to-indigo-700',
    createdAt: new Date().toISOString(),
  };

  const updated = [newUser, ...accounts];
  saveStoredAccounts(updated);
  setSessionUser(newUser);

  return { success: true, user: newUser };
}

export function resetPassword(
  email: string,
  newPassword: string,
): { success: boolean; error?: string } {
  const accounts = getStoredAccounts();
  const normalizedEmail = email.trim().toLowerCase();
  const index = accounts.findIndex((acc) => acc.email.toLowerCase() === normalizedEmail);

  if (index === -1) {
    return { success: false, error: 'No user account found matching this email.' };
  }

  if (!newPassword || newPassword.length < 6) {
    return { success: false, error: 'New password must be at least 6 characters.' };
  }

  accounts[index].password = newPassword;
  saveStoredAccounts(accounts);
  return { success: true };
}

