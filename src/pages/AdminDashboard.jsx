import React, { useState, useEffect, useCallback } from 'react';

export default function AdminDashboard({ user, onNavigate }) {
  const [activeTab, setActiveTab] = useState('messages'); // 'messages' | 'security'
  const [stats, setStats] = useState({ userCount: 0, thoughtCount: 0, contactCount: 0 });
  const [loadingStats, setLoadingStats] = useState(true);

  // Contact messages state
  const [messages, setMessages] = useState([]);
  const [loadingMessages, setLoadingMessages] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMessage, setSelectedMessage] = useState(null);

  // Password change form state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPass, setChangingPass] = useState(false);
  const [passStatus, setPassStatus] = useState({ error: '', success: '' });

  const fetchStats = useCallback(async () => {
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
  }, []);

  const fetchContactMessages = useCallback(async (query = '') => {
    setLoadingMessages(true);
    try {
      const url = query ? `/api/admin/contact-messages?search=${encodeURIComponent(query)}` : '/api/admin/contact-messages';
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
      }
    } catch (err) {
      console.error('Error fetching contact messages:', err);
    } finally {
      setLoadingMessages(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
    fetchContactMessages(searchQuery);
  }, [fetchStats, fetchContactMessages, searchQuery]);

  const handleDeleteMessage = async (msgId) => {
    if (!window.confirm('Are you sure you want to permanently delete this message?')) return;

    try {
      const res = await fetch(`/api/admin/contact-messages/${msgId}`, { method: 'DELETE' });
      if (res.ok) {
        setMessages((prev) => prev.filter((m) => m.id !== msgId));
        if (selectedMessage?.id === msgId) setSelectedMessage(null);
        fetchStats();
      }
    } catch (err) {
      console.error('Error deleting message:', err);
    }
  };

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
    <main className="flex-grow max-w-container-max mx-auto w-full px-margin-mobile md:px-margin-desktop py-12 md:py-20 space-y-12 fade-in">
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
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-surface-container-lowest dark:bg-[#1A1A1A] border border-outline-variant dark:border-[#333333] rounded-[14px] p-6">
          <span className="font-label-sm uppercase tracking-widest text-secondary dark:text-[#A1A1A1]">
            Total Identities
          </span>
          <p className="font-display text-3xl text-primary dark:text-white mt-2">
            {loadingStats ? '...' : stats.userCount}
          </p>
        </div>

        <div className="bg-surface-container-lowest dark:bg-[#1A1A1A] border border-outline-variant dark:border-[#333333] rounded-[14px] p-6">
          <span className="font-label-sm uppercase tracking-widest text-secondary dark:text-[#A1A1A1]">
            Thoughts Published
          </span>
          <p className="font-display text-3xl text-primary dark:text-white mt-2">
            {loadingStats ? '...' : stats.thoughtCount}
          </p>
        </div>

        <div className="bg-surface-container-lowest dark:bg-[#1A1A1A] border border-outline-variant dark:border-[#333333] rounded-[14px] p-6">
          <span className="font-label-sm uppercase tracking-widest text-secondary dark:text-[#A1A1A1]">
            Contact Messages
          </span>
          <p className="font-display text-3xl text-primary dark:text-white mt-2">
            {loadingStats ? '...' : stats.contactCount}
          </p>
        </div>
      </section>

      {/* Tab Navigation */}
      <div className="flex gap-4 border-b border-outline-variant dark:border-[#333333] pb-2">
        <button
          onClick={() => setActiveTab('messages')}
          className={`font-label-md py-2 px-4 rounded-t-lg transition-colors border-b-2 ${
            activeTab === 'messages'
              ? 'border-primary dark:border-white text-primary dark:text-white font-semibold'
              : 'border-transparent text-secondary dark:text-[#A1A1A1] hover:text-primary dark:hover:text-white'
          }`}
        >
          Contact Messages ({stats.contactCount})
        </button>

        <button
          onClick={() => setActiveTab('security')}
          className={`font-label-md py-2 px-4 rounded-t-lg transition-colors border-b-2 ${
            activeTab === 'security'
              ? 'border-primary dark:border-white text-primary dark:text-white font-semibold'
              : 'border-transparent text-secondary dark:text-[#A1A1A1] hover:text-primary dark:hover:text-white'
          }`}
        >
          Security & Password
        </button>
      </div>

      {/* TAB 1: CONTACT MESSAGES */}
      {activeTab === 'messages' && (
        <section className="space-y-6">
          {/* Search bar */}
          <div className="relative w-full max-w-md">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-secondary dark:text-dark-secondary text-[20px]">
              search
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by Username, User ID, or Message..."
              className="w-full pl-10 pr-4 py-2.5 bg-surface-container-lowest dark:bg-[#1A1A1A] border border-outline-variant dark:border-[#333333] rounded-[14px] text-body-md text-primary dark:text-white placeholder:text-outline focus:outline-none focus:border-primary dark:focus:border-white"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-secondary text-xs"
              >
                Clear
              </button>
            )}
          </div>

          {/* Messages List */}
          {loadingMessages ? (
            <div className="py-8 text-center text-secondary">Loading contact messages...</div>
          ) : messages.length === 0 ? (
            <div className="py-12 text-center border border-dashed border-outline-variant dark:border-[#333333] rounded-[14px]">
              <span className="material-symbols-outlined text-4xl text-outline mb-2">mail</span>
              <p className="font-body-md text-secondary dark:text-[#A1A1A1]">
                {searchQuery ? 'No messages match your search.' : 'No contact messages received yet.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className="bg-surface-container-lowest dark:bg-[#1A1A1A] border border-outline-variant dark:border-[#333333] rounded-[14px] p-6 transition-all space-y-4"
                >
                  <div className="flex flex-wrap justify-between items-start gap-2 border-b border-outline-variant/40 dark:border-[#333333] pb-3">
                    <div className="flex items-center gap-3">
                      <span className="font-label-md text-primary dark:text-white font-semibold">
                        👤 {msg.username}
                      </span>
                      <span className="font-label-sm text-secondary dark:text-[#A1A1A1] bg-surface dark:bg-[#111111] px-2 py-0.5 rounded-full border border-outline-variant/30">
                        ID: {msg.user_id ? msg.user_id : 'Anonymous'}
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      {msg.delivered_to_telegram === 1 ? (
                        <span className="font-label-sm text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 px-2.5 py-1 rounded-full border border-emerald-300 dark:border-emerald-800">
                          ✓ Sent to Telegram
                        </span>
                      ) : (
                        <span className="font-label-sm text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 px-2.5 py-1 rounded-full border border-amber-300 dark:border-amber-800">
                          ⏳ Pending Retry
                        </span>
                      )}

                      <span className="font-label-sm text-outline dark:text-dark-secondary text-xs">
                        {new Date(msg.created_at).toLocaleString()}
                      </span>

                      <button
                        onClick={() => handleDeleteMessage(msg.id)}
                        className="text-error hover:text-red-600 p-1 text-sm font-label-sm ml-2"
                        title="Delete permanently"
                      >
                        Delete
                      </button>
                    </div>
                  </div>

                  <p className="font-body-md text-primary dark:text-white whitespace-pre-line leading-relaxed">
                    {msg.message}
                  </p>

                  <div className="flex flex-wrap gap-4 text-xs font-label-sm text-secondary dark:text-[#A1A1A1] pt-2 border-t border-outline-variant/20 dark:border-[#2a2a2a]">
                    <span>📍 IP: {msg.ip_address || 'Unknown'}</span>
                    <span className="truncate max-w-md">🌐 Browser: {msg.user_agent || 'Unknown'}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* TAB 2: SECURITY & PASSWORD */}
      {activeTab === 'security' && (
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
      )}
    </main>
  );
}
