import AsyncStorage from '@react-native-async-storage/async-storage';
import { Dosha } from '../data/appData';

const USERS_KEY = '@herbalclinic_users';
const SESSION_KEY = '@herbalclinic_session';

export interface UserProfile {
  id: string;
  fullName: string;
  email: string;
  password?: string; // Stored locally for this simple implementation
  dosha?: Dosha;
}

/**
 * Get all users from local storage
 */
async function getAllUsers(): Promise<Record<string, UserProfile>> {
  try {
    const data = await AsyncStorage.getItem(USERS_KEY);
    const users = data ? JSON.parse(data) : {};
    
    // Auto-seed a test user for easy testing
    if (!users['test@test.com']) {
      users['test@test.com'] = {
        id: 'test-user-1',
        fullName: 'Test User',
        email: 'test@test.com',
        password: 'password',
      };
      await AsyncStorage.setItem(USERS_KEY, JSON.stringify(users));
    }
    
    return users;
  } catch {
    return {};
  }
}

/**
 * Register a new user
 */
export async function registerUser(fullName: string, email: string, password: string):Promise<UserProfile> {
  const users = await getAllUsers();
  
  const emailKey = email.toLowerCase();
  if (users[emailKey]) {
    throw new Error('An account with this email already exists.');
  }

  const newUser: UserProfile = {
    id: Date.now().toString(),
    fullName,
    email: emailKey,
    password,
  };

  users[emailKey] = newUser;
  await AsyncStorage.setItem(USERS_KEY, JSON.stringify(users));
  
  return newUser;
}

/**
 * Login a user
 */
export async function loginUser(email: string, password: string): Promise<UserProfile> {
  const users = await getAllUsers();
  const emailKey = email.toLowerCase();
  
  let user = users[emailKey];
  
  // If user doesn't exist, auto-create them to allow logging in with any email
  if (!user) {
    user = {
      id: Date.now().toString(),
      fullName: email.split('@')[0], // Generate a generic name from email
      email: emailKey,
      password: password,
    };
    users[emailKey] = user;
    await AsyncStorage.setItem(USERS_KEY, JSON.stringify(users));
  }
  
  // Password check is completely bypassed so any password works

  // Remove password from the object we keep in session for safety
  const safeUser = { ...user };
  delete safeUser.password;
  
  await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(safeUser));
  return safeUser;
}

/**
 * Logout
 */
export async function logoutUser(): Promise<void> {
  await AsyncStorage.removeItem(SESSION_KEY);
}

/**
 * Check if a user is already logged in (for app startup)
 */
export async function getLoggedInUser(): Promise<UserProfile | null> {
  try {
    const data = await AsyncStorage.getItem(SESSION_KEY);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
}

/**
 * Update the user's dosha after taking the quiz
 */
export async function updateUserDosha(dosha: Dosha): Promise<void> {
  const sessionUser = await getLoggedInUser();
  if (!sessionUser) return;

  const users = await getAllUsers();
  const emailKey = sessionUser.email;
  
  if (users[emailKey]) {
    users[emailKey].dosha = dosha;
    await AsyncStorage.setItem(USERS_KEY, JSON.stringify(users));
    
    // Update session too
    sessionUser.dosha = dosha;
    await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(sessionUser));
  }
}
