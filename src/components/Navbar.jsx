import React, { useState } from 'react';

export default function Navbar({ activePage, onNavigate, user, onLogout, isDark, onToggleTheme }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { id: 'about', label: 'About' },
    { id: 'rules', label: 'Rules' },
    { id: 'privacy', label: 'Privacy' }
  ];

  const isAdmin = user && user.isAdmin;

  return (
    <nav className="w-full h-16 border-b border-outline-variant dark:border-[#333333] bg-surface dark:bg-[#1A1A1A] sticky top-0 z-50 transition-colors duration-300">
      <div className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop flex justify-between items-center w-full h-full">
        {/* Brand Anchor */}
        <button
          onClick={() => onNavigate('home')}
          className="font-display text-headline-md font-semibold text-primary dark:text-[#FAFAF8] transition-colors duration-300 hover:opacity-80 flex items-center gap-2 cursor-pointer"
        >
          i think
        </button>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-8">
          {navItems.map((item) => {
            const isActive = activePage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`font-label-md text-label-md transition-colors duration-300 cursor-pointer ${
                  isActive
                    ? 'text-primary dark:text-[#FAFAF8] font-medium border-b-2 border-primary dark:border-[#FAFAF8] py-4'
                    : 'text-secondary dark:text-[#A1A1A1] hover:text-primary dark:hover:text-[#FAFAF8]'
                }`}
              >
                {item.label}
              </button>
            );
          })}

          {/* ADMIN USER STATE ONLY: Shows Admin Dashboard link & Logout button */}
          {isAdmin && (
            <div className="flex items-center gap-4 ml-4 pl-4 border-l border-outline-variant dark:border-[#333333]">
              <button
                onClick={() => onNavigate('admin')}
                className={`font-label-sm text-label-sm px-3 py-1 rounded-full border transition-colors flex items-center gap-1 cursor-pointer ${
                  activePage === 'admin'
                    ? 'bg-primary text-white dark:bg-white dark:text-black border-primary'
                    : 'border-outline-variant dark:border-[#444] text-primary dark:text-white hover:opacity-80'
                }`}
              >
                <span className="material-symbols-outlined text-[14px]">admin_panel_settings</span>
                Admin Dashboard
              </button>

              <button
                onClick={onLogout}
                className="font-label-sm text-label-sm text-secondary dark:text-[#A1A1A1] hover:text-error dark:hover:text-red-400 transition-colors cursor-pointer"
                title="Logout"
              >
                Logout
              </button>
            </div>
          )}

          {/* NORMAL UNAUTHENTICATED USER STATE: Create Identity Button */}
          {!user && (
            <button
              onClick={() => onNavigate('identity')}
              className="font-label-sm text-label-sm bg-primary dark:bg-[#FAFAF8] text-on-primary dark:text-[#111111] px-4 py-2 rounded-[14px] ml-2 hover:opacity-80 transition-opacity cursor-pointer"
            >
              Create Identity
            </button>
          )}

          {/* Theme Toggle */}
          <button
            onClick={onToggleTheme}
            className="material-symbols-outlined text-secondary dark:text-[#A1A1A1] hover:text-primary dark:hover:text-[#FAFAF8] transition-colors p-2 rounded-full cursor-pointer"
            aria-label="Toggle Dark Mode"
          >
            {isDark ? 'light_mode' : 'dark_mode'}
          </button>
        </div>

        {/* Mobile Menu Toggle */}
        <div className="flex items-center gap-2 md:hidden">
          <button
            onClick={onToggleTheme}
            className="material-symbols-outlined text-secondary dark:text-[#A1A1A1] p-1"
            aria-label="Toggle Dark Mode"
          >
            {isDark ? 'light_mode' : 'dark_mode'}
          </button>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="material-symbols-outlined text-primary dark:text-[#FAFAF8] p-1"
          >
            {mobileMenuOpen ? 'close' : 'menu'}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-surface dark:bg-[#1A1A1A] border-b border-outline-variant dark:border-[#333333] px-6 py-4 flex flex-col gap-4 shadow-lg fade-in">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                onNavigate(item.id);
                setMobileMenuOpen(false);
              }}
              className="text-left font-label-md py-2 text-primary dark:text-white border-b border-outline-variant/30"
            >
              {item.label}
            </button>
          ))}

          {isAdmin ? (
            <div className="flex justify-between items-center py-2 text-label-md border-t border-outline-variant/30 pt-4">
              <button
                onClick={() => {
                  onNavigate('admin');
                  setMobileMenuOpen(false);
                }}
                className="text-primary dark:text-white font-medium"
              >
                Admin Dashboard
              </button>
              <button
                onClick={() => {
                  onLogout();
                  setMobileMenuOpen(false);
                }}
                className="text-error font-medium"
              >
                Logout
              </button>
            </div>
          ) : (
            !user && (
              <button
                onClick={() => {
                  onNavigate('identity');
                  setMobileMenuOpen(false);
                }}
                className="w-full text-center font-label-md bg-primary dark:bg-white text-on-primary dark:text-black py-3 rounded-[14px]"
              >
                Create Identity
              </button>
            )
          )}
        </div>
      )}
    </nav>
  );
}
