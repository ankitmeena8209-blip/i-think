import React, { useState, useEffect, useCallback } from 'react';

export default function CreateIdentity({ onIdentityCreated, onCancel }) {
  const [word1, setWord1] = useState('');
  const [word2, setWord2] = useState('');
  const [checking, setChecking] = useState(false);
  const [availability, setAvailability] = useState(null); // { available: boolean, reason?: string, suggestions?: [] }
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Capitalize helpers
  const capitalize = (str) => {
    if (!str) return '';
    const clean = str.trim().replace(/[^a-zA-Z]/g, '');
    return clean.charAt(0).toUpperCase() + clean.slice(1).toLowerCase();
  };

  const formattedW1 = capitalize(word1);
  const formattedW2 = capitalize(word2);
  const previewUsername = `${formattedW1}${formattedW2}`;

  // Real-time DB check with debounce
  const checkAvailability = useCallback(async (w1, w2) => {
    if (!w1 || !w2 || w1.length < 3 || w2.length < 3) {
      setAvailability(null);
      setChecking(false);
      return;
    }

    setChecking(true);
    setErrorMsg('');

    try {
      const res = await fetch('/api/identity/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ word1: w1, word2: w2 })
      });
      const data = await res.json();
      setAvailability(data);
    } catch (err) {
      console.error('Error checking availability:', err);
      setAvailability({ available: false, reason: 'Network error checking availability.' });
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (formattedW1 && formattedW2) {
        checkAvailability(formattedW1, formattedW2);
      } else {
        setAvailability(null);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [formattedW1, formattedW2, checkAvailability]);

  // Generate for me handler
  const handleGenerate = async () => {
    setChecking(true);
    setErrorMsg('');
    try {
      const res = await fetch('/api/identity/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      if (data.success) {
        setWord1(data.word1);
        setWord2(data.word2);
      }
    } catch (err) {
      console.error('Failed to generate identity:', err);
    } finally {
      setChecking(false);
    }
  };

  // Submit / Continue handler
  const handleContinue = async () => {
    if (!formattedW1 || !formattedW2 || !availability?.available) return;

    setSubmitting(true);
    setErrorMsg('');

    try {
      const res = await fetch('/api/identity/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ word1: formattedW1, word2: formattedW2 })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        onIdentityCreated(data.user);
      } else {
        setErrorMsg(data.error || 'Failed to create identity.');
        if (data.suggestions) {
          setAvailability({ available: false, reason: data.error, suggestions: data.suggestions });
        }
      }
    } catch (err) {
      console.error('Error creating identity:', err);
      setErrorMsg('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSelectSuggestion = (sugg) => {
    setWord1(sugg.word1);
    setWord2(sugg.word2);
  };

  return (
    <div className="flex-grow flex flex-col items-center justify-center px-margin-mobile md:px-margin-desktop py-16 md:py-24 w-full max-w-container-max mx-auto relative fade-in">
      {/* Header */}
      <div className="text-center max-w-2xl mb-12">
        <h1 className="font-display text-display-mobile md:text-display text-primary dark:text-[#FAFAF8] mb-4">
          Create Your Identity
        </h1>
        <p className="font-body-lg text-secondary dark:text-[#A1A1A1]">
          Choose two simple words that represent you. We'll combine them into one unique identity that others will know you by.
        </p>
      </div>

      {/* Main Form Bento Card */}
      <div className="w-full max-w-xl bg-surface-container-lowest dark:bg-[#1A1A1A] border border-outline-variant dark:border-[#333333] rounded-[14px] p-8 md:p-12 shadow-sm flex flex-col gap-8 relative z-10 transition-colors">
        
        {/* Word Inputs */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 flex flex-col gap-2">
            <label className="font-label-sm text-secondary dark:text-[#A1A1A1] uppercase tracking-widest" htmlFor="word1">
              First Word
            </label>
            <div className="border border-outline-variant dark:border-[#333333] focus-within:border-primary dark:focus-within:border-white rounded-[14px] bg-surface dark:bg-[#111111] transition-colors flex items-center px-4 py-3">
              <input
                id="word1"
                type="text"
                maxLength={15}
                autoComplete="off"
                placeholder="e.g. Silent"
                value={word1}
                onChange={(e) => setWord1(e.target.value.replace(/[^a-zA-Z]/g, ''))}
                className="w-full bg-transparent border-none p-0 focus:ring-0 font-body-lg text-primary dark:text-white placeholder:text-outline-variant"
              />
            </div>
          </div>

          <div className="flex-1 flex flex-col gap-2">
            <label className="font-label-sm text-secondary dark:text-[#A1A1A1] uppercase tracking-widest" htmlFor="word2">
              Second Word
            </label>
            <div className="border border-outline-variant dark:border-[#333333] focus-within:border-primary dark:focus-within:border-white rounded-[14px] bg-surface dark:bg-[#111111] transition-colors flex items-center px-4 py-3">
              <input
                id="word2"
                type="text"
                maxLength={15}
                autoComplete="off"
                placeholder="e.g. River"
                value={word2}
                onChange={(e) => setWord2(e.target.value.replace(/[^a-zA-Z]/g, ''))}
                className="w-full bg-transparent border-none p-0 focus:ring-0 font-body-lg text-primary dark:text-white placeholder:text-outline-variant"
              />
            </div>
          </div>
        </div>

        <hr className="border-t border-outline-variant dark:border-[#333333] w-full" />

        {/* Live Preview Area */}
        <div className="flex flex-col items-center justify-center min-h-[110px] text-center gap-3">
          <label className="font-label-sm text-secondary dark:text-[#A1A1A1] uppercase tracking-widest">
            Your Identity
          </label>

          <h2 className="font-display text-3xl md:text-4xl text-primary dark:text-white tracking-tight" style={{ wordBreak: 'break-word' }}>
            {previewUsername ? (
              <>
                <span className="text-primary dark:text-white">{formattedW1}</span>
                <span className="text-secondary dark:text-dark-secondary">{formattedW2}</span>
              </>
            ) : (
              <span className="text-outline-variant">YourIdentity</span>
            )}
          </h2>

          {/* Status Indicator */}
          {checking ? (
            <div className="flex items-center gap-2 font-label-md text-secondary dark:text-[#A1A1A1]">
              <span className="w-2 h-2 rounded-full bg-yellow-500 pulse-status"></span>
              <span>Checking availability...</span>
            </div>
          ) : availability ? (
            availability.available ? (
              <div className="flex items-center gap-2 font-label-md text-emerald-600 dark:text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span>✓ Available</span>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-1 font-label-md text-error dark:text-red-400">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-red-500"></span>
                  <span>✕ {availability.reason || 'Already Taken'}</span>
                </div>
              </div>
            )
          ) : null}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-3">
          <button
            onClick={handleContinue}
            disabled={!availability?.available || submitting || checking}
            className="w-full bg-primary dark:bg-white text-on-primary dark:text-black font-label-md py-4 rounded-[14px] hover:opacity-90 transition-opacity cursor-pointer flex justify-center items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {submitting ? 'Creating Identity...' : 'Continue'}
            <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
          </button>

          <button
            type="button"
            onClick={handleGenerate}
            className="w-full bg-transparent border border-outline-variant dark:border-[#333333] text-primary dark:text-white font-label-md py-4 rounded-[14px] hover:bg-surface-container-low dark:hover:bg-[#222222] transition-colors cursor-pointer flex justify-center items-center gap-2"
          >
            <span className="material-symbols-outlined text-[18px]">casino</span>
            Generate For Me
          </button>
        </div>

        {/* Suggestions List if Taken */}
        {availability && !availability.available && availability.suggestions && availability.suggestions.length > 0 && (
          <div className="pt-4 border-t border-outline-variant dark:border-[#333333]">
            <p className="font-label-sm text-secondary dark:text-[#A1A1A1] uppercase tracking-widest mb-3 text-center">
              Available Alternatives (Click to select)
            </p>
            <div className="flex flex-wrap gap-2 justify-center">
              {availability.suggestions.map((sugg, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSelectSuggestion(sugg)}
                  className="font-label-sm px-3 py-2 rounded-[14px] bg-surface-container dark:bg-[#222222] hover:bg-primary hover:text-white dark:hover:bg-white dark:hover:text-black text-primary dark:text-white transition-all cursor-pointer border border-outline-variant/50 dark:border-[#444444]"
                >
                  {sugg.username}
                </button>
              ))}
            </div>
          </div>
        )}

        {errorMsg && (
          <p className="text-center font-label-sm text-error dark:text-red-400 mt-2">
            {errorMsg}
          </p>
        )}
      </div>

      {/* Contextual Banner */}
      <div className="w-full max-w-xl mt-12 flex flex-col gap-6">
        <div className="bg-surface-container-low dark:bg-[#1A1A1A] rounded-[14px] p-6 border border-outline-variant dark:border-[#333333]">
          <div className="flex items-start gap-4">
            <span className="material-symbols-outlined text-secondary dark:text-[#A1A1A1] mt-1">info</span>
            <div className="flex flex-col gap-2">
              <p className="font-body-md text-on-background dark:text-white">
                Your username is created by combining two simple words of your choice into one unique identity.{' '}
                <span className="font-bold">Example: Silent + River = SilentRiver.</span>
              </p>
              <p className="font-body-md text-secondary dark:text-[#A1A1A1]">
                This identity will be visible with every thought you publish, while your real identity always remains private.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-center gap-2 text-secondary dark:text-[#A1A1A1]">
          <span className="material-symbols-outlined text-[16px]">lock</span>
          <p className="font-label-sm uppercase tracking-widest text-center">
            No real name. No email. No phone. Just your chosen identity.
          </p>
        </div>
      </div>
    </div>
  );
}
