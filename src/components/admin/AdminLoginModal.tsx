import React, { useState } from 'react';
import {
  ShieldCheck,
  Lock,
  Mail,
  KeyRound,
  Eye,
  EyeOff,
  AlertCircle,
  X,
  ArrowRight,
  Loader2
} from 'lucide-react';
import { getFirebaseAuth } from '../../services/firebase-config';
import { verifyAdminStatus } from '../../services/auth-service';
import { signInWithPopup, signInWithEmailAndPassword, signOut } from 'firebase/auth';

interface AdminLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (userEmail: string) => void;
}

export const AdminLoginModal: React.FC<AdminLoginModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);

    try {
      const { auth } = await getFirebaseAuth();
      const userCred = await signInWithEmailAndPassword(auth, email.trim(), password);

      if (!userCred.user.emailVerified) {
        await signOut(auth);
        setErrorMsg(`Email Verification Required: "${userCred.user.email}" must have a verified email address before accessing EIRVAN Studio.`);
        setLoading(false);
        return;
      }

      // Verify the user is an authorized administrator
      const adminProfile = await verifyAdminStatus(userCred.user);
      if (!adminProfile) {
        await signOut(auth);
        setErrorMsg(`Access Denied: ${userCred.user.email} is not authorized for administrator access on EIRVAN.`);
        setLoading(false);
        return;
      }

      setLoading(false);
      onLoginSuccess(adminProfile.email);
    } catch (err: any) {
      console.warn('Firebase email/password login error:', err);
      const code = err?.code;
      if (code === 'auth/invalid-credential' || code === 'auth/user-not-found' || code === 'auth/wrong-password') {
        setErrorMsg('Invalid email or password. Please verify your credentials or continue with Google.');
      } else if (code === 'auth/too-many-requests') {
        setErrorMsg('Too many unsuccessful login attempts. Please wait a few moments or use Google sign-in.');
      } else {
        setErrorMsg(err?.message || 'Authentication failed. Please verify credentials.');
      }
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setErrorMsg(null);
    setLoading(true);

    try {
      const { auth, googleProvider } = await getFirebaseAuth();
      const res = await signInWithPopup(auth, googleProvider);

      if (!res.user) {
        throw new Error('No user profile returned from Google sign-in.');
      }

      if (!res.user.emailVerified) {
        await signOut(auth);
        setErrorMsg(`Email Verification Required: The Google account "${res.user.email}" does not have a verified email claim.`);
        setLoading(false);
        return;
      }

      // Verify the authenticated Google user is in the authorized admin list
      const adminProfile = await verifyAdminStatus(res.user);
      if (!adminProfile) {
        await signOut(auth);
        setErrorMsg(`Access Denied: The Google account "${res.user.email}" is not authorized for administrator access on EIRVAN.`);
        setLoading(false);
        return;
      }

      setLoading(false);
      onLoginSuccess(adminProfile.email);
    } catch (err: any) {
      console.warn('Google sign-in error:', err);
      const code = err?.code;
      if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
        setErrorMsg('Sign-in cancelled. The Google authentication popup was closed.');
      } else if (code === 'auth/popup-blocked') {
        setErrorMsg('Pop-up was blocked by your browser. Please allow pop-ups for this domain to sign in.');
      } else {
        setErrorMsg(err?.message || 'Google authentication failed. Please try again.');
      }
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <img
              src="/images/brand/eirvan-icon-192.webp"
              alt="EIRVAN Icon"
              width={32}
              height={32}
              decoding="async"
              className="w-8 h-8 rounded-xl object-contain shadow-xs"
            />
            <div>
              <h3 className="font-serif font-black text-base text-slate-900">
                EIRVAN Studio Access
              </h3>
              <span className="text-[10px] font-mono uppercase text-blue-600 font-bold block">
                Firebase Authentication &amp; Firestore
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            aria-label="Close login modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          
          {/* Security Notice */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs space-y-1.5">
            <span className="font-bold text-slate-900 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-blue-600" />
              Verified Administrator Gateway
            </span>
            <p className="text-slate-600 text-[11px] leading-relaxed">
              Publisher Studio CMS access requires authentication with an authorized Google administrator account or verified Firebase staff credentials.
            </p>
          </div>

          {/* Error Message */}
          {errorMsg && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-start gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500 mt-0.5" />
              <span className="leading-snug">{errorMsg}</span>
            </div>
          )}

          {/* Google Sign In - Preferred Path */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full py-2.5 bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 text-xs font-semibold rounded-xl transition-all flex items-center justify-center gap-2.5 cursor-pointer shadow-xs hover:border-slate-400 disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
            ) : (
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
            )}
            <span>Sign in with Google Administrator Account</span>
          </button>

          {/* Divider */}
          <div className="relative flex items-center justify-center">
            <div className="border-t border-slate-200 w-full" />
            <span className="bg-white px-2 text-[10px] uppercase font-mono text-slate-400 absolute">
              or staff email &amp; password
            </span>
          </div>

          {/* Email/Password Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Admin Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@eirvan.com"
                  className="w-full pl-10 pr-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500 text-slate-900 font-medium"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Password
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-10 pr-10 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500 text-slate-900 font-medium"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(prev => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-blue-500/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Verifying Authorization...</span>
                </>
              ) : (
                <>
                  <span>Authenticate Session</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </form>

          {/* Trust Footer */}
          <div className="pt-2 text-center text-[10px] font-mono text-slate-400">
            Enforced by Firebase Authentication &amp; Firestore ABAC Rules
          </div>

        </div>

      </div>
    </div>
  );
};

export default AdminLoginModal;
