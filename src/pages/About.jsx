import React from 'react';

export default function About({ onNavigate, onOpenContact }) {
  return (
    <main className="flex-grow max-w-container-max mx-auto w-full px-margin-mobile md:px-margin-desktop py-16 md:py-24 space-y-24 fade-in">
      {/* Header */}
      <header className="max-w-3xl space-y-6">
        <h1 className="font-display-mobile md:font-display text-display-mobile md:text-display text-primary dark:text-[#FAFAF8]">
          About
        </h1>
        <p className="font-body-lg text-body-lg text-secondary dark:text-[#A1A1A1] max-w-2xl leading-relaxed">
          A quiet place where words matter more than identities.
        </p>
      </header>

      {/* Story & Mission */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-24 border-t border-outline-variant dark:border-[#333333] pt-12 transition-colors">
        <article className="space-y-4">
          <h2 className="font-headline-md text-headline-md text-primary dark:text-[#FAFAF8]">
            Our Story
          </h2>
          <div className="space-y-4 text-secondary dark:text-[#A1A1A1] font-body-md leading-relaxed">
            <p>
              The modern internet has become a loud, crowded space. It often feels like a competition for attention, where the loudest voice wins and everything is measured in metrics of approval.
            </p>
            <p>
              We believed there needed to be a different kind of space. A space that stripped away the performative aspects of online connection and focused purely on the thought itself. Thus, <i>i think</i> was born.
            </p>
          </div>
        </article>

        <article className="space-y-4">
          <h2 className="font-headline-md text-headline-md text-primary dark:text-[#FAFAF8]">
            Our Mission
          </h2>
          <div className="space-y-4 text-secondary dark:text-[#A1A1A1] font-body-md leading-relaxed">
            <p>
              Our mission is to create a simple, unburdened space. We want to provide a sanctuary where you can express a thought, a feeling, or an observation without the weight of maintaining an online identity.
            </p>
            <p>
              We strip away the avatars, the bios, and the follower counts to let the words speak for themselves.
            </p>
          </div>
        </article>
      </section>

      {/* What Makes Us Different */}
      <section className="border-t border-outline-variant dark:border-[#333333] pt-12 max-w-3xl transition-colors">
        <h2 className="font-headline-md text-headline-md text-primary dark:text-[#FAFAF8] mb-8">
          What Makes Us Different
        </h2>
        <ul className="space-y-6">
          <li className="flex items-start gap-4">
            <span className="material-symbols-outlined text-primary dark:text-[#FAFAF8] mt-1">
              check_small
            </span>
            <div className="space-y-1">
              <h3 className="font-label-md text-label-md text-primary dark:text-[#FAFAF8] uppercase tracking-wider">
                No Follower Counts
              </h3>
              <p className="font-body-md text-secondary dark:text-[#A1A1A1]">
                Your value here isn't measured by an audience size.
              </p>
            </div>
          </li>
          <li className="flex items-start gap-4">
            <span className="material-symbols-outlined text-primary dark:text-[#FAFAF8] mt-1">
              check_small
            </span>
            <div className="space-y-1">
              <h3 className="font-label-md text-label-md text-primary dark:text-[#FAFAF8] uppercase tracking-wider">
                No Likes or Hearts
              </h3>
              <p className="font-body-md text-secondary dark:text-[#A1A1A1]">
                Thoughts are presented equally, not ranked by popularity.
              </p>
            </div>
          </li>
          <li className="flex items-start gap-4">
            <span className="material-symbols-outlined text-primary dark:text-[#FAFAF8] mt-1">
              check_small
            </span>
            <div className="space-y-1">
              <h3 className="font-label-md text-label-md text-primary dark:text-[#FAFAF8] uppercase tracking-wider">
                No Algorithms
              </h3>
              <p className="font-body-md text-secondary dark:text-[#A1A1A1]">
                A chronological feed where no machine decides what you should see.
              </p>
            </div>
          </li>
        </ul>
      </section>

      {/* Values Grid */}
      <section className="border-t border-outline-variant dark:border-[#333333] pt-12 transition-colors">
        <h2 className="font-headline-md text-headline-md text-primary dark:text-[#FAFAF8] mb-8">
          Our Values
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-surface-container-lowest dark:bg-[#1A1A1A] border border-outline-variant dark:border-[#333333] rounded-[14px] p-8 space-y-4 transition-colors">
            <h3 className="font-headline-lg text-headline-lg text-primary dark:text-[#FAFAF8]">Simplicity</h3>
            <p className="font-body-md text-secondary dark:text-[#A1A1A1]">
              We believe in removing friction between the mind and the page. The interface should never overshadow the idea.
            </p>
          </div>

          <div className="bg-surface-container-lowest dark:bg-[#1A1A1A] border border-outline-variant dark:border-[#333333] rounded-[14px] p-8 space-y-4 transition-colors">
            <h3 className="font-headline-lg text-headline-lg text-primary dark:text-[#FAFAF8]">Privacy</h3>
            <p className="font-body-md text-secondary dark:text-[#A1A1A1]">
              Your thoughts belong to you. We do not track, profile, or sell your data to third parties.
            </p>
          </div>

          <div className="bg-surface-container-lowest dark:bg-[#1A1A1A] border border-outline-variant dark:border-[#333333] rounded-[14px] p-8 space-y-4 transition-colors">
            <h3 className="font-headline-lg text-headline-lg text-primary dark:text-[#FAFAF8]">Respect</h3>
            <p className="font-body-md text-secondary dark:text-[#A1A1A1]">
              A quiet room demands mutual respect. We expect all participants to treat words with care.
            </p>
          </div>

          <div className="bg-surface-container-lowest dark:bg-[#1A1A1A] border border-outline-variant dark:border-[#333333] rounded-[14px] p-8 space-y-4 transition-colors">
            <h3 className="font-headline-lg text-headline-lg text-primary dark:text-[#FAFAF8]">Curiosity</h3>
            <p className="font-body-md text-secondary dark:text-[#A1A1A1]">
              We foster an environment where open-minded exploration is valued over rigid debate.
            </p>
          </div>
        </div>
      </section>

      {/* Quote */}
      <section className="border-t border-outline-variant dark:border-[#333333] pt-16 text-center max-w-3xl mx-auto space-y-8 transition-colors">
        <p className="font-body-lg text-secondary dark:text-[#A1A1A1] italic">
          "Not every thought deserves applause... sometimes, it simply deserves to exist."
        </p>
        <blockquote className="font-display text-display-mobile md:text-display text-primary dark:text-[#FAFAF8] leading-tight">
          "The world doesn't need more noise.<br />It needs more honest thoughts."
        </blockquote>
      </section>

      {/* Navigation CTA */}
      <section className="border-t border-outline-variant dark:border-[#333333] pt-12 flex flex-col items-center justify-center space-y-6 text-center transition-colors">
        <p className="font-body-md text-secondary dark:text-[#A1A1A1]">
          Thank you for being part of <i>i think</i>. One stranger. One thought. At a time.
        </p>
        <div className="flex gap-4 flex-wrap justify-center">
          <button
            onClick={() => onNavigate('home')}
            className="inline-flex items-center gap-2 border border-outline-variant dark:border-[#333333] text-primary dark:text-[#FAFAF8] px-6 py-3 rounded-[14px] font-label-md hover:bg-surface-container-low dark:hover:bg-[#222222] transition-colors"
          >
            <span className="material-symbols-outlined">arrow_back</span>
            Back to Home
          </button>

          <button
            onClick={onOpenContact}
            className="inline-flex items-center gap-2 bg-primary dark:bg-[#FAFAF8] text-on-primary dark:text-[#111111] px-6 py-3 rounded-[14px] font-label-md hover:opacity-80 transition-opacity"
          >
            Contact Us
          </button>
        </div>
      </section>
    </main>
  );
}
