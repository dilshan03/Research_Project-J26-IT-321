import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  User as UserIcon,
  Mail,
  Shield,
  Edit3,
  Save,
  X,
  Lock,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  LogOut,
  Loader2,
  KeyRound,
  IdCard,
  Check,
} from 'lucide-react';
import { Navbar } from '../../../shared/components/Navbar';
import { useAuth } from '../../auth/hooks/useAuth';
import { authService } from '../../auth/services/authService';
import type { UserRole } from '../../auth/types';

export const UserProfilePage: React.FC = () => {
  const { user, updateUser, logout } = useAuth();
  const navigate = useNavigate();

  // Edit form state
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    fullName: user?.fullName || '',
    email: user?.email || '',
    role: (user?.role || 'parent') as UserRole,
    username: user?.username || (user?.email ? user.email.split('@')[0] : ''),
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);
  const [saveErrorMessage, setSaveErrorMessage] = useState<string | null>(null);

  // Password reset state
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [securityMessage, setSecurityMessage] = useState<string | null>(null);
  const [securityError, setSecurityError] = useState<string | null>(null);

  // Guard fallback in case user state is momentarily null
  if (!user) {
    return null;
  }

  const startEditing = () => {
    setFormData({
      fullName: user.fullName || '',
      email: user.email || '',
      role: user.role,
      username: user.username || (user.email ? user.email.split('@')[0] : ''),
    });
    setFormErrors({});
    setSaveErrorMessage(null);
    setSaveSuccessMessage(null);
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setFormData({
      fullName: user.fullName || '',
      email: user.email || '',
      role: user.role,
      username: user.username || (user.email ? user.email.split('@')[0] : ''),
    });
    setFormErrors({});
    setSaveErrorMessage(null);
    setIsEditing(false);
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.fullName.trim()) {
      errors.fullName = 'Full name is required.';
    } else if (formData.fullName.trim().length < 2) {
      errors.fullName = 'Full name must be at least 2 characters.';
    }

    if (!formData.email.trim()) {
      errors.email = 'Email address is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      errors.email = 'Please enter a valid email address.';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveErrorMessage(null);
    setSaveSuccessMessage(null);

    if (!validateForm() || isSaving) return;

    setIsSaving(true);

    const updatedPayload = {
      fullName: formData.fullName.trim(),
      email: formData.email.trim(),
      role: formData.role,
      username: formData.username.trim(),
    };

    const response = await authService.updateProfile(user.id, updatedPayload);

    setIsSaving(false);

    if (response.success) {
      // Backend confirmed persistence
      updateUser(response.data || updatedPayload);
      setSaveSuccessMessage(response.message || 'Profile updated successfully!');
      setIsEditing(false);
    } else {
      // Backend does not support endpoint or failed
      // Prompt requirement: Do not simulate successful persistence.
      setSaveErrorMessage(
        response.error?.message ||
          response.message ||
          'Profile update failed: Backend service is not available to persist changes.'
      );
    }
  };

  const handlePasswordReset = async () => {
    setSecurityMessage(null);
    setSecurityError(null);
    setIsResettingPassword(true);

    const response = await authService.requestPasswordReset({ email: user.email });

    setIsResettingPassword(false);

    if (response.success) {
      setSecurityMessage(
        response.message || `Password reset instructions have been dispatched to ${user.email}.`
      );
    } else {
      setSecurityError(
        response.error?.message || response.message || 'Could not request password reset at this time.'
      );
    }
  };

  const handleSignOut = () => {
    logout();
    navigate('/sign-in');
  };

  const userInitial = user.fullName
    ? user.fullName.charAt(0).toUpperCase()
    : user.email.charAt(0).toUpperCase();

  const displayUsername = user.username || (user.email ? user.email.split('@')[0] : 'User');

  return (
    <div className="min-h-screen bg-mq-bg font-sans text-mq-text flex flex-col selection:bg-mq-surface-blue">
      {/* Existing Navbar */}
      <Navbar />

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
        {/* Navigation Breadcrumb / Back Link */}
        <div className="flex items-center justify-between">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-mq-primary hover:text-mq-primary-hover transition-colors"
          >
            <ArrowLeft size={16} />
            <span>Back to Home</span>
          </Link>
          <span className="text-xs font-semibold uppercase tracking-wider text-mq-text-muted">
            User Account
          </span>
        </div>

        {/* Global Feedback Banners */}
        {saveSuccessMessage && (
          <div className="p-4 bg-mq-success-bg border border-mq-success/30 rounded-2xl flex items-start justify-between gap-3 text-xs sm:text-sm text-mq-success font-medium animate-fade-in shadow-sm">
            <div className="flex items-start gap-3">
              <CheckCircle2 size={20} className="shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Success</p>
                <p className="mt-0.5 text-mq-text">{saveSuccessMessage}</p>
              </div>
            </div>
            <button
              onClick={() => setSaveSuccessMessage(null)}
              className="text-mq-text-muted hover:text-mq-text transition-colors p-1"
              aria-label="Dismiss message"
            >
              <X size={16} />
            </button>
          </div>
        )}

        {saveErrorMessage && (
          <div className="p-4 bg-mq-danger-bg border border-mq-danger/30 rounded-2xl flex items-start justify-between gap-3 text-xs sm:text-sm text-mq-danger font-medium animate-fade-in shadow-sm">
            <div className="flex items-start gap-3">
              <AlertCircle size={20} className="shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Update Notice</p>
                <p className="mt-0.5 text-mq-text">{saveErrorMessage}</p>
              </div>
            </div>
            <button
              onClick={() => setSaveErrorMessage(null)}
              className="text-mq-text-muted hover:text-mq-text transition-colors p-1"
              aria-label="Dismiss message"
            >
              <X size={16} />
            </button>
          </div>
        )}

        {/* Section A: Profile Overview Card */}
        <div className="bg-mq-surface rounded-3xl border border-mq-border p-6 sm:p-8 shadow-sm relative overflow-hidden">
          {/* Subtle decorative background gradient */}
          <div className="absolute top-0 right-0 -mr-16 -mt-16 w-56 h-56 bg-mq-surface-blue/50 rounded-full blur-2xl pointer-events-none" />

          <div className="relative flex flex-col sm:flex-row items-center sm:items-start justify-between gap-6 text-center sm:text-left">
            <div className="flex flex-col sm:flex-row items-center gap-5 sm:gap-6 min-w-0">
              {/* User Avatar with Initial */}
              <div className="relative shrink-0">
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-br from-mq-primary to-mq-primary-dark text-white flex items-center justify-center font-extrabold text-3xl sm:text-4xl shadow-md border-4 border-white">
                  {userInitial}
                </div>
                <div
                  className="absolute bottom-0 right-0 p-1.5 bg-mq-secondary text-white rounded-full border-2 border-white shadow-sm"
                  title={`Role: ${user.role}`}
                >
                  <Shield size={14} />
                </div>
              </div>

              {/* Identity Details */}
              <div className="space-y-1.5 min-w-0">
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                  <h1 className="text-xl sm:text-2xl font-extrabold text-mq-text-strong truncate">
                    {user.fullName || displayUsername}
                  </h1>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-mq-surface-blue text-mq-primary border border-mq-border">
                    <Shield size={12} />
                    {user.role}
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-mq-text-muted font-medium flex items-center justify-center sm:justify-start gap-1.5 truncate">
                  <Mail size={14} className="shrink-0" />
                  <span>{user.email}</span>
                </p>
                <p className="text-xs text-mq-text-muted/80">
                  Username: <strong className="text-mq-text font-semibold">@{displayUsername}</strong>
                </p>
              </div>
            </div>

            {/* Edit / Cancel Toggle Button */}
            <div className="shrink-0 flex items-center gap-3">
              {!isEditing ? (
                <button
                  id="editProfileButton"
                  onClick={startEditing}
                  className="btn btn-primary text-xs sm:text-sm py-2 px-4 rounded-full flex items-center gap-2 shadow-sm"
                >
                  <Edit3 size={15} />
                  <span>Edit Profile</span>
                </button>
              ) : (
                <button
                  onClick={cancelEditing}
                  disabled={isSaving}
                  className="btn btn-secondary text-xs sm:text-sm py-2 px-4 rounded-full flex items-center gap-2 border-mq-border text-mq-text-muted hover:text-mq-text"
                >
                  <X size={15} />
                  <span>Cancel Editing</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Section B & C: Personal Information & Edit Profile Form */}
        <div className="bg-mq-surface rounded-3xl border border-mq-border p-6 sm:p-8 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-mq-border/70 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-mq-surface-soft text-mq-primary flex items-center justify-center font-bold">
                <UserIcon size={18} />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-bold text-mq-text-strong">
                  Personal Information
                </h2>
                <p className="text-xs text-mq-text-muted">
                  {isEditing ? 'Update your personal profile details below' : 'View your profile identification'}
                </p>
              </div>
            </div>
          </div>

          {isEditing ? (
            /* Section C: Edit Profile Form */
            <form onSubmit={handleSaveProfile} noValidate className="space-y-5 animate-fade-in">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                {/* Full Name Field */}
                <div className="space-y-1.5">
                  <label htmlFor="editFullName" className="block text-xs font-bold uppercase tracking-wider text-mq-text-strong">
                    Full Name <span className="text-mq-danger">*</span>
                  </label>
                  <div className="relative rounded-2xl shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-mq-text-muted">
                      <UserIcon size={18} />
                    </div>
                    <input
                      id="editFullName"
                      type="text"
                      value={formData.fullName}
                      onChange={(e) => {
                        setFormData((prev) => ({ ...prev, fullName: e.target.value }));
                        if (formErrors.fullName) setFormErrors((prev) => ({ ...prev, fullName: '' }));
                      }}
                      disabled={isSaving}
                      placeholder="e.g. Kasun Perera"
                      className={`w-full py-2.5 sm:py-3 pl-10 pr-4 text-sm rounded-2xl border bg-mq-surface text-mq-text placeholder-mq-text-muted/60 transition-all outline-none ${
                        formErrors.fullName
                          ? 'border-mq-danger focus:ring-2 focus:ring-mq-danger/20 bg-mq-danger-bg/30'
                          : 'border-mq-border focus:border-mq-primary focus:ring-2 focus:ring-mq-primary/20'
                      }`}
                    />
                  </div>
                  {formErrors.fullName && (
                    <p className="flex items-center gap-1 text-xs text-mq-danger font-medium mt-1">
                      <AlertCircle size={14} className="shrink-0" />
                      <span>{formErrors.fullName}</span>
                    </p>
                  )}
                </div>

                {/* Email Field */}
                <div className="space-y-1.5">
                  <label htmlFor="editEmail" className="block text-xs font-bold uppercase tracking-wider text-mq-text-strong">
                    Email Address <span className="text-mq-danger">*</span>
                  </label>
                  <div className="relative rounded-2xl shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-mq-text-muted">
                      <Mail size={18} />
                    </div>
                    <input
                      id="editEmail"
                      type="email"
                      value={formData.email}
                      onChange={(e) => {
                        setFormData((prev) => ({ ...prev, email: e.target.value }));
                        if (formErrors.email) setFormErrors((prev) => ({ ...prev, email: '' }));
                      }}
                      disabled={isSaving}
                      placeholder="e.g. parent@example.com"
                      className={`w-full py-2.5 sm:py-3 pl-10 pr-4 text-sm rounded-2xl border bg-mq-surface text-mq-text placeholder-mq-text-muted/60 transition-all outline-none ${
                        formErrors.email
                          ? 'border-mq-danger focus:ring-2 focus:ring-mq-danger/20 bg-mq-danger-bg/30'
                          : 'border-mq-border focus:border-mq-primary focus:ring-2 focus:ring-mq-primary/20'
                      }`}
                    />
                  </div>
                  {formErrors.email && (
                    <p className="flex items-center gap-1 text-xs text-mq-danger font-medium mt-1">
                      <AlertCircle size={14} className="shrink-0" />
                      <span>{formErrors.email}</span>
                    </p>
                  )}
                </div>

                {/* Username Field */}
                <div className="space-y-1.5">
                  <label htmlFor="editUsername" className="block text-xs font-bold uppercase tracking-wider text-mq-text-strong">
                    Username
                  </label>
                  <div className="relative rounded-2xl shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-mq-text-muted font-bold text-sm">
                      @
                    </div>
                    <input
                      id="editUsername"
                      type="text"
                      value={formData.username}
                      onChange={(e) => setFormData((prev) => ({ ...prev, username: e.target.value }))}
                      disabled={isSaving}
                      placeholder="username"
                      className="w-full py-2.5 sm:py-3 pl-10 pr-4 text-sm rounded-2xl border border-mq-border focus:border-mq-primary focus:ring-2 focus:ring-mq-primary/20 bg-mq-surface text-mq-text placeholder-mq-text-muted/60 transition-all outline-none"
                    />
                  </div>
                  <p className="text-[11px] text-mq-text-muted">Identifier used across MathQuest</p>
                </div>

                {/* Role Selector */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-mq-text-strong">
                    Account Role
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setFormData((prev) => ({ ...prev, role: 'parent' }))}
                      disabled={isSaving}
                      className={`py-2.5 px-3 rounded-2xl border text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                        formData.role === 'parent'
                          ? 'bg-mq-surface-blue border-mq-primary text-mq-primary shadow-sm'
                          : 'border-mq-border text-mq-text-muted hover:border-mq-primary/40'
                      }`}
                    >
                      <UserIcon size={14} />
                      <span>Parent</span>
                      {formData.role === 'parent' && <Check size={14} className="ml-1" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData((prev) => ({ ...prev, role: 'teacher' }))}
                      disabled={isSaving}
                      className={`py-2.5 px-3 rounded-2xl border text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                        formData.role === 'teacher'
                          ? 'bg-mq-surface-blue border-mq-primary text-mq-primary shadow-sm'
                          : 'border-mq-border text-mq-text-muted hover:border-mq-primary/40'
                      }`}
                    >
                      <Shield size={14} />
                      <span>Teacher</span>
                      {formData.role === 'teacher' && <Check size={14} className="ml-1" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Form Actions */}
              <div className="flex flex-wrap items-center justify-end gap-3 pt-4 border-t border-mq-border/70">
                <button
                  type="button"
                  onClick={cancelEditing}
                  disabled={isSaving}
                  className="btn btn-secondary text-xs sm:text-sm py-2 px-4 rounded-full"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="btn btn-primary text-xs sm:text-sm py-2 px-5 rounded-full flex items-center gap-2 shadow-sm"
                >
                  {isSaving ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>Saving Changes...</span>
                    </>
                  ) : (
                    <>
                      <Save size={16} />
                      <span>Save Changes</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          ) : (
            /* Section B: Personal Information Display Cards */
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Full Name */}
              <div className="p-4 rounded-2xl bg-mq-surface-soft border border-mq-border/60">
                <span className="text-[11px] font-bold uppercase tracking-wider text-mq-text-muted block mb-1">
                  Full Name
                </span>
                <span className="text-sm sm:text-base font-bold text-mq-text-strong block">
                  {user.fullName || 'Not specified'}
                </span>
              </div>

              {/* Username */}
              <div className="p-4 rounded-2xl bg-mq-surface-soft border border-mq-border/60">
                <span className="text-[11px] font-bold uppercase tracking-wider text-mq-text-muted block mb-1">
                  Username
                </span>
                <span className="text-sm sm:text-base font-bold text-mq-text-strong block">
                  @{displayUsername}
                </span>
              </div>

              {/* Email Address */}
              <div className="p-4 rounded-2xl bg-mq-surface-soft border border-mq-border/60">
                <span className="text-[11px] font-bold uppercase tracking-wider text-mq-text-muted block mb-1">
                  Email Address
                </span>
                <span className="text-sm sm:text-base font-bold text-mq-text-strong block break-all">
                  {user.email}
                </span>
              </div>

              {/* User Role */}
              <div className="p-4 rounded-2xl bg-mq-surface-soft border border-mq-border/60">
                <span className="text-[11px] font-bold uppercase tracking-wider text-mq-text-muted block mb-1">
                  Role
                </span>
                <span className="inline-flex items-center gap-1.5 text-sm sm:text-base font-bold text-mq-primary capitalize">
                  <Shield size={16} />
                  {user.role}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Section D: Account Information */}
        <div className="bg-mq-surface rounded-3xl border border-mq-border p-6 sm:p-8 shadow-sm space-y-4">
          <div className="flex items-center gap-2.5 border-b border-mq-border/70 pb-4">
            <div className="w-8 h-8 rounded-xl bg-mq-surface-soft text-mq-primary flex items-center justify-center font-bold">
              <IdCard size={18} />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-mq-text-strong">
                Account Information
              </h2>
              <p className="text-xs text-mq-text-muted">
                System identification and account membership
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Account ID */}
            <div className="p-4 rounded-2xl bg-mq-surface-soft border border-mq-border/60">
              <span className="text-[11px] font-bold uppercase tracking-wider text-mq-text-muted block mb-1">
                Account ID
              </span>
              <span className="text-xs sm:text-sm font-mono font-semibold text-mq-text-strong block truncate">
                {user.id}
              </span>
            </div>

            {/* Role Type & Access */}
            <div className="p-4 rounded-2xl bg-mq-surface-soft border border-mq-border/60">
              <span className="text-[11px] font-bold uppercase tracking-wider text-mq-text-muted block mb-1">
                Role Permissions
              </span>
              <span className="text-xs sm:text-sm font-semibold text-mq-text-strong block capitalize">
                {user.role === 'teacher' ? 'Educator / Teacher Portal' : 'Parent / Home Supervision'}
              </span>
            </div>

            {/* Status */}
            <div className="p-4 rounded-2xl bg-mq-surface-soft border border-mq-border/60">
              <span className="text-[11px] font-bold uppercase tracking-wider text-mq-text-muted block mb-1">
                Account Status
              </span>
              <span className="inline-flex items-center gap-1 text-xs sm:text-sm font-bold text-mq-success">
                <CheckCircle2 size={14} /> Active
              </span>
            </div>
          </div>
        </div>

        {/* Section E: Account Security */}
        <div className="bg-mq-surface rounded-3xl border border-mq-border p-6 sm:p-8 shadow-sm space-y-4">
          <div className="flex items-center gap-2.5 border-b border-mq-border/70 pb-4">
            <div className="w-8 h-8 rounded-xl bg-mq-surface-soft text-mq-primary flex items-center justify-center font-bold">
              <Lock size={18} />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-mq-text-strong">
                Account Security
              </h2>
              <p className="text-xs text-mq-text-muted">
                Manage your authentication credentials and password
              </p>
            </div>
          </div>

          {securityMessage && (
            <div className="p-3.5 bg-mq-success-bg border border-mq-success/30 rounded-2xl flex items-start gap-3 text-xs sm:text-sm text-mq-success font-medium animate-fade-in">
              <CheckCircle2 size={18} className="shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Security Dispatched</p>
                <p className="mt-0.5 text-mq-text">{securityMessage}</p>
              </div>
            </div>
          )}

          {securityError && (
            <div className="p-3.5 bg-mq-danger-bg border border-mq-danger/30 rounded-2xl flex items-start gap-3 text-xs sm:text-sm text-mq-danger font-medium animate-fade-in">
              <AlertCircle size={18} className="shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Security Notice</p>
                <p className="mt-0.5 text-mq-text">{securityError}</p>
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-mq-surface-soft border border-mq-border/60">
            <div className="space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-mq-text-muted block">
                Password
              </span>
              <p className="text-sm font-bold text-mq-text tracking-widest">
                ••••••••••••••••
              </p>
              <p className="text-xs text-mq-text-muted">
                Credentials are encrypted. Never share your password with anyone.
              </p>
            </div>
            <button
              onClick={handlePasswordReset}
              disabled={isResettingPassword}
              className="btn btn-secondary text-xs sm:text-sm py-2 px-4 rounded-full flex items-center justify-center gap-2 shrink-0 border-mq-border hover:border-mq-primary"
            >
              {isResettingPassword ? (
                <>
                  <Loader2 size={15} className="animate-spin" />
                  <span>Requesting Reset...</span>
                </>
              ) : (
                <>
                  <KeyRound size={15} />
                  <span>Change Password</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Section F: Session Actions (Sign Out) */}
        <div className="flex items-center justify-between pt-2 pb-6">
          <p className="text-xs text-mq-text-muted">
            Signed in as <strong className="text-mq-text">{user.email}</strong>
          </p>
          <button
            onClick={handleSignOut}
            className="btn btn-secondary text-xs sm:text-sm py-2 px-4 rounded-full flex items-center gap-2 text-mq-danger hover:bg-mq-danger-bg border-mq-danger/30"
          >
            <LogOut size={15} />
            <span>Sign Out</span>
          </button>
        </div>
      </main>
    </div>
  );
};

export default UserProfilePage;
