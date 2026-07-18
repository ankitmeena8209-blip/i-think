import React from 'react';

export default function Privacy({ onNavigate, onOpenContact }) {
  const sections = [
    {
      title: "1. Our Philosophy",
      content: "We built 'i think' so you can share your thoughts without feeling compelled to give up personal information. Privacy isn't an afterthought here; it is the foundational premise of the entire platform."
    },
    {
      title: "2. Information You Share",
      content: "The thoughts you post are inherently public. While we do not ask for your real name, any information you willingly type into a thought and publish will be visible to others. Please do not share sensitive personal information in your posts."
    },
    {
      title: "3. Personal Information",
      content: "We do not require, collect, or store your real name, photographs, physical address, or official identification to use the core features of 'i think'. You remain entirely pseudonymous by design."
    },
    {
      title: "4. Technical Information",
      content: "Like all websites, we collect basic technical information (such as IP addresses and browser types) necessary for the service to function securely, prevent abuse, and block malicious activity. We do not sell this data, ever."
    },
    {
      title: "5. Cookies",
      content: "We use only essential cookies required to maintain your session and ensure the platform operates securely. We do not use third-party tracking or advertising cookies."
    },
    {
      title: "6. Third-Party Services",
      content: "We rely on a few trusted infrastructure providers (like hosting services) to keep the site running. We share only the absolute minimum technical data necessary for them to provide these services."
    },
    {
      title: "7. Content Moderation",
      content: "While we value free thought, we maintain clear rules against abuse, harassment, and illegal content. Violating these rules may result in the removal of content or temporary/permanent bans based on technical identifiers, to protect the community."
    },
    {
      title: "8. Data Security",
      content: "We implement reasonable and modern security measures to protect the integrity of the platform and the technical data we temporarily hold. However, no internet transmission is 100% secure."
    },
    {
      title: "9. Changes to this Policy",
      content: "We may update this policy occasionally. The most current version will always be available on this page. Significant changes may be announced on the platform."
    },
    {
      title: "10. Contact",
      content: "If you have questions about this policy, please reach out via the contact information provided on our main website."
    }
  ];

  return (
    <main className="flex-grow w-full max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop py-16 md:py-24 fade-in">
      {/* Hero Section */}
      <div className="max-w-3xl mx-auto mb-16">
        <h1 className="font-display-mobile md:font-display text-display-mobile md:text-display text-primary dark:text-[#FAFAF8] mb-6">
          Privacy Policy
        </h1>
        <p className="font-body-lg text-body-lg text-secondary dark:text-[#A1A1A1]">
          Your thoughts belong to you. Your identity belongs to you too.
        </p>
      </div>

      {/* Editorial Card */}
      <article className="max-w-3xl mx-auto bg-surface-container-lowest dark:bg-[#1A1A1A] border border-outline-variant dark:border-[#333333] rounded-[14px] p-8 md:p-14 space-y-12 transition-colors">
        {sections.map((sec, idx) => (
          <React.Fragment key={idx}>
            <section>
              <h2 className="font-headline-md text-headline-md text-primary dark:text-[#FAFAF8] mb-3">
                {sec.title}
              </h2>
              <p className="font-body-md text-body-md text-on-surface-variant dark:text-[#A1A1A1] leading-relaxed">
                {sec.content}
              </p>
            </section>
            {idx < sections.length - 1 && (
              <hr className="border-t border-outline-variant dark:border-[#333333] opacity-50" />
            )}
          </React.Fragment>
        ))}
      </article>

      {/* Footer CTA */}
      <div className="max-w-3xl mx-auto mt-20 text-center space-y-6">
        <p className="font-label-md text-secondary dark:text-[#A1A1A1] italic">
          We believe privacy is a right, not a feature.
        </p>
        <div className="flex gap-4 flex-wrap justify-center">
          <button
            onClick={() => onNavigate('home')}
            className="inline-flex items-center justify-center bg-surface dark:bg-[#1A1A1A] border border-outline-variant dark:border-[#333333] text-primary dark:text-[#FAFAF8] rounded-[14px] px-6 py-3 font-label-md hover:bg-surface-container-low dark:hover:bg-[#222222] transition-colors"
          >
            <span className="material-symbols-outlined mr-2 text-sm">arrow_back</span>
            Back to Home
          </button>
          <button
            onClick={onOpenContact}
            className="inline-flex items-center justify-center bg-primary dark:bg-[#FAFAF8] text-on-primary dark:text-[#111111] rounded-[14px] px-8 py-3 font-label-md hover:opacity-90 transition-opacity"
          >
            Contact Us
          </button>
        </div>
      </div>
    </main>
  );
}
