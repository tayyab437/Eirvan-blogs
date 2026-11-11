import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import type { Firestore } from 'firebase/firestore';
import type { Auth, GoogleAuthProvider } from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

let _app: FirebaseApp | null = null;
let _db: Firestore | null = null;
let _auth: Auth | null = null;
let _googleProvider: GoogleAuthProvider | null = null;

export function getFirebaseApp(): FirebaseApp {
  if (!_app) {
    _app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
  }
  return _app;
}

export async function getFirebaseDB(): Promise<Firestore> {
  if (!_db) {
    const { initializeFirestore } = await import('firebase/firestore');
    // Using initializeFirestore with auto-detect long polling to prevent persistent WebChannel timeouts (ERR_TIMED_OUT)
    // in restricted network environments like iframes.
    _db = initializeFirestore(getFirebaseApp(), {
      experimentalAutoDetectLongPolling: true,
    }, firebaseConfig.firestoreDatabaseId);
  }
  return _db;
}

export async function getFirebaseAuth(): Promise<{ auth: Auth; googleProvider: GoogleAuthProvider }> {
  if (!_auth || !_googleProvider) {
    const { getAuth, GoogleAuthProvider } = await import('firebase/auth');
    _auth = getAuth(getFirebaseApp());
    _googleProvider = new GoogleAuthProvider();
  }
  return { auth: _auth, googleProvider: _googleProvider };
}
