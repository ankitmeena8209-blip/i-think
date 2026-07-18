import React, { useState } from 'react';

export default function AdminLoginModal({ isOpen, onClose, onLoginSuccess }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password) return;

    setLoading(true);
    setErrorMsg('');

    try {
      const res = await fetch('/api/auth/admin-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        onLoginSuccess(data.user);
        setUsername('');
        setPassword('');
        onClose();
      } else {
        setErrorMsg(data.error || 'Invalid credentials.');
      }
    } catch (err) {
      console.error('Admin login error:', err);
      setErrorMsg('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm fade-in">
      <div className="w-full max-w-md bg-surface dark:bg-[#1A1A1A] border border-outline-variant dark:border-[#333333] rounded-[14px] p-8 relative shadow-xl">
        <button
          onClick={() => {
            setUsername('');
            setPassword('');
            onClose();
          }}
          className="absolute top-4 right-4 text-secondary hover:text-primary dark:hover:text-white transition-colors"
          aria-label="Close"
        >
          <span className="material-symbols-outlined">close</span>
        </button>

        <div className="flex items-center gap-2 mb-2 text-primary dark:text-[#FAFAF8]">
          <span className="material-symbols-outlined text-2xl">admin_panel_settings</span>
          <h3 className="font-display text-headline-md">Admin Portal</h3>
        </div>

        <p className="font-body-md text-secondary dark:text-[#A1A1A1] mb-6">
          Log in with administrator credentials.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
          <div>
            <label className="font-label-sm text-secondary uppercase tracking-widest block mb-1">
              Admin Username
            </label>
            <input
              type="text"
              required
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="none"
              spellCheck="false"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Username"
              className="w-full bg-surface-container-lowest dark:bg-[#111111] border border-outline-variant dark:border-[#333333] rounded-[14px] p-3 text-primary dark:text-white focus:outline-none focus:border-primary dark:focus:border-white"
            />
          </div>

          <div>
            <label className="font-label-sm text-secondary uppercase tracking-widest block mb-1">
              Admin Password
            </label>
            <input
              type="password"
              required
              autoComplete="off"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              className="w-full bg-surface-container-lowest dark:bg-[#111111] border border-outline-variant dark:border-[#333333] rounded-[14px] p-3 text-primary dark:text-white focus:outline-none focus:border-primary dark:focus:border-white"
            />
          </div>

          {errorMsg && (
            <p className="font-label-sm text-error dark:text-red-400 text-center">
              {errorMsg}
            </p>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => {
                setUsername('');
                setPassword('');
                onClose();
              }}
              className="px-5 py-3 font-label-md text-secondary hover:text-primary dark:hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="bg-primary dark:bg-[#FAFAF8] text-on-primary dark:text-[#111111] font-label-md px-6 py-3 rounded-[14px] hover:opacity-80 transition-opacity disabled:opacity-50"
            >
              {loading ? 'Authenticating...' : 'Sign In'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
