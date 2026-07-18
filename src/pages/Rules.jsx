import React from 'react';

export default function Rules({ onNavigate, onOpenContact }) {
  const rulesList = [
    "Think before you publish. Your words become part of a public collection of human thoughts.",
    "Respect others. Disagreement is welcome. Harassment, bullying, or targeted abuse is not.",
    "No hate speech. Content that attacks or dehumanizes people based on protected characteristics is not allowed.",
    "No threats or encouragement of violence. Do not post content that threatens, promotes, or celebrates violence.",
    "No illegal content. Do not post anything that violates applicable laws.",
    "No personal information. Never share your own or someone else's private information.",
    "No spam. Do not flood the platform with repeated, promotional, or meaningless content.",
    "No scams or deception. Do not use the platform to mislead, impersonate others, or conduct fraud.",
    "Keep it text only. Images, links, advertisements, and promotional content are not supported.",
    "Your words are public. Anything you publish can be read by anyone. Think carefully before sharing.",
    "We value privacy. We do not ask for your real identity, but we reserve the right to remove content that harms others or the platform.",
    "Help keep this space meaningful. The goal is thoughtful expression, not attention or popularity."
  ];

  return (
    <main className="flex-grow max-w-container-max mx-auto w-full px-margin-mobile md:px-margin-desktop pt-16 md:pt-24 pb-24 fade-in">
      {/* Hero */}
      <div className="mb-16 max-w-3xl">
        <h1 className="font-display-mobile text-display-mobile md:font-display md:text-display text-primary dark:text-[#FAFAF8] mb-6">
          Rules
        </h1>
        <p className="font-body-lg text-body-lg text-secondary dark:text-[#A1A1A1] leading-relaxed">
          Freedom of expression exists alongside responsibility. These rules exist only to keep this space usable for everyone.
        </p>
      </div>

      {/* Rules Editorial Container */}
      <div className="bg-surface-container-lowest dark:bg-[#1A1A1A] rounded-[14px] border border-outline-variant dark:border-[#333333] p-6 md:p-12 transition-colors">
        <ul className="flex flex-col">
          {rulesList.map((ruleText, idx) => {
            const numStr = (idx + 1).toString().padStart(2, '0');
            return (
              <li
                key={idx}
                className="py-6 border-b border-outline-variant dark:border-[#333333] last:border-b-0 flex gap-4 md:gap-8 group"
              >
                <span className="font-headline-md text-headline-md text-outline-variant dark:text-[#555555] group-hover:text-primary dark:group-hover:text-[#FAFAF8] transition-colors shrink-0 w-8">
                  {numStr}
                </span>
                <div>
                  <p className="font-body-lg text-body-lg text-on-surface dark:text-[#FAFAF8] leading-relaxed">
                    {ruleText}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Navigation CTA */}
      <div className="mt-20 flex flex-col items-center text-center gap-8">
        <p className="font-body-lg text-secondary dark:text-[#A1A1A1] italic max-w-2xl">
          "Freedom of speech does not mean freedom from responsibility."
        </p>

        <div className="flex gap-4 flex-wrap justify-center">
          <button
            onClick={() => onNavigate('home')}
            className="inline-flex items-center justify-center h-12 px-6 rounded-[14px] border border-outline-variant dark:border-[#333333] hover:border-primary dark:hover:border-[#FAFAF8] text-primary dark:text-[#FAFAF8] font-label-md transition-colors bg-surface dark:bg-[#1A1A1A]"
          >
            ← Back to Home
          </button>
          <button
            onClick={onOpenContact}
            className="inline-flex items-center justify-center h-12 px-8 rounded-[14px] bg-primary dark:bg-[#FAFAF8] text-on-primary dark:text-[#111111] font-label-md transition-all hover:opacity-90"
          >
            Contact Us
          </button>
        </div>
      </div>
    </main>
  );
}
