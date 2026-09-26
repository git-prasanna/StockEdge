import React, { useState } from 'react';
import {
  Boxes,
  Lock,
  Mail,
  User as UserIcon,
  KeyRound,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Sparkles
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const AuthModal: React.FC = () => {
  const { login, signup, demoLogin, forgotPassword, resetPassword } = useAuth();

  const [mode, setMode] = useState<'login' | 'signup' | 'forgot' | 'verify_otp'>('login');
  const [email, setEmail] = useState('alex@stocksense.io');
  const [password, setPassword] = useState('stocksense123');
  const [name, setName] = useState('');
  const [role, setRole] = useState('Inventory Manager');
  const [department, setDepartment] = useState('Logistics & Operations');

  // Forgot password OTP states
  const [otp, setOtp] = useState('');
  const [otpNotice, setOtpNotice] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!name.trim()) {
      setError('Full name is required');
      return;
    }
    setLoading(true);
    try {
      await signup({
        name: name.trim(),
        email: email.trim(),
        password,
        role,
        department
      });
    } catch (err: any) {
      setError(err.message || 'Signup failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setOtpNotice(null);
    if (!email.trim()) {
      setError('Please provide your account email');
      return;
    }
    setLoading(true);
    try {
      const res = await forgotPassword(email.trim());
      setOtpNotice(res.otpPreview ? `Verification OTP: ${res.otpPreview}` : res.message);
      setMode('verify_otp');
    } catch (err: any) {
      setError(err.message || 'Failed to generate reset OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!otp.trim() || !newPassword) {
      setError('OTP and new password are required');
      return;
    }
    setLoading(true);
    try {
      await resetPassword(email.trim(), otp.trim(), newPassword);
      setSuccess('Password updated successfully! Please log in with your new password.');
      setPassword(newPassword);
      setMode('login');
    } catch (err: any) {
      setError(err.message || 'OTP verification failed');
    } finally {
      setLoading(false);
    }
  };

  const handleDemo = async () => {
    setError(null);
    setLoading(true);
    try {
      await demoLogin();
    } catch (err: any) {
      setError(err.message || 'Demo login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden">
        {/* Brand Banner */}
        <div className="p-6 bg-slate-900 text-white text-center">
          <div className="w-12 h-12 rounded-xl bg-slate-800 border border-slate-700 mx-auto flex items-center justify-center mb-3">
            <Boxes className="w-6 h-6 text-emerald-400" />
          </div>
          <h2 className="text-xl font-bold tracking-tight">StockSense IMS</h2>
          <p className="text-xs text-slate-400 mt-1">
            Enterprise Multi-Warehouse Inventory & Append-Only Ledger
          </p>
        </div>

        {/* Form Body */}
        <div className="p-6">
          {/* Quick Demo Access Button */}
          {mode === 'login' && (
            <div className="mb-4">
              <button
                type="button"
                onClick={handleDemo}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-2 px-3 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-emerald-600" />
                <span>1-Click Test Login (Alex Morgan - Admin)</span>
              </button>
            </div>
          )}

          {error && (
            <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-center gap-2 text-xs text-rose-700">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-2 text-xs text-emerald-800">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{success}</span>
            </div>
          )}

          {otpNotice && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-800 flex items-center justify-between">
              <span className="font-semibold">{otpNotice}</span>
              <button
                type="button"
                onClick={() => {
                  const match = otpNotice.match(/\d{6}/);
                  if (match) setOtp(match[0]);
                }}
                className="text-[11px] underline font-bold cursor-pointer"
              >
                Auto-fill
              </button>
            </div>
          )}

          {/* 1. LOGIN MODE */}
          {mode === 'login' && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-2 focus:ring-2 focus:ring-slate-900 focus:bg-white focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-700">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setError(null);
                      setMode('forgot');
                    }}
                    className="text-xs text-slate-500 hover:text-slate-900 transition-colors"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-2 focus:ring-2 focus:ring-slate-900 focus:bg-white focus:outline-hidden"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors shadow-xs flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                <span>{loading ? 'Authenticating...' : 'Sign In to StockSense'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <div className="pt-2 text-center text-xs text-slate-500 border-t border-slate-100">
                Don't have an account?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setError(null);
                    setMode('signup');
                  }}
                  className="font-semibold text-slate-900 hover:underline"
                >
                  Create one now
                </button>
              </div>
            </form>
          )}

          {/* 2. SIGNUP MODE */}
          {mode === 'signup' && (
            <form onSubmit={handleSignup} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Full Name
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. Jordan Lee"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-2 focus:ring-2 focus:ring-slate-900 focus:bg-white focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Work Email
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    placeholder="jordan@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-2 focus:ring-2 focus:ring-slate-900 focus:bg-white focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Role</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2 focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
                  >
                    <option value="Inventory Manager">Inventory Manager</option>
                    <option value="Warehouse Admin">Warehouse Admin</option>
                    <option value="Logistics Coordinator">Logistics Coordinator</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Department</label>
                  <input
                    type="text"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2 focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Password (min 6 characters)
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-2 focus:ring-2 focus:ring-slate-900 focus:bg-white focus:outline-hidden"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors shadow-xs flex items-center justify-center gap-1.5 disabled:opacity-50 mt-2"
              >
                <span>{loading ? 'Creating Account...' : 'Complete Registration'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <div className="pt-2 text-center text-xs text-slate-500 border-t border-slate-100">
                Already registered?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setError(null);
                    setMode('login');
                  }}
                  className="font-semibold text-slate-900 hover:underline"
                >
                  Sign In
                </button>
              </div>
            </form>
          )}

          {/* 3. FORGOT PASSWORD (REQUEST OTP) */}
          {mode === 'forgot' && (
            <form onSubmit={handleRequestOtp} className="space-y-4">
              <div className="text-xs text-slate-600">
                Enter your registered email address. The system will generate a secure 6-digit OTP code to verify your identity.
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-2 focus:ring-2 focus:ring-slate-900 focus:bg-white focus:outline-hidden"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors shadow-xs disabled:opacity-50"
              >
                {loading ? 'Generating Code...' : 'Send Verification OTP'}
              </button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => {
                    setError(null);
                    setMode('login');
                  }}
                  className="text-xs text-slate-500 hover:text-slate-900"
                >
                  Back to Sign In
                </button>
              </div>
            </form>
          )}

          {/* 4. VERIFY OTP & RESET PASSWORD */}
          {mode === 'verify_otp' && (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Enter 6-Digit OTP Code
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    maxLength={6}
                    placeholder="123456"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    className="w-full text-sm font-mono tracking-widest text-center bg-slate-50 border border-slate-200 rounded-lg p-2 focus:ring-2 focus:ring-slate-900 focus:bg-white focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  New Password (min 6 characters)
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    minLength={6}
                    placeholder="••••••••"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-2 focus:ring-2 focus:ring-slate-900 focus:bg-white focus:outline-hidden"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors shadow-xs disabled:opacity-50"
              >
                {loading ? 'Verifying & Updating...' : 'Reset Password & Sign In'}
              </button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => {
                    setError(null);
                    setMode('login');
                  }}
                  className="text-xs text-slate-500 hover:text-slate-900"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
