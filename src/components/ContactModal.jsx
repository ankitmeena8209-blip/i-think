import React, { useState } from 'react';

export default function ContactModal({ isOpen, onClose }) {
  const [submitted, setSubmitted] = useState(false);
  const [message, setMessage] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!message.trim()) return;
    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      setMessage('');
      onClose();
    }, 2000);
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
              Thank you. Your message has been received.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="font-label-sm text-secondary uppercase tracking-widest block mb-2">
                Message
              </label>
              <textarea
                required
                rows={4}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Write your thought or message here..."
                className="w-full bg-surface-container-lowest dark:bg-[#111111] border border-outline-variant dark:border-[#333333] rounded-[14px] p-4 text-primary dark:text-white focus:outline-none focus:border-primary dark:focus:border-white transition-colors"
              />
            </div>
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
                className="bg-primary dark:bg-[#FAFAF8] text-on-primary dark:text-[#111111] font-label-md px-6 py-3 rounded-[14px] hover:opacity-80 transition-opacity"
              >
                Send Message
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
