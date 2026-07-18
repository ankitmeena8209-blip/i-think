import React, { useState, useEffect, useCallback } from 'react';

export default function AdminDashboard({ user, onNavigate }) {
  const [activeTab, setActiveTab] = useState('messages'); // 'messages' | 'users' | 'security'
  const [stats, setStats] = useState({ userCount: 0, thoughtCount: 0, contactCount: 0 });
  const [loadingStats, setLoadingStats] = useState(true);

  // 1. MESSAGES SEARCH & LIST STATE
  const [messages, setMessages] = useState([]);
  const [loadingMessages, setLoadingMessages] = useState(true);
  const [messagesSearchQuery, setMessagesSearchQuery] = useState('');

  // 2. USERS SEARCH & LIST STATE (Completely independent from messages)
  const [usersList, setUsersList] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [usersSearchQuery, setUsersSearchQuery] = useState('');

  // 3. SECURITY & PASSWORD STATE
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPass, setChangingPass] = useState(false);
  const [passStatus, setPassStatus] = useState({ error: '', success: '' });

  // Fetch admin stats
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

  // Fetch contact messages (Messages Search)
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

  // Fetch users list (Users Search)
  const fetchUsers = useCallback(async (query = '') => {
    setLoadingUsers(true);
    try {
      const url = query ? `/api/admin/users?search=${encodeURIComponent(query)}` : '/api/admin/users';
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setUsersList(data.users || []);
      }
    } catch (err) {
      console.error('Error fetching users list:', err);
    } finally {
      setLoadingUsers(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    if (activeTab === 'messages') {
      fetchContactMessages(messagesSearchQuery);
    }
  }, [activeTab, messagesSearchQuery, fetchContactMessages]);

  useEffect(() => {
    if (activeTab === 'users') {
      fetchUsers(usersSearchQuery);
    }
  }, [activeTab, usersSearchQuery, fetchUsers]);

  // Handlers
  const handleDeleteMessage = async (msgId) => {
    if (!window.confirm('Are you sure you want to permanently delete this contact message?')) return;

    try {
      const res = await fetch(`/api/admin/contact-messages/${msgId}`, { method: 'DELETE' });
      if (res.ok) {
        setMessages((prev) => prev.filter((m) => m.id !== msgId));
        fetchStats();
      }
    } catch (err) {
      console.error('Error deleting message:', err);
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Are you sure you want to permanently delete this user identity?')) return;

    try {
      const res = await fetch(`/api/admin/users/${userId}`, { method: 'DELETE' });
      if (res.ok) {
        setUsersList((prev) => prev.filter((u) => u.id !== userId));
        fetchStats();
      }
    } catch (err) {
      console.error('Error deleting user:', err);
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
        setPassStatus({ error: '', success: 'Password updated successfully.' });
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setPassStatus({ error: data.error || 'Failed to update password.', success: '' });
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
          className="px-5 py-2.5 rounded-[14px] border border-outline-variant dark:border-[#333333] text-primary dark:text-white font-label-md hover:bg-surface-container-low dark:hover:bg-[#222222] transition-colors cursor-pointer"
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

      {/* Admin Tab Navigation */}
      <div className="flex gap-4 border-b border-outline-variant dark:border-[#333333] pb-2">
        <button
          onClick={() => setActiveTab('messages')}
          className={`font-label-md py-2 px-4 rounded-t-lg transition-colors border-b-2 cursor-pointer ${
            activeTab === 'messages'
              ? 'border-primary dark:border-white text-primary dark:text-white font-semibold'
              : 'border-transparent text-secondary dark:text-[#A1A1A1] hover:text-primary dark:hover:text-white'
          }`}
        >
          Contact Messages ({stats.contactCount})
        </button>

        <button
          onClick={() => setActiveTab('users')}
          className={`font-label-md py-2 px-4 rounded-t-lg transition-colors border-b-2 cursor-pointer ${
            activeTab === 'users'
              ? 'border-primary dark:border-white text-primary dark:text-white font-semibold'
              : 'border-transparent text-secondary dark:text-[#A1A1A1] hover:text-primary dark:hover:text-white'
          }`}
        >
          User Identities ({stats.userCount})
        </button>

        <button
          onClick={() => setActiveTab('security')}
          className={`font-label-md py-2 px-4 rounded-t-lg transition-colors border-b-2 cursor-pointer ${
            activeTab === 'security'
              ? 'border-primary dark:border-white text-primary dark:text-white font-semibold'
              : 'border-transparent text-secondary dark:text-[#A1A1A1] hover:text-primary dark:hover:text-white'
          }`}
        >
          Security & Password
        </button>
      </div>

      {/* TAB 1: CONTACT MESSAGES SEARCH & LIST */}
      {activeTab === 'messages' && (
        <section className="space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h2 className="font-headline-md text-headline-md text-primary dark:text-white">
                Contact Messages Search
              </h2>
              <p className="font-body-md text-secondary dark:text-[#A1A1A1]">
                Search specifically by Username, User ID, or Message Content.
              </p>
            </div>

            {/* Dedicated Messages Search Input */}
            <div className="relative w-full max-w-md">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-secondary dark:text-dark-secondary text-[20px]">
                search
              </span>
              <input
                type="text"
                value={messagesSearchQuery}
                onChange={(e) => setMessagesSearchQuery(e.target.value)}
                placeholder="Search Username, User ID, or Message..."
                className="w-full pl-10 pr-8 py-2.5 bg-surface-container-lowest dark:bg-[#1A1A1A] border border-outline-variant dark:border-[#333333] rounded-[14px] text-body-md text-primary dark:text-white placeholder:text-outline focus:outline-none focus:border-primary dark:focus:border-white"
              />
              {messagesSearchQuery && (
                <button
                  onClick={() => setMessagesSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-secondary hover:text-primary dark:hover:text-white text-xs"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Messages List */}
          {loadingMessages ? (
            <div className="py-8 text-center text-secondary">Loading contact messages...</div>
          ) : messages.length === 0 ? (
            <div className="py-12 text-center border border-dashed border-outline-variant dark:border-[#333333] rounded-[14px]">
              <span className="material-symbols-outlined text-4xl text-outline mb-2">mail</span>
              <p className="font-body-md text-secondary dark:text-[#A1A1A1]">
                {messagesSearchQuery ? 'No contact messages match your search.' : 'No contact messages received yet.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className="bg-surface-container-lowest dark:bg-[#1A1A1A] border border-outline-variant dark:border-[#333333] rounded-[14px] p-6 space-y-4"
                >
                  <div className="flex flex-wrap justify-between items-start gap-2 border-b border-outline-variant/40 dark:border-[#333333] pb-3">
                    <div className="flex items-center gap-3">
                      <span className="font-label-md text-primary dark:text-white font-semibold">
                        👤 {msg.username}
                      </span>
                      <span className="font-label-sm text-secondary dark:text-[#A1A1A1] bg-surface dark:bg-[#111111] px-2 py-0.5 rounded-full border border-outline-variant/30">
                        User ID: {msg.user_id ? msg.user_id : 'N/A'}
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
                        className="text-error hover:text-red-600 p-1 text-sm font-label-sm cursor-pointer ml-2"
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

      {/* TAB 2: USERS SEARCH & LIST (Completely independent from Messages) */}
      {activeTab === 'users' && (
        <section className="space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h2 className="font-headline-md text-headline-md text-primary dark:text-white">
                Users Search
              </h2>
              <p className="font-body-md text-secondary dark:text-[#A1A1A1]">
                Search specifically by Username or User ID.
              </p>
            </div>

            {/* Dedicated Users Search Input */}
            <div className="relative w-full max-w-md">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-secondary dark:text-dark-secondary text-[20px]">
                search
              </span>
              <input
                type="text"
                value={usersSearchQuery}
                onChange={(e) => setUsersSearchQuery(e.target.value)}
                placeholder="Search Username or User ID..."
                className="w-full pl-10 pr-8 py-2.5 bg-surface-container-lowest dark:bg-[#1A1A1A] border border-outline-variant dark:border-[#333333] rounded-[14px] text-body-md text-primary dark:text-white placeholder:text-outline focus:outline-none focus:border-primary dark:focus:border-white"
              />
              {usersSearchQuery && (
                <button
                  onClick={() => setUsersSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-secondary hover:text-primary dark:hover:text-white text-xs"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Users List */}
          {loadingUsers ? (
            <div className="py-8 text-center text-secondary">Loading user identities...</div>
          ) : usersList.length === 0 ? (
            <div className="py-12 text-center border border-dashed border-outline-variant dark:border-[#333333] rounded-[14px]">
              <span className="material-symbols-outlined text-4xl text-outline mb-2">person_search</span>
              <p className="font-body-md text-secondary dark:text-[#A1A1A1]">
                {usersSearchQuery ? 'No user identities match your search.' : 'No user identities registered yet.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {usersList.map((usr) => (
                <div
                  key={usr.id}
                  className="bg-surface-container-lowest dark:bg-[#1A1A1A] border border-outline-variant dark:border-[#333333] rounded-[14px] p-6 flex justify-between items-center"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-label-md text-primary dark:text-white font-semibold text-lg">
                        {usr.username}
                      </span>
                      <span className="font-label-sm text-xs text-secondary dark:text-[#A1A1A1] bg-surface dark:bg-[#111111] px-2 py-0.5 rounded-full border border-outline-variant/30">
                        ID: #{usr.id}
                      </span>
                    </div>
                    <p className="font-label-sm text-xs text-secondary dark:text-[#A1A1A1]">
                      Words: <span className="font-medium text-primary dark:text-white">{usr.word1}</span> + <span className="font-medium text-primary dark:text-white">{usr.word2}</span>
                    </p>
                    <p className="font-label-sm text-xs text-outline dark:text-dark-secondary">
                      Created: {new Date(usr.created_at).toLocaleDateString()}
                    </p>
                  </div>

                  <button
                    onClick={() => handleDeleteUser(usr.id)}
                    className="text-error hover:text-red-600 font-label-sm text-xs px-3 py-1.5 rounded-[14px] border border-red-200 dark:border-red-900/50 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors cursor-pointer"
                  >
                    Delete User
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* TAB 3: SECURITY & PASSWORD CHANGE */}
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
