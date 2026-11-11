import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import type { Auth, GoogleAuthProvider } from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase App
export const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// CRITICAL: Must use firestoreDatabaseId
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

let _auth: Auth | null = null;
let _googleProvider: GoogleAuthProvider | null = null;

/**
 * Lazy Auth getter: initializes Firebase Auth on-demand.
 * This prevents the heavy 93 KiB auth/iframe.js and relyingparty/getProjectConfig
 * network requests from blocking the critical render path for public readers.
 */
export async function getFirebaseAuth(): Promise<{ auth: Auth; googleProvider: GoogleAuthProvider }> {
  if (!_auth || !_googleProvider) {
    const { getAuth, GoogleAuthProvider } = await import('firebase/auth');
    _auth = getAuth(app);
    _googleProvider = new GoogleAuthProvider();
  }
  return { auth: _auth, googleProvider: _googleProvider };
}
