import React, { useState } from 'react';
import {
  User as UserIcon,
  Shield,
  Building,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  Database,
  Lock
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { Breadcrumbs } from '../common/Breadcrumbs';

export const ProfileView: React.FC = () => {
  const { user, updateUser } = useAuth();

  const [name, setName] = useState(user?.name || '');
  const [role, setRole] = useState(user?.role || 'Inventory Manager');
  const [department, setDepartment] = useState(user?.department || 'Logistics & Supply Chain');

  // Password reset inside profile
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');

  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  const [savingPass, setSavingPass] = useState(false);
  const [passSuccess, setPassSuccess] = useState(false);
  const [passError, setPassError] = useState<string | null>(null);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setProfileError(null);
    setProfileSuccess(false);

    try {
      setSavingProfile(true);
      const res = await api.auth.updateProfile({
        id: user.id,
        name: name.trim(),
        role: role.trim(),
        department: department.trim()
      });
      updateUser(res.user);
      setProfileSuccess(true);
      setTimeout(() => setProfileSuccess(false), 3000);
    } catch (err: any) {
      setProfileError(err.message || 'Failed to update profile');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setPassError(null);
    setPassSuccess(false);

    if (newPass.length < 6) {
      setPassError('New password must be at least 6 characters long');
      return;
    }

    if (newPass !== confirmPass) {
      setPassError('New passwords do not match');
      return;
    }

    try {
      setSavingPass(true);
      // Generate OTP and reset directly
      const otpRes = await api.auth.forgotPassword(user.email);
      const otp = otpRes.otpPreview || '123456';
      await api.auth.resetPassword({
        email: user.email,
        otp,
        newPassword: newPass
      });
      setPassSuccess(true);
      setCurrentPass('');
      setNewPass('');
      setConfirmPass('');
      setTimeout(() => setPassSuccess(false), 3000);
    } catch (err: any) {
      setPassError(err.message || 'Failed to update password');
    } finally {
      setSavingPass(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <Breadcrumbs
        items={[
          { label: 'System' },
          { label: 'My Profile & Account' }
        ]}
      />

      {/* Header */}
      <div>
        <h1 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900">
          User Account & Security
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
          Manage warehouse credentials, operational roles, and access credentials
        </p>
      </div>

      {/* User Summary Card */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-xl shrink-0">
            {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900">{user?.name}</h2>
              <span className="px-2 py-0.5 text-[11px] font-semibold bg-emerald-50 text-emerald-700 rounded-sm">
                Verified Staff
              </span>
            </div>
            <p className="text-xs text-slate-500 font-mono mt-0.5">{user?.email}</p>
            <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
              <span className="flex items-center gap-1">
                <Shield className="w-3.5 h-3.5 text-slate-400" />
                {user?.role}
              </span>
              <span aria-hidden="true">·</span>
              <span className="flex items-center gap-1">
                <Building className="w-3.5 h-3.5 text-slate-400" />
                {user?.department || 'Operations'}
              </span>
            </div>
          </div>
        </div>

        <div className="px-3 py-2 bg-slate-50 border border-slate-200/80 rounded-lg text-xs font-mono text-slate-600">
          <span className="text-[10px] text-slate-400 block uppercase font-sans">Database Engine</span>
          <span className="font-bold text-slate-900 flex items-center gap-1 mt-0.5">
            <Database className="w-3.5 h-3.5 text-slate-600" />
            Local SQLite (sql.js)
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Profile Info Form */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="font-bold text-sm text-slate-900">Personal Details</h3>
            <p className="text-xs text-slate-500">Update your operator display name and department</p>
          </div>

          {profileSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-2 text-xs text-emerald-800">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Profile updated successfully.</span>
            </div>
          )}

          {profileError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-center gap-2 text-xs text-rose-700">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{profileError}</span>
            </div>
          )}

          <form onSubmit={handleUpdateProfile} className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Full Name
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2 focus:ring-2 focus:ring-slate-900 focus:bg-white focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Operational Role
              </label>
              <input
                type="text"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2 focus:ring-2 focus:ring-slate-900 focus:bg-white focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Department
              </label>
              <input
                type="text"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2 focus:ring-2 focus:ring-slate-900 focus:bg-white focus:outline-hidden"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={savingProfile}
                className="w-full py-2 px-4 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors shadow-xs disabled:opacity-50"
              >
                {savingProfile ? 'Saving...' : 'Update Details'}
              </button>
            </div>
          </form>
        </div>

        {/* Change Password Form */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="font-bold text-sm text-slate-900">Change Password</h3>
            <p className="text-xs text-slate-500">Update your login password securely</p>
          </div>

          {passSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-2 text-xs text-emerald-800">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Password successfully changed.</span>
            </div>
          )}

          {passError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-center gap-2 text-xs text-rose-700">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{passError}</span>
            </div>
          )}

          <form onSubmit={handleUpdatePassword} className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                New Password (min 6 characters)
              </label>
              <input
                type="password"
                required
                minLength={6}
                placeholder="••••••••"
                value={newPass}
                onChange={(e) => setNewPass(e.target.value)}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2 focus:ring-2 focus:ring-slate-900 focus:bg-white focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Confirm New Password
              </label>
              <input
                type="password"
                required
                minLength={6}
                placeholder="••••••••"
                value={confirmPass}
                onChange={(e) => setConfirmPass(e.target.value)}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2 focus:ring-2 focus:ring-slate-900 focus:bg-white focus:outline-hidden"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={savingPass}
                className="w-full py-2 px-4 text-xs font-semibold text-slate-800 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg transition-colors shadow-2xs disabled:opacity-50"
              >
                {savingPass ? 'Updating Password...' : 'Save New Password'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
