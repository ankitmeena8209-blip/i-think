import React, { useState, useEffect } from 'react';

export default function AdminDashboard({ user, onNavigate, onLogout, onOpenAdminLogin }) {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [rawUsers, setRawUsers] = useState([]);
  const [rawThoughts, setRawThoughts] = useState([]);
  const [rawMessages, setRawMessages] = useState([]);

  const [loadingUsers, setLoadingUsers] = useState(true);
  const [loadingThoughts, setLoadingThoughts] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(true);

  // Search States
  const [usersSearch, setUsersSearch] = useState('');
  const [thoughtsSearch, setThoughtsSearch] = useState('');
  const [messagesSearch, setMessagesSearch] = useState('');
  const [selectedThoughtIds, setSelectedThoughtIds] = useState([]);

  // Settings State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPass, setChangingPass] = useState(false);
  const [passStatus, setPassStatus] = useState({ error: '', success: '' });
  const [broadcastContent, setBroadcastContent] = useState('');
  const [broadcasting, setBroadcasting] = useState(false);
  const [broadcastStatus, setBroadcastStatus] = useState({ error: '', success: '' });

  useEffect(() => {
    if (!user || !user.isAdmin) return;

    const loadAdminData = async () => {
      try {
        const [usersRes, thoughtsRes, messagesRes] = await Promise.all([
          fetch('/api/admin/users'),
          fetch('/api/admin/thoughts'),
          fetch('/api/admin/contact-messages')
        ]);

        const [usersPayload, thoughtsPayload, messagesPayload] = await Promise.all([
          usersRes.json(),
          thoughtsRes.json(),
          messagesRes.json()
        ]);

        setRawUsers((usersPayload.users || []).map((row) => ({
          id: row.id,
          username: row.username || 'Anonymous',
          word1: row.word1 || '',
          word2: row.word2 || '',
          is_admin: row.is_admin || 0,
          created_at: row.created_at,
          ip_address: row.ip_address || '127.0.0.1'
        })));

        setRawThoughts((thoughtsPayload.thoughts || []).map((row) => ({
          id: row.id,
          user_id: row.user_id || row.userId || null,
          username: row.username || 'Anonymous',
          content: row.content || '',
          created_at: row.created_at,
          ip_address: row.ip_address || '127.0.0.1'
        })));

        setRawMessages((messagesPayload.messages || []).map((row) => ({
          id: row.id,
          user_id: row.user_id || row.userId || null,
          username: row.username || 'Anonymous Stranger',
          message: row.message || '',
          status: row.status || 'pending_retry',
          delivered_to_telegram: row.delivered_to_telegram || row.deliveredToTelegram || 0,
          user_agent: row.user_agent || row.userAgent || 'Unknown',
          ip_address: row.ip_address || '127.0.0.1',
          created_at: row.created_at
        })));
      } catch (err) {
        console.error('Error loading admin data:', err);
      } finally {
        setLoadingUsers(false);
        setLoadingThoughts(false);
        setLoadingMessages(false);
      }
    };

    loadAdminData();
  }, [user]);

  // Derived Stats Overview
  const stats = React.useMemo(() => {
    const nonAdminUsers = rawUsers.filter((u) => !u.is_admin);
    const userCount = nonAdminUsers.length;
    const thoughtCount = rawThoughts.length;
    const contactCount = rawMessages.length;

    const todayStr = new Date().toISOString().split('T')[0];
    const messagesToday = rawMessages.filter((m) => m.created_at.startsWith(todayStr)).length;

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const activeUsersSet = new Set();
    rawThoughts.forEach((t) => {
      if (new Date(t.created_at) >= sevenDaysAgo) {
        activeUsersSet.add(t.username);
      }
    });

    return {
      userCount,
      thoughtCount,
      contactCount,
      messagesToday,
      activeUsers: activeUsersSet.size
    };
  }, [rawUsers, rawThoughts, rawMessages]);

  // Filtered Users List
  const filteredUsers = React.useMemo(() => {
    const list = rawUsers.filter((u) => !u.is_admin);
    if (!usersSearch.trim()) return list;
    const term = usersSearch.trim().toLowerCase();
    return list.filter(
      (u) =>
        u.username.toLowerCase().includes(term) ||
        String(u.id).toLowerCase().includes(term)
    );
  }, [rawUsers, usersSearch]);

  // Filtered Thoughts List
  const filteredThoughts = React.useMemo(() => {
    if (!thoughtsSearch.trim()) return rawThoughts;
    const term = thoughtsSearch.trim().toLowerCase();
    return rawThoughts.filter(
      (t) =>
        t.username.toLowerCase().includes(term) ||
        t.content.toLowerCase().includes(term) ||
        String(t.user_id).toLowerCase().includes(term)
    );
  }, [rawThoughts, thoughtsSearch]);

  // Filtered Messages List
  const filteredMessages = React.useMemo(() => {
    if (!messagesSearch.trim()) return rawMessages;
    const term = messagesSearch.trim().toLowerCase();
    return rawMessages.filter(
      (m) =>
        m.username.toLowerCase().includes(term) ||
        m.message.toLowerCase().includes(term) ||
        String(m.user_id || '').toLowerCase().includes(term)
    );
  }, [rawMessages, messagesSearch]);

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
          <div className="flex justify-center gap-3">
            {onOpenAdminLogin && (
              <button
                onClick={onOpenAdminLogin}
                className="bg-primary dark:bg-white text-on-primary dark:text-black font-label-md px-6 py-2.5 rounded-[14px] cursor-pointer"
              >
                Admin Sign In
              </button>
            )}
            <button
              onClick={() => onNavigate('home')}
              className="border border-outline-variant dark:border-[#444] text-primary dark:text-white font-label-md px-6 py-2.5 rounded-[14px] cursor-pointer"
            >
              Feed View
            </button>
          </div>
        </div>
      </main>
    );
  }

  // --- ACTIONS ---

  const handleDeleteUser = async (userId, username) => {
    if (!window.confirm(`Are you sure you want to permanently delete identity "${username}" and all associated thoughts?`)) return;

    try {
      const res = await fetch(`/api/admin/users/${userId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete user');
      setRawUsers((prev) => prev.filter((item) => item.id !== userId));
      setRawThoughts((prev) => prev.filter((item) => String(item.user_id) !== String(userId)));
    } catch (err) {
      console.error('Error deleting user:', err);
      alert('Failed to delete user.');
    }
  };

  const handleDeleteAllUserThoughts = async (userId, username) => {
    if (!window.confirm(`Are you sure you want to delete ALL thoughts published by "${username}"?`)) return;

    try {
      const res = await fetch(`/api/admin/users/${userId}/thoughts`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete user thoughts');
      setRawThoughts((prev) => prev.filter((item) => String(item.user_id) !== String(userId)));
    } catch (err) {
      console.error('Error deleting thoughts for user:', err);
      alert('Failed to delete user thoughts.');
    }
  };

  // Thought Actions
  const handleDeleteThought = async (thoughtId) => {
    if (!window.confirm('Permanently delete this thought?')) return;

    try {
      const res = await fetch(`/api/admin/thoughts/${thoughtId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete thought');
      setRawThoughts((prev) => prev.filter((item) => item.id !== thoughtId));
      setSelectedThoughtIds((prev) => prev.filter((id) => id !== thoughtId));
    } catch (err) {
      console.error('Error deleting thought:', err);
      alert('Failed to delete thought.');
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
      if (!res.ok) throw new Error('Failed to bulk delete thoughts');
      setRawThoughts((prev) => prev.filter((item) => !selectedThoughtIds.includes(item.id)));
      setSelectedThoughtIds([]);
    } catch (err) {
      console.error('Error bulk deleting thoughts:', err);
      alert('Failed to bulk delete thoughts.');
    }
  };

  const toggleSelectThought = (id) => {
    setSelectedThoughtIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAllThoughts = () => {
    if (selectedThoughtIds.length === filteredThoughts.length) {
      setSelectedThoughtIds([]);
    } else {
      setSelectedThoughtIds(filteredThoughts.map((t) => t.id));
    }
  };

  // Message Actions
  const handleDeleteMessage = async (msgId) => {
    if (!window.confirm('Permanently delete this contact message?')) return;

    try {
      const res = await fetch(`/api/admin/contact-messages/${msgId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete message');
      setRawMessages((prev) => prev.filter((item) => item.id !== msgId));
    } catch (err) {
      console.error('Error deleting contact message:', err);
      alert('Failed to delete contact message.');
    }
  };

  const handleResolveMessage = async (msgId) => {
    try {
      const res = await fetch(`/api/admin/contact-messages/${msgId}/resolve`, { method: 'PATCH' });
      if (!res.ok) throw new Error('Failed to resolve message');
      setRawMessages((prev) => prev.map((item) => item.id === msgId ? { ...item, status: 'resolved' } : item));
    } catch (err) {
      console.error('Error marking message as resolved:', err);
      alert('Failed to resolve message.');
    }
  };

  const handleBroadcastMessage = async (e) => {
    e.preventDefault();
    setBroadcastStatus({ error: '', success: '' });

    const content = broadcastContent.trim();
    if (!content) {
      setBroadcastStatus({ error: 'Please enter a message to publish.', success: '' });
      return;
    }

    setBroadcasting(true);

    try {
      const res = await fetch('/api/admin/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content })
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to publish announcement.');
      }

      if (data.thought) {
        setRawThoughts((prev) => [{ ...data.thought, user_id: data.thought.user_id || 'admin' }, ...prev]);
      }

      setBroadcastContent('');
      setBroadcastStatus({ error: '', success: 'Announcement published to the feed.' });
    } catch (err) {
      console.error('Broadcast error:', err);
      setBroadcastStatus({ error: err.message || 'Failed to publish announcement.', success: '' });
    } finally {
      setBroadcasting(false);
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
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to update password.');
      }

      setPassStatus({ error: '', success: 'Password updated successfully.' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      console.error('Password change error:', err);
      setPassStatus({ error: err.message || 'Failed to update password.', success: '' });
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
                {loadingUsers ? '...' : stats.userCount}
              </p>
            </div>

            <div className="bg-surface-container-lowest dark:bg-[#1A1A1A] border border-outline-variant dark:border-[#333333] rounded-[14px] p-6 space-y-2">
              <span className="font-label-sm uppercase tracking-widest text-secondary dark:text-[#A1A1A1]">
                Total Thoughts
              </span>
              <p className="font-display text-3xl text-primary dark:text-white">
                {loadingThoughts ? '...' : stats.thoughtCount}
              </p>
            </div>

            <div className="bg-surface-container-lowest dark:bg-[#1A1A1A] border border-outline-variant dark:border-[#333333] rounded-[14px] p-6 space-y-2">
              <span className="font-label-sm uppercase tracking-widest text-secondary dark:text-[#A1A1A1]">
                Contact Messages
              </span>
              <p className="font-display text-3xl text-primary dark:text-white">
                {loadingMessages ? '...' : stats.contactCount}
              </p>
            </div>

            <div className="bg-surface-container-lowest dark:bg-[#1A1A1A] border border-outline-variant dark:border-[#333333] rounded-[14px] p-6 space-y-2">
              <span className="font-label-sm uppercase tracking-widest text-secondary dark:text-[#A1A1A1]">
                Messages Today
              </span>
              <p className="font-display text-3xl text-primary dark:text-white">
                {loadingMessages ? '...' : stats.messagesToday}
              </p>
            </div>

            <div className="bg-surface-container-lowest dark:bg-[#1A1A1A] border border-outline-variant dark:border-[#333333] rounded-[14px] p-6 space-y-2">
              <span className="font-label-sm uppercase tracking-widest text-secondary dark:text-[#A1A1A1]">
                Active Users (7d)
              </span>
              <p className="font-display text-3xl text-primary dark:text-white">
                {loadingThoughts ? '...' : stats.activeUsers}
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
                placeholder="Search Identity or User ID..."
                className="w-full pl-10 pr-8 py-2.5 bg-surface-container-lowest dark:bg-[#1A1A1A] border border-outline-variant dark:border-[#333333] rounded-[14px] text-body-md text-primary dark:text-white placeholder:text-outline focus:outline-none focus:border-primary dark:focus:border-white"
              />
              {usersSearch && (
                <button
                  onClick={() => setUsersSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-secondary text-xs cursor-pointer"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Users Grid */}
          {loadingUsers ? (
            <div className="py-8 text-center text-secondary">Loading user identities...</div>
          ) : filteredUsers.length === 0 ? (
            <div className="py-12 text-center border border-dashed border-outline-variant dark:border-[#333333] rounded-[14px]">
              <span className="material-symbols-outlined text-4xl text-outline mb-2">group_off</span>
              <p className="font-body-md text-secondary dark:text-[#A1A1A1]">
                {usersSearch ? 'No user identities match your search.' : 'No user identities registered yet.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredUsers.map((usr) => {
                const userThoughtCount = rawThoughts.filter(
                  (t) => t.username === usr.username || String(t.user_id) === String(usr.id)
                ).length;

                return (
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
                            ID: {usr.id}
                          </span>
                        </div>
                        <span className="font-label-sm text-xs text-outline dark:text-dark-secondary">
                          {userThoughtCount} thoughts
                        </span>
                      </div>

                      <div className="text-xs font-label-sm text-secondary dark:text-[#A1A1A1] space-y-1 pt-2 border-t border-outline-variant/20 dark:border-[#2a2a2a]">
                        <p>Words: {usr.word1} + {usr.word2}</p>
                        <p>Joined: {new Date(usr.created_at).toLocaleDateString()}</p>
                        <p>IP: {usr.ip_address}</p>
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
                );
              })}
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
                  placeholder="Search Identity, Thought, or ID..."
                  className="w-full pl-10 pr-8 py-2.5 bg-surface-container-lowest dark:bg-[#1A1A1A] border border-outline-variant dark:border-[#333333] rounded-[14px] text-body-md text-primary dark:text-white placeholder:text-outline focus:outline-none focus:border-primary dark:focus:border-white"
                />
                {thoughtsSearch && (
                  <button
                    onClick={() => setThoughtsSearch('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-secondary text-xs cursor-pointer"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Bulk Select All Controls */}
          {filteredThoughts.length > 0 && (
            <div className="flex items-center gap-3 bg-surface dark:bg-[#111111] px-4 py-2 rounded-[14px] border border-outline-variant/30">
              <input
                type="checkbox"
                checked={selectedThoughtIds.length === filteredThoughts.length}
                onChange={toggleSelectAllThoughts}
                className="w-4 h-4 cursor-pointer"
              />
              <span className="font-label-sm text-secondary dark:text-[#A1A1A1]">
                Select All Thoughts ({filteredThoughts.length})
              </span>
            </div>
          )}

          {/* Thoughts List */}
          {loadingThoughts ? (
            <div className="py-8 text-center text-secondary">Loading thoughts...</div>
          ) : filteredThoughts.length === 0 ? (
            <div className="py-12 text-center border border-dashed border-outline-variant dark:border-[#333333] rounded-[14px]">
              <span className="material-symbols-outlined text-4xl text-outline mb-2">article</span>
              <p className="font-body-md text-secondary dark:text-[#A1A1A1]">
                {thoughtsSearch ? 'No thoughts match your search.' : 'No thoughts published yet.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {filteredThoughts.map((th) => (
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
                          {th.user_id}
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
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-secondary text-xs cursor-pointer"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Messages List */}
          {loadingMessages ? (
            <div className="py-8 text-center text-secondary">Loading contact messages...</div>
          ) : filteredMessages.length === 0 ? (
            <div className="py-12 text-center border border-dashed border-outline-variant dark:border-[#333333] rounded-[14px]">
              <span className="material-symbols-outlined text-4xl text-outline mb-2">mail</span>
              <p className="font-body-md text-secondary dark:text-[#A1A1A1]">
                {messagesSearch ? 'No contact messages match your search.' : 'No contact messages received yet.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {filteredMessages.map((msg) => (
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
                        {msg.user_id ? `ID: ${msg.user_id}` : 'Unauthenticated'}
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
                          className="text-blue-600 dark:text-blue-400 hover:underline font-label-sm text-xs cursor-pointer"
                        >
                          Resolve
                        </button>
                      )}

                      <button
                        onClick={() => handleDeleteMessage(msg.id)}
                        className="text-error hover:text-red-600 font-label-sm text-xs cursor-pointer"
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
              Update your administrator account password.
            </p>
          </div>

          <form onSubmit={handleBroadcastMessage} className="space-y-6 border-b border-outline-variant/40 dark:border-[#333333] pb-8">
            <div>
              <label className="font-label-sm text-secondary dark:text-[#A1A1A1] uppercase tracking-widest block mb-2">
                Publish Feed Announcement
              </label>
              <textarea
                required
                value={broadcastContent}
                onChange={(e) => setBroadcastContent(e.target.value)}
                placeholder="Write a message for the public feed..."
                maxLength={300}
                rows={4}
                className="w-full bg-surface dark:bg-[#111111] border border-outline-variant dark:border-[#333333] rounded-[14px] p-4 text-primary dark:text-white focus:outline-none focus:border-primary dark:focus:border-white transition-colors"
              />
              <p className="mt-2 text-xs text-secondary dark:text-[#A1A1A1]">
                {broadcastContent.length}/300 characters
              </p>
            </div>

            {broadcastStatus.error && (
              <p className="font-label-sm text-error dark:text-red-400">
                ✕ {broadcastStatus.error}
              </p>
            )}

            {broadcastStatus.success && (
              <p className="font-label-sm text-emerald-600 dark:text-emerald-400 font-medium">
                ✓ {broadcastStatus.success}
              </p>
            )}

            <button
              type="submit"
              disabled={broadcasting}
              className="bg-primary dark:bg-[#FAFAF8] text-on-primary dark:text-[#111111] font-label-md px-8 py-3 rounded-[14px] hover:opacity-80 transition-opacity disabled:opacity-50 cursor-pointer"
            >
              {broadcasting ? 'Publishing...' : 'Publish Announcement'}
            </button>
          </form>

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
