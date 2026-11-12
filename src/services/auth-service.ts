import { getFirebaseAuth, getFirebaseDB } from './firebase-config';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

export interface AdminUser {
  uid: string;
  email: string;
  role: string;
  displayName?: string | null;
}

// Authorized Administrator Allowlist (Matches firestore.rules)
export const AUTHORIZED_ADMIN_EMAILS = [
  'ashfaqtayyab318@gmail.com',
  'admin@eirvan.com',
  'admin@chroniclepulse.com'
];

/**
 * Validates whether an email is in the authorized administrator whitelist.
 */
export function isAuthorizedAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  const normalized = email.trim().toLowerCase();
  return AUTHORIZED_ADMIN_EMAILS.some(e => e.toLowerCase() === normalized);
}

/**
 * Checks whether an authenticated user is an authorized administrator
 * by email whitelist or by record in the Firestore /admins/{uid} collection.
 */
export async function verifyAdminStatus(user: User | null): Promise<AdminUser | null> {
  if (!user || !user.email || !user.emailVerified) {
    return null;
  }

  // 1. Direct whitelist match
  if (isAuthorizedAdminEmail(user.email)) {
    return {
      uid: user.uid,
      email: user.email,
      role: 'Super Administrator',
      displayName: user.displayName || user.email.split('@')[0]
    };
  }

  // 2. Database whitelist lookup in /admins/{uid}
  try {
    const db = await getFirebaseDB();
    const adminDoc = await getDoc(doc(db, 'admins', user.uid));
    if (adminDoc.exists()) {
      const data = adminDoc.data();
      if (typeof data?.email === 'string' && data.email.trim().toLowerCase() !== user.email.trim().toLowerCase()) {
        return null;
      }
      return {
        uid: user.uid,
        email: user.email,
        role: data.role || 'Verified Administrator',
        displayName: user.displayName || user.email.split('@')[0]
      };
    }
  } catch (err) {
    console.warn('Admin status Firestore check notice:', err);
  }

  return null;
}

/**
 * Subscribes to real-time Firebase Auth state changes and validates administrator authorization.
 * Never trusts unverified localStorage tokens.
 */
export function subscribeAdminAuth(
  onStateChange: (admin: AdminUser | null, loading: boolean) => void
): () => void {
  let isMounted = true;
  let unsubscribeAuth: (() => void) | null = null;

  getFirebaseAuth().then(({ auth }) => {
    if (!isMounted) return;

    unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!isMounted) return;

      if (!firebaseUser) {
        localStorage.removeItem('cp_admin_auth');
        onStateChange(null, false);
        return;
      }

      const adminUser = await verifyAdminStatus(firebaseUser);
      if (!isMounted) return;

      if (adminUser) {
        // Cache basic profile for UI hints only; never as proof of authorization
        localStorage.setItem('cp_admin_auth', JSON.stringify({
          email: adminUser.email,
          uid: adminUser.uid,
          role: adminUser.role
        }));
        onStateChange(adminUser, false);
      } else {
        // Authenticated as regular non-admin user; deny admin privileges
        localStorage.removeItem('cp_admin_auth');
        onStateChange(null, false);
      }
    });
  }).catch((err) => {
    console.warn('Failed to initialize Firebase Auth subscriber:', err);
    if (isMounted) onStateChange(null, false);
  });

  return () => {
    isMounted = false;
    if (unsubscribeAuth) unsubscribeAuth();
  };
}

/**
 * Clears authenticated session from Firebase Auth and removes any local storage residues.
 */
export async function logoutAdmin(): Promise<void> {
  localStorage.removeItem('cp_admin_auth');
  try {
    const { auth } = await getFirebaseAuth();
    await signOut(auth);
  } catch (err) {
    console.warn('Logout signOut error:', err);
  }
}
