import React, { useState, useEffect, useCallback } from 'react';

export default function AdminDashboard({ user, onNavigate, onLogout }) {
  // Navigation Tabs: 'dashboard' | 'users' | 'thoughts' | 'messages' | 'settings'
  const [activeTab, setActiveTab] = useState('dashboard');

  // Stats State
  const [stats, setStats] = useState({
    userCount: 0,
    thoughtCount: 0,
    contactCount: 0,
    messagesToday: 0,
    activeUsers: 0
  });
  const [loadingStats, setLoadingStats] = useState(true);

  // Users Page State
  const [usersList, setUsersList] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [usersSearch, setUsersSearch] = useState('');

  // Thoughts Page State
  const [thoughtsList, setThoughtsList] = useState([]);
  const [loadingThoughts, setLoadingThoughts] = useState(false);
  const [thoughtsSearch, setThoughtsSearch] = useState('');
  const [selectedThoughtIds, setSelectedThoughtIds] = useState([]);

  // Messages Page State
  const [messagesList, setMessagesList] = useState([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [messagesSearch, setMessagesSearch] = useState('');
  const [selectedMessage, setSelectedMessage] = useState(null);

  // Settings State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPass, setChangingPass] = useState(false);
  const [passStatus, setPassStatus] = useState({ error: '', success: '' });

  // 1. Fetch Stats
  const fetchStats = useCallback(async () => {
    setLoadingStats(true);
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

  // 2. Fetch Users
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
      console.error('Error fetching users:', err);
    } finally {
      setLoadingUsers(false);
    }
  }, []);

  // 3. Fetch Thoughts
  const fetchThoughts = useCallback(async (query = '') => {
    setLoadingThoughts(true);
    try {
      const url = query ? `/api/admin/thoughts?search=${encodeURIComponent(query)}` : '/api/admin/thoughts';
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setThoughtsList(data.thoughts || []);
        setSelectedThoughtIds([]);
      }
    } catch (err) {
      console.error('Error fetching thoughts:', err);
    } finally {
      setLoadingThoughts(false);
    }
  }, []);

  // 4. Fetch Messages
  const fetchMessages = useCallback(async (query = '') => {
    setLoadingMessages(true);
    try {
      const url = query ? `/api/admin/contact-messages?search=${encodeURIComponent(query)}` : '/api/admin/contact-messages';
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setMessagesList(data.messages || []);
      }
    } catch (err) {
      console.error('Error fetching messages:', err);
    } finally {
      setLoadingMessages(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    if (activeTab === 'users') fetchUsers(usersSearch);
    if (activeTab === 'thoughts') fetchThoughts(thoughtsSearch);
    if (activeTab === 'messages') fetchMessages(messagesSearch);
  }, [activeTab, usersSearch, thoughtsSearch, messagesSearch, fetchUsers, fetchThoughts, fetchMessages]);

  // Access Control Guard
  if (!user || !user.isAdmin) {
    return (
      <main className="flex-grow max-w-container-max mx-auto w-full px-6 py-24 text-center">
        <div className="bg-surface-container-lowest dark:bg-[#1A1A1A] border border-outline-variant dark:border-[#333333] rounded-[14px] p-12 max-w-md mx-auto">
          <span className="material-symbols-outlined text-5xl text-error mb-4">block</span>
          <h2 className="font-display text-headline-md text-primary dark:text-white mb-2">
            403 - Forbidden
          </h2>
          <p className="font-body-md text-secondary dark:text-[#A1A1A1] mb-6">
            Access restricted to authorized administrators only.
          </p>
          <button
            onClick={() => onNavigate('home')}
            className="bg-primary dark:bg-white text-on-primary dark:text-black font-label-md px-6 py-2.5 rounded-[14px]"
          >
            Return to Feed
          </button>
        </div>
      </main>
    );
  }

  // --- ACTIONS ---

  // User Actions
  const handleDeleteUser = async (userId, username) => {
    if (!window.confirm(`Are you sure you want to permanently delete identity "${username}" and all associated thoughts & sessions?`)) return;

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

  const handleDeleteAllUserThoughts = async (userId, username) => {
    if (!window.confirm(`Are you sure you want to delete ALL thoughts published by "${username}"?`)) return;

    try {
      const res = await fetch(`/api/admin/users/${userId}/thoughts`, { method: 'DELETE' });
      if (res.ok) {
        fetchUsers(usersSearch);
        fetchStats();
      }
    } catch (err) {
      console.error('Error deleting user thoughts:', err);
    }
  };

  // Thought Actions
  const handleDeleteThought = async (thoughtId) => {
    if (!window.confirm('Permanently delete this thought?')) return;

    try {
      const res = await fetch(`/api/admin/thoughts/${thoughtId}`, { method: 'DELETE' });
      if (res.ok) {
        setThoughtsList((prev) => prev.filter((t) => t.id !== thoughtId));
        setSelectedThoughtIds((prev) => prev.filter((id) => id !== thoughtId));
        fetchStats();
      }
    } catch (err) {
      console.error('Error deleting thought:', err);
    }
  };

  const handleBulkDeleteThoughts = async () => {
    if (selectedThoughtIds.length === 0) return;
    if (!window.confirm(`Permanently delete ${selectedThoughtIds.length} selected thoughts?`)) return;

    try {
      const res = await fetch('/api/admin/thoughts/bulk-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedThoughtIds })
      });

      if (res.ok) {
        setThoughtsList((prev) => prev.filter((t) => !selectedThoughtIds.includes(t.id)));
        setSelectedThoughtIds([]);
        fetchStats();
      }
    } catch (err) {
      console.error('Error bulk deleting thoughts:', err);
    }
  };

  const toggleSelectThought = (id) => {
    setSelectedThoughtIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAllThoughts = () => {
    if (selectedThoughtIds.length === thoughtsList.length) {
      setSelectedThoughtIds([]);
    } else {
      setSelectedThoughtIds(thoughtsList.map((t) => t.id));
    }
  };

  // Message Actions
  const handleDeleteMessage = async (msgId) => {
    if (!window.confirm('Permanently delete this contact message?')) return;

    try {
      const res = await fetch(`/api/admin/contact-messages/${msgId}`, { method: 'DELETE' });
      if (res.ok) {
        setMessagesList((prev) => prev.filter((m) => m.id !== msgId));
        if (selectedMessage?.id === msgId) setSelectedMessage(null);
        fetchStats();
      }
    } catch (err) {
      console.error('Error deleting message:', err);
    }
  };

  const handleResolveMessage = async (msgId) => {
    try {
      const res = await fetch(`/api/admin/contact-messages/${msgId}/resolve`, { method: 'PATCH' });
      if (res.ok) {
        setMessagesList((prev) =>
          prev.map((m) => (m.id === msgId ? { ...m, status: 'resolved' } : m))
        );
      }
    } catch (err) {
      console.error('Error resolving message:', err);
    }
  };

  // Password Change Handler
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
    <main className="flex-grow max-w-container-max mx-auto w-full px-margin-mobile md:px-margin-desktop py-12 md:py-20 space-y-10 fade-in">
      {/* Admin Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-outline-variant dark:border-[#333333] pb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className="material-symbols-outlined text-3xl text-primary dark:text-[#FAFAF8]">
              admin_panel_settings
            </span>
            <h1 className="font-display text-display-mobile md:text-display text-primary dark:text-[#FAFAF8]">
              Admin Panel
            </h1>
          </div>
          <p className="font-body-md text-secondary dark:text-[#A1A1A1]">
            Administrator: <span className="font-semibold text-primary dark:text-white">{user?.username}</span>
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => onNavigate('home')}
            className="px-5 py-2.5 rounded-[14px] border border-outline-variant dark:border-[#333333] text-primary dark:text-white font-label-md hover:bg-surface-container-low dark:hover:bg-[#222222] transition-colors cursor-pointer"
          >
            Feed View
          </button>
          <button
            onClick={onLogout}
            className="px-5 py-2.5 rounded-[14px] bg-red-600 hover:bg-red-700 text-white font-label-md transition-colors cursor-pointer"
          >
            Logout
          </button>
        </div>
      </div>

      {/* Dedicated Admin Navigation Bar */}
      <nav className="flex flex-wrap gap-3 border-b border-outline-variant dark:border-[#333333] pb-3">
        {[
          { id: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
          { id: 'users', label: 'Users', icon: 'group' },
          { id: 'thoughts', label: 'Thoughts', icon: 'rate_review' },
          { id: 'messages', label: 'Messages', icon: 'mail' },
          { id: 'settings', label: 'Settings', icon: 'settings' }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`font-label-md py-2.5 px-5 rounded-[14px] transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === tab.id
                ? 'bg-primary dark:bg-white text-on-primary dark:text-black font-medium shadow-sm'
                : 'bg-surface-container-lowest dark:bg-[#1A1A1A] text-secondary dark:text-[#A1A1A1] border border-outline-variant dark:border-[#333333] hover:text-primary dark:hover:text-white'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </nav>

      {/* 1. DASHBOARD TAB */}
      {activeTab === 'dashboard' && (
        <section className="space-y-8">
          <h2 className="font-headline-md text-headline-md text-primary dark:text-white">
            System Metrics Overview
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
            <div className="bg-surface-container-lowest dark:bg-[#1A1A1A] border border-outline-variant dark:border-[#333333] rounded-[14px] p-6 space-y-2">
              <span className="font-label-sm uppercase tracking-widest text-secondary dark:text-[#A1A1A1]">
                Total Users
              </span>
              <p className="font-display text-3xl text-primary dark:text-white">
                {loadingStats ? '...' : stats.userCount}
              </p>
            </div>

            <div className="bg-surface-container-lowest dark:bg-[#1A1A1A] border border-outline-variant dark:border-[#333333] rounded-[14px] p-6 space-y-2">
              <span className="font-label-sm uppercase tracking-widest text-secondary dark:text-[#A1A1A1]">
                Total Thoughts
              </span>
              <p className="font-display text-3xl text-primary dark:text-white">
                {loadingStats ? '...' : stats.thoughtCount}
              </p>
            </div>

            <div className="bg-surface-container-lowest dark:bg-[#1A1A1A] border border-outline-variant dark:border-[#333333] rounded-[14px] p-6 space-y-2">
              <span className="font-label-sm uppercase tracking-widest text-secondary dark:text-[#A1A1A1]">
                Contact Messages
              </span>
              <p className="font-display text-3xl text-primary dark:text-white">
                {loadingStats ? '...' : stats.contactCount}
              </p>
            </div>

            <div className="bg-surface-container-lowest dark:bg-[#1A1A1A] border border-outline-variant dark:border-[#333333] rounded-[14px] p-6 space-y-2">
              <span className="font-label-sm uppercase tracking-widest text-secondary dark:text-[#A1A1A1]">
                Messages Today
              </span>
              <p className="font-display text-3xl text-primary dark:text-white">
                {loadingStats ? '...' : stats.messagesToday}
              </p>
            </div>

            <div className="bg-surface-container-lowest dark:bg-[#1A1A1A] border border-outline-variant dark:border-[#333333] rounded-[14px] p-6 space-y-2">
              <span className="font-label-sm uppercase tracking-widest text-secondary dark:text-[#A1A1A1]">
                Active Users (7d)
              </span>
              <p className="font-display text-3xl text-primary dark:text-white">
                {loadingStats ? '...' : stats.activeUsers}
              </p>
            </div>
          </div>
        </section>
      )}

      {/* 2. USERS PAGE TAB */}
      {activeTab === 'users' && (
        <section className="space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h2 className="font-headline-md text-headline-md text-primary dark:text-white">
                Users Management
              </h2>
              <p className="font-body-md text-secondary dark:text-[#A1A1A1]">
                Search specifically by Identity (username) or User ID.
              </p>
            </div>

            {/* Dedicated Users Search Input */}
            <div className="relative w-full max-w-md">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-secondary dark:text-dark-secondary text-[20px]">
                search
              </span>
              <input
                type="text"
                value={usersSearch}
                onChange={(e) => setUsersSearch(e.target.value)}
                placeholder="Search Identity or User ID (e.g. usr_1)..."
                className="w-full pl-10 pr-8 py-2.5 bg-surface-container-lowest dark:bg-[#1A1A1A] border border-outline-variant dark:border-[#333333] rounded-[14px] text-body-md text-primary dark:text-white placeholder:text-outline focus:outline-none focus:border-primary dark:focus:border-white"
              />
              {usersSearch && (
                <button
                  onClick={() => setUsersSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-secondary text-xs"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Users Table / Grid */}
          {loadingUsers ? (
            <div className="py-8 text-center text-secondary">Loading user identities...</div>
          ) : usersList.length === 0 ? (
            <div className="py-12 text-center border border-dashed border-outline-variant dark:border-[#333333] rounded-[14px]">
              <span className="material-symbols-outlined text-4xl text-outline mb-2">group_off</span>
              <p className="font-body-md text-secondary dark:text-[#A1A1A1]">
                {usersSearch ? 'No user identities match your search.' : 'No user identities registered yet.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {usersList.map((usr) => (
                <div
                  key={usr.id}
                  className="bg-surface-container-lowest dark:bg-[#1A1A1A] border border-outline-variant dark:border-[#333333] rounded-[14px] p-6 space-y-4 flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="font-label-md text-primary dark:text-white font-semibold text-lg block">
                          👤 {usr.username}
                        </span>
                        <span className="font-label-sm text-xs text-secondary dark:text-[#A1A1A1] bg-surface dark:bg-[#111111] px-2.5 py-0.5 rounded-full border border-outline-variant/30 inline-block mt-1">
                          User ID: usr_{usr.id}
                        </span>
                      </div>
                      <span className="font-label-sm text-xs text-outline dark:text-dark-secondary">
                        {usr.thought_count || 0} thoughts
                      </span>
                    </div>

                    <div className="text-xs font-label-sm text-secondary dark:text-[#A1A1A1] space-y-1 pt-2 border-t border-outline-variant/20 dark:border-[#2a2a2a]">
                      <p>Joined: {new Date(usr.created_at).toLocaleDateString()}</p>
                      <p>Last Active: {usr.last_active ? new Date(usr.last_active).toLocaleString() : 'N/A'}</p>
                      <p>IP: {usr.ip_address || 'Unknown'}</p>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-2 border-t border-outline-variant/20 dark:border-[#2a2a2a]">
                    <button
                      onClick={() => handleDeleteAllUserThoughts(usr.id, usr.username)}
                      className="text-amber-600 dark:text-amber-400 hover:underline font-label-sm text-xs px-3 py-1.5 cursor-pointer"
                    >
                      Delete All Thoughts
                    </button>

                    <button
                      onClick={() => handleDeleteUser(usr.id, usr.username)}
                      className="text-error hover:text-red-600 font-label-sm text-xs px-3 py-1.5 rounded-[14px] border border-red-200 dark:border-red-900/50 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors cursor-pointer"
                    >
                      Delete User
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* 3. THOUGHTS PAGE TAB */}
      {activeTab === 'thoughts' && (
        <section className="space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h2 className="font-headline-md text-headline-md text-primary dark:text-white">
                Thoughts Management
              </h2>
              <p className="font-body-md text-secondary dark:text-[#A1A1A1]">
                Search specifically by Identity, Thought content, or User ID.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
              {selectedThoughtIds.length > 0 && (
                <button
                  onClick={handleBulkDeleteThoughts}
                  className="bg-red-600 hover:bg-red-700 text-white font-label-md px-4 py-2.5 rounded-[14px] transition-colors cursor-pointer"
                >
                  Delete Selected ({selectedThoughtIds.length})
                </button>
              )}

              <div className="relative w-full max-w-md">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-secondary dark:text-dark-secondary text-[20px]">
                  search
                </span>
                <input
                  type="text"
                  value={thoughtsSearch}
                  onChange={(e) => setThoughtsSearch(e.target.value)}
                  placeholder="Search Identity, Thought, or User ID..."
                  className="w-full pl-10 pr-8 py-2.5 bg-surface-container-lowest dark:bg-[#1A1A1A] border border-outline-variant dark:border-[#333333] rounded-[14px] text-body-md text-primary dark:text-white placeholder:text-outline focus:outline-none focus:border-primary dark:focus:border-white"
                />
                {thoughtsSearch && (
                  <button
                    onClick={() => setThoughtsSearch('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-secondary text-xs"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Bulk Select All Controls */}
          {thoughtsList.length > 0 && (
            <div className="flex items-center gap-3 bg-surface dark:bg-[#111111] px-4 py-2 rounded-[14px] border border-outline-variant/30">
              <input
                type="checkbox"
                checked={selectedThoughtIds.length === thoughtsList.length}
                onChange={toggleSelectAllThoughts}
                className="w-4 h-4 cursor-pointer"
              />
              <span className="font-label-sm text-secondary dark:text-[#A1A1A1]">
                Select All Thoughts ({thoughtsList.length})
              </span>
            </div>
          )}

          {/* Thoughts List */}
          {loadingThoughts ? (
            <div className="py-8 text-center text-secondary">Loading thoughts...</div>
          ) : thoughtsList.length === 0 ? (
            <div className="py-12 text-center border border-dashed border-outline-variant dark:border-[#333333] rounded-[14px]">
              <span className="material-symbols-outlined text-4xl text-outline mb-2">article</span>
              <p className="font-body-md text-secondary dark:text-[#A1A1A1]">
                {thoughtsSearch ? 'No thoughts match your search.' : 'No thoughts published yet.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {thoughtsList.map((th) => (
                <div
                  key={th.id}
                  className="bg-surface-container-lowest dark:bg-[#1A1A1A] border border-outline-variant dark:border-[#333333] rounded-[14px] p-6 space-y-3 flex items-start gap-4"
                >
                  <input
                    type="checkbox"
                    checked={selectedThoughtIds.includes(th.id)}
                    onChange={() => toggleSelectThought(th.id)}
                    className="w-4 h-4 mt-1.5 cursor-pointer"
                  />

                  <div className="flex-grow space-y-2">
                    <div className="flex flex-wrap justify-between items-center gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-label-md text-primary dark:text-white font-semibold">
                          👤 {th.username}
                        </span>
                        <span className="font-label-sm text-xs text-secondary dark:text-[#A1A1A1] bg-surface dark:bg-[#111111] px-2 py-0.5 rounded-full border border-outline-variant/30">
                          usr_{th.user_id}
                        </span>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="font-label-sm text-xs text-outline dark:text-dark-secondary">
                          {new Date(th.created_at).toLocaleString()}
                        </span>
                        <button
                          onClick={() => handleDeleteThought(th.id)}
                          className="text-error hover:text-red-600 font-label-sm text-xs px-2.5 py-1 rounded-[14px] border border-red-200 dark:border-red-900/50 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors cursor-pointer"
                        >
                          Delete
                        </button>
                      </div>
                    </div>

                    <p className="font-body-md text-primary dark:text-white whitespace-pre-line">
                      {th.content}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* 4. MESSAGES PAGE TAB */}
      {activeTab === 'messages' && (
        <section className="space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h2 className="font-headline-md text-headline-md text-primary dark:text-white">
                Contact Messages
              </h2>
              <p className="font-body-md text-secondary dark:text-[#A1A1A1]">
                Search specifically by Identity, User ID, or Message Content.
              </p>
            </div>

            {/* Dedicated Messages Search Input */}
            <div className="relative w-full max-w-md">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-secondary dark:text-dark-secondary text-[20px]">
                search
              </span>
              <input
                type="text"
                value={messagesSearch}
                onChange={(e) => setMessagesSearch(e.target.value)}
                placeholder="Search Identity, User ID, or Message..."
                className="w-full pl-10 pr-8 py-2.5 bg-surface-container-lowest dark:bg-[#1A1A1A] border border-outline-variant dark:border-[#333333] rounded-[14px] text-body-md text-primary dark:text-white placeholder:text-outline focus:outline-none focus:border-primary dark:focus:border-white"
              />
              {messagesSearch && (
                <button
                  onClick={() => setMessagesSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-secondary text-xs"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Messages List */}
          {loadingMessages ? (
            <div className="py-8 text-center text-secondary">Loading contact messages...</div>
          ) : messagesList.length === 0 ? (
            <div className="py-12 text-center border border-dashed border-outline-variant dark:border-[#333333] rounded-[14px]">
              <span className="material-symbols-outlined text-4xl text-outline mb-2">mail</span>
              <p className="font-body-md text-secondary dark:text-[#A1A1A1]">
                {messagesSearch ? 'No contact messages match your search.' : 'No contact messages received yet.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {messagesList.map((msg) => (
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
                        {msg.user_id ? `usr_${msg.user_id}` : 'Unauthenticated'}
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      {msg.status === 'resolved' ? (
                        <span className="font-label-sm text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/30 px-2.5 py-1 rounded-full border border-blue-300 dark:border-blue-800">
                          ✓ Resolved
                        </span>
                      ) : msg.delivered_to_telegram === 1 ? (
                        <span className="font-label-sm text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 px-2.5 py-1 rounded-full border border-emerald-300 dark:border-emerald-800">
                          ✓ Telegram Sent
                        </span>
                      ) : (
                        <span className="font-label-sm text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 px-2.5 py-1 rounded-full border border-amber-300 dark:border-amber-800">
                          ⏳ Pending Retry
                        </span>
                      )}

                      <span className="font-label-sm text-outline dark:text-dark-secondary text-xs">
                        {new Date(msg.created_at).toLocaleString()}
                      </span>

                      {msg.status !== 'resolved' && (
                        <button
                          onClick={() => handleResolveMessage(msg.id)}
                          className="text-blue-600 dark:text-blue-400 hover:underline font-label-sm text-xs"
                        >
                          Resolve
                        </button>
                      )}

                      <button
                        onClick={() => handleDeleteMessage(msg.id)}
                        className="text-error hover:text-red-600 font-label-sm text-xs"
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

      {/* 5. SETTINGS PAGE TAB */}
      {activeTab === 'settings' && (
        <section className="bg-surface-container-lowest dark:bg-[#1A1A1A] border border-outline-variant dark:border-[#333333] rounded-[14px] p-8 md:p-12 max-w-2xl space-y-8">
          <div>
            <h2 className="font-headline-md text-headline-md text-primary dark:text-[#FAFAF8] mb-2">
              Admin Security Settings
            </h2>
            <p className="font-body-md text-secondary dark:text-[#A1A1A1]">
              Update your administrator account password or destroy active session.
            </p>
          </div>

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

            <div className="flex flex-wrap gap-4 pt-2">
              <button
                type="submit"
                disabled={changingPass}
                className="bg-primary dark:bg-[#FAFAF8] text-on-primary dark:text-[#111111] font-label-md px-8 py-3 rounded-[14px] hover:opacity-80 transition-opacity disabled:opacity-50 cursor-pointer"
              >
                {changingPass ? 'Updating Password...' : 'Update Password'}
              </button>

              <button
                type="button"
                onClick={onLogout}
                className="border border-red-300 dark:border-red-900 text-red-600 dark:text-red-400 font-label-md px-6 py-3 rounded-[14px] hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors cursor-pointer"
              >
                Logout Administrator
              </button>
            </div>
          </form>
        </section>
      )}
    </main>
  );
}
