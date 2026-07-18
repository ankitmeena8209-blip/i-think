import React, { useState } from 'react';

export default function Footer({ onNavigate, onOpenAdminLogin }) {
  const [clickCount, setClickCount] = useState(0);

  const handleQuoteClick = () => {
    const next = clickCount + 1;
    setClickCount(next);
    if (next >= 3 && onOpenAdminLogin) {
      setClickCount(0);
      onOpenAdminLogin();
    }
  };

  return (
    <footer className="w-full py-16 border-t border-outline-variant dark:border-[#333333] bg-surface dark:bg-[#111111] mt-auto transition-colors duration-300">
      <div className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop flex flex-col md:flex-row justify-between items-center gap-8">
        <button
          onClick={() => onNavigate('home')}
          className="font-display text-headline-md text-primary dark:text-[#FAFAF8] transition-colors duration-300 hover:opacity-70 cursor-pointer"
        >
          i think
        </button>

        <div className="flex items-center gap-6">
          <button
            onClick={() => onNavigate('about')}
            className="font-label-sm text-label-sm text-secondary dark:text-[#A1A1A1] hover:text-primary dark:hover:text-[#FAFAF8] transition-colors duration-300 cursor-pointer"
          >
            About
          </button>
          <button
            onClick={() => onNavigate('rules')}
            className="font-label-sm text-label-sm text-secondary dark:text-[#A1A1A1] hover:text-primary dark:hover:text-[#FAFAF8] transition-colors duration-300 cursor-pointer"
          >
            Rules
          </button>
          <button
            onClick={() => onNavigate('privacy')}
            className="font-label-sm text-label-sm text-secondary dark:text-[#A1A1A1] hover:text-primary dark:hover:text-[#FAFAF8] transition-colors duration-300 cursor-pointer"
          >
            Privacy
          </button>
        </div>

        <p
          onClick={handleQuoteClick}
          className="font-body-md text-body-md text-secondary dark:text-[#A1A1A1] transition-colors duration-300 select-none cursor-default"
          title="Words remain. People don't."
        >
          Words remain. People don't.
        </p>
      </div>
    </footer>
  );
}
