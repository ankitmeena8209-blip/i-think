import React, { useState, useEffect } from 'react';

export default function AdminDashboard({ user, onNavigate }) {
  const [stats, setStats] = useState({ userCount: 0, thoughtCount: 0 });
  const [loadingStats, setLoadingStats] = useState(true);

  // Password change form state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPass, setChangingPass] = useState(false);
  const [passStatus, setPassStatus] = useState({ error: '', success: '' });

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch('/api/admin/stats');
        if (res.ok) {
          const data = await res.json();
          setStats(data);
        }
      } catch (err) {
        console.error('Error fetching admin stats:', err);
      } finally {
        setLoadingStats(false);
      }
    }
    fetchStats();
  }, []);

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPassStatus({ error: '', success: '' });

    if (!currentPassword || !newPassword) {
      setPassStatus({ error: 'Please enter both current and new passwords.', success: '' });
      return;
    }

    if (newPassword.length < 8) {
      setPassStatus({ error: 'New password must be at least 8 characters long.', success: '' });
      return;
    }

    if (newPassword !== confirmPassword) {
      setPassStatus({ error: 'New passwords do not match.', success: '' });
      return;
    }

    setChangingPass(true);

    try {
      const res = await fetch('/api/admin/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword })
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setPassStatus({ error: '', success: 'Password changed successfully!' });
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setPassStatus({ error: data.error || 'Failed to change password.', success: '' });
      }
    } catch (err) {
      console.error('Password change error:', err);
      setPassStatus({ error: 'Network error. Please try again.', success: '' });
    } finally {
      setChangingPass(false);
    }
  };

  return (
    <main className="flex-grow max-w-container-max mx-auto w-full px-margin-mobile md:px-margin-desktop py-16 md:py-24 space-y-16 fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-outline-variant dark:border-[#333333] pb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className="material-symbols-outlined text-3xl text-primary dark:text-[#FAFAF8]">
              admin_panel_settings
            </span>
            <h1 className="font-display text-display-mobile md:text-display text-primary dark:text-[#FAFAF8]">
              Admin Dashboard
            </h1>
          </div>
          <p className="font-body-md text-secondary dark:text-[#A1A1A1]">
            Administrator Account: <span className="font-semibold text-primary dark:text-white">{user?.username}</span>
          </p>
        </div>

        <button
          onClick={() => onNavigate('home')}
          className="px-5 py-2.5 rounded-[14px] border border-outline-variant dark:border-[#333333] text-primary dark:text-white font-label-md hover:bg-surface-container-low dark:hover:bg-[#222222] transition-colors"
        >
          ← Back to Feed
        </button>
      </div>

      {/* Stats Cards */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-surface-container-lowest dark:bg-[#1A1A1A] border border-outline-variant dark:border-[#333333] rounded-[14px] p-8">
          <span className="font-label-sm uppercase tracking-widest text-secondary dark:text-[#A1A1A1]">
            Total Identities
          </span>
          <p className="font-display text-4xl text-primary dark:text-white mt-2">
            {loadingStats ? '...' : stats.userCount}
          </p>
        </div>

        <div className="bg-surface-container-lowest dark:bg-[#1A1A1A] border border-outline-variant dark:border-[#333333] rounded-[14px] p-8">
          <span className="font-label-sm uppercase tracking-widest text-secondary dark:text-[#A1A1A1]">
            Total Thoughts Published
          </span>
          <p className="font-display text-4xl text-primary dark:text-white mt-2">
            {loadingStats ? '...' : stats.thoughtCount}
          </p>
        </div>
      </section>

      {/* Admin Settings - Change Password */}
      <section className="bg-surface-container-lowest dark:bg-[#1A1A1A] border border-outline-variant dark:border-[#333333] rounded-[14px] p-8 md:p-12 max-w-2xl">
        <h2 className="font-headline-md text-headline-md text-primary dark:text-[#FAFAF8] mb-2">
          Security Settings
        </h2>
        <p className="font-body-md text-secondary dark:text-[#A1A1A1] mb-8">
          Update the administrator account password.
        </p>

        <form onSubmit={handleChangePassword} className="space-y-6">
          <div>
            <label className="font-label-sm text-secondary dark:text-[#A1A1A1] uppercase tracking-widest block mb-2">
              Current Password
            </label>
            <input
              type="password"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Enter current password"
              className="w-full bg-surface dark:bg-[#111111] border border-outline-variant dark:border-[#333333] rounded-[14px] p-4 text-primary dark:text-white focus:outline-none focus:border-primary dark:focus:border-white transition-colors"
            />
          </div>

          <div>
            <label className="font-label-sm text-secondary dark:text-[#A1A1A1] uppercase tracking-widest block mb-2">
              New Password
            </label>
            <input
              type="password"
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Enter new password (min. 8 characters)"
              className="w-full bg-surface dark:bg-[#111111] border border-outline-variant dark:border-[#333333] rounded-[14px] p-4 text-primary dark:text-white focus:outline-none focus:border-primary dark:focus:border-white transition-colors"
            />
          </div>

          <div>
            <label className="font-label-sm text-secondary dark:text-[#A1A1A1] uppercase tracking-widest block mb-2">
              Confirm New Password
            </label>
            <input
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter new password"
              className="w-full bg-surface dark:bg-[#111111] border border-outline-variant dark:border-[#333333] rounded-[14px] p-4 text-primary dark:text-white focus:outline-none focus:border-primary dark:focus:border-white transition-colors"
            />
          </div>

          {passStatus.error && (
            <p className="font-label-sm text-error dark:text-red-400">
              ✕ {passStatus.error}
            </p>
          )}

          {passStatus.success && (
            <p className="font-label-sm text-emerald-600 dark:text-emerald-400 font-medium">
              ✓ {passStatus.success}
            </p>
          )}

          <button
            type="submit"
            disabled={changingPass}
            className="bg-primary dark:bg-[#FAFAF8] text-on-primary dark:text-[#111111] font-label-md px-8 py-3 rounded-[14px] hover:opacity-80 transition-opacity disabled:opacity-50 cursor-pointer"
          >
            {changingPass ? 'Updating Password...' : 'Update Password'}
          </button>
        </form>
      </section>
    </main>
  );
}
