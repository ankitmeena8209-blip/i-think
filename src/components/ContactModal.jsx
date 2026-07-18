import React, { useState } from 'react';

export default function ContactModal({ isOpen, onClose }) {
  const [submitted, setSubmitted] = useState(false);
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [statusText, setStatusText] = useState('Thank you. Your message has been received.');
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmed = message.trim();
    if (!trimmed) return;

    if (trimmed.length > 1000) {
      setErrorMsg('Message cannot exceed 1000 characters.');
      return;
    }

    setSubmitting(true);
    setErrorMsg('');

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: trimmed })
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setStatusText(data.responseMessage || 'Your message has been sent successfully.');
        setSubmitted(true);
        setTimeout(() => {
          setSubmitted(false);
          setMessage('');
          onClose();
        }, 2000);
      } else {
        setErrorMsg(data.error || 'Failed to send message. Please try again.');
      }
    } catch (err) {
      console.error('Contact submission error:', err);
      setErrorMsg('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm fade-in">
      <div className="w-full max-w-lg bg-surface dark:bg-[#1A1A1A] border border-outline-variant dark:border-[#333333] rounded-[14px] p-8 relative shadow-xl">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-secondary hover:text-primary dark:hover:text-white transition-colors"
          aria-label="Close"
        >
          <span className="material-symbols-outlined">close</span>
        </button>

        <h3 className="font-display text-headline-md text-primary dark:text-[#FAFAF8] mb-2">
          Contact Us
        </h3>
        <p className="font-body-md text-secondary dark:text-[#A1A1A1] mb-6">
          Have feedback or an inquiry about <i>i think</i>? Leave your message below.
        </p>

        {submitted ? (
          <div className="py-8 text-center">
            <span className="material-symbols-outlined text-4xl text-primary dark:text-white mb-2">
              check_circle
            </span>
            <p className="font-body-lg text-primary dark:text-[#FAFAF8]">
              {statusText}
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="font-label-sm text-secondary uppercase tracking-widest block">
                  Message
                </label>
                <span className="font-label-sm text-outline dark:text-dark-secondary">
                  {message.length}/1000
                </span>
              </div>
              <textarea
                required
                rows={4}
                maxLength={1000}
                value={message}
                onChange={(e) => {
                  setMessage(e.target.value);
                  setErrorMsg('');
                }}
                placeholder="Write your thought or message here..."
                className="w-full bg-surface-container-lowest dark:bg-[#111111] border border-outline-variant dark:border-[#333333] rounded-[14px] p-4 text-primary dark:text-white focus:outline-none focus:border-primary dark:focus:border-white transition-colors"
              />
            </div>

            {errorMsg && (
              <p className="font-label-sm text-error dark:text-red-400">
                {errorMsg}
              </p>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-3 font-label-md text-secondary hover:text-primary dark:hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || !message.trim()}
                className="bg-primary dark:bg-[#FAFAF8] text-on-primary dark:text-[#111111] font-label-md px-6 py-3 rounded-[14px] hover:opacity-80 transition-opacity disabled:opacity-50 cursor-pointer"
              >
                {submitting ? 'Sending...' : 'Send Message'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
