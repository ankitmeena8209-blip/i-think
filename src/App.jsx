import React, { useState, useEffect } from 'react';
import { auth } from './lib/firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { getUserSession, saveUserSession, clearUserSession } from './lib/userSession';

import Navbar from './components/Navbar';
import Footer from './components/Footer';
import ContactModal from './components/ContactModal';
import AdminLoginModal from './components/AdminLoginModal';
import Home from './pages/Home';
import CreateIdentity from './pages/CreateIdentity';
import About from './pages/About';
import Rules from './pages/Rules';
import Privacy from './pages/Privacy';
import AdminDashboard from './pages/AdminDashboard';

export default function App() {
  const [activePage, setActivePage] = useState('home'); // 'home' | 'identity' | 'about' | 'rules' | 'privacy' | 'admin'
  const [user, setUser] = useState(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem('theme');
    if (saved) return saved === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });
  const [isContactOpen, setIsContactOpen] = useState(false);
  const [isAdminLoginOpen, setIsAdminLoginOpen] = useState(false);

  // Apply dark mode class to <html> element
  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDark]);

  // Check auth session & restore persistent identity on mount
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        const storedAdmin = localStorage.getItem('ithink_admin_user');
        const restoredUser = getUserSession();

        if (firebaseUser && storedAdmin) {
          const parsedAdmin = JSON.parse(storedAdmin);
          setUser({ ...parsedAdmin, uid: firebaseUser.uid });
          setActivePage('admin');
        } else if (storedAdmin) {
          const parsedAdmin = JSON.parse(storedAdmin);
          setUser(parsedAdmin);
          setActivePage('admin');
        } else if (restoredUser) {
          setUser(restoredUser);
          if (window.location.hash === '#admin' || window.location.pathname.startsWith('/admin')) {
            setIsAdminLoginOpen(true);
          } else {
            setActivePage('home');
          }
        } else {
          // Check backend server session fallback
          try {
            const res = await fetch('/api/auth/me');
            const data = await res.json();
            if (data.authenticated && data.user) {
              setUser(data.user);
              saveUserSession(data.user);
              if (data.user.isAdmin) {
                setActivePage('admin');
              } else {
                setActivePage('home');
              }
            } else {
              setUser(null);
              if (window.location.hash === '#admin' || window.location.pathname.startsWith('/admin')) {
                setIsAdminLoginOpen(true);
              }
              setActivePage('identity');
            }
          } catch (e) {
            setUser(null);
            if (window.location.hash === '#admin' || window.location.pathname.startsWith('/admin')) {
              setIsAdminLoginOpen(true);
            }
            setActivePage('identity');
          }
        }
      } catch (err) {
        console.error('Error verifying session:', err);
        setActivePage('identity');
      } finally {
        setLoadingAuth(false);
      }
    });

    // Listen for #admin hash change
    const handleHashChange = () => {
      if (window.location.hash === '#admin') {
        setIsAdminLoginOpen(true);
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    window.addEventListener('popstate', handleHashChange);

    return () => {
      unsubscribe();
      window.removeEventListener('hashchange', handleHashChange);
      window.removeEventListener('popstate', handleHashChange);
    };
  }, []);

  const handleToggleTheme = () => {
    setIsDark((prev) => !prev);
  };

  const handleIdentityCreated = (newUser) => {
    setUser(newUser);
    saveUserSession(newUser);
    setActivePage('home');
  };

  const handleAdminLoggedIn = (adminUser) => {
    setUser(adminUser);
    localStorage.setItem('ithink_admin_user', JSON.stringify(adminUser));
    setActivePage('admin');
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error('Firebase signOut error:', err);
    }

    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (err) {
      // Non-blocking
    } finally {
      setUser(null);
      clearUserSession();

      if (window.location.hash === '#admin') {
        window.history.replaceState(null, '', window.location.pathname);
      }
      setActivePage('identity');
    }
  };

  const handleNavigate = (page) => {
    if (page === 'admin' && (!user || !user.isAdmin)) {
      setIsAdminLoginOpen(true);
    }
    setActivePage(page);
  };

  if (loadingAuth) {
    return (
      <div className="min-h-screen bg-surface dark:bg-[#111111] flex items-center justify-center text-secondary dark:text-dark-secondary font-label-md">
        Initializing i think...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface dark:bg-[#111111] text-on-surface dark:text-[#FAFAF8] flex flex-col font-body-md transition-colors duration-300">
      <Navbar
        activePage={activePage}
        onNavigate={handleNavigate}
        user={user}
        onLogout={handleLogout}
        isDark={isDark}
        onToggleTheme={handleToggleTheme}
      />

      <div className="flex-grow flex flex-col">
        {activePage === 'identity' && (
          <CreateIdentity
            onIdentityCreated={handleIdentityCreated}
            onCancel={() => setActivePage(user ? 'home' : 'identity')}
          />
        )}
        {activePage === 'home' && (
          <Home
            user={user}
            onRequireIdentity={() => setActivePage('identity')}
            onOpenContact={() => setIsContactOpen(true)}
          />
        )}
        {activePage === 'about' && (
          <About
            onNavigate={handleNavigate}
            onOpenContact={() => setIsContactOpen(true)}
          />
        )}
        {activePage === 'rules' && (
          <Rules
            onNavigate={handleNavigate}
            onOpenContact={() => setIsContactOpen(true)}
          />
        )}
        {activePage === 'privacy' && (
          <Privacy
            onNavigate={handleNavigate}
            onOpenContact={() => setIsContactOpen(true)}
          />
        )}
        {activePage === 'admin' && (
          <AdminDashboard
            user={user}
            onNavigate={handleNavigate}
            onLogout={handleLogout}
            onOpenAdminLogin={() => setIsAdminLoginOpen(true)}
          />
        )}
      </div>

      <Footer
        onNavigate={handleNavigate}
        onOpenAdminLogin={() => setIsAdminLoginOpen(true)}
      />

      <ContactModal
        isOpen={isContactOpen}
        onClose={() => setIsContactOpen(false)}
        user={user}
      />

      <AdminLoginModal
        isOpen={isAdminLoginOpen}
        onClose={() => setIsAdminLoginOpen(false)}
        onLoginSuccess={handleAdminLoggedIn}
      />
    </div>
  );
}
