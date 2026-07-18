import React, { useState, useEffect, useCallback } from 'react';

// Relative time formatter
function formatTimeAgo(dateString) {
  if (!dateString) return 'Just now';
  const now = new Date();
  const date = new Date(dateString.includes('Z') ? dateString : dateString + 'Z');
  const seconds = Math.floor((now - date) / 1000);

  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min${minutes > 1 ? 's' : ''} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr${hours > 1 ? 's' : ''} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days > 1 ? 's' : ''} ago`;
}

export default function Home({ user, onRequireIdentity, onOpenContact }) {
  const [thoughtInput, setThoughtInput] = useState('');
  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState('');

  const [thoughts, setThoughts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState('latest'); // 'latest' | 'top'
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  // Fetch thoughts from API
  const fetchThoughts = useCallback(async (isReset = false, currentPage = 1) => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams({
        sort,
        search,
        page: currentPage,
        limit: 15
      });

      const res = await fetch(`/api/thoughts?${queryParams.toString()}`);
      const data = await res.json();

      if (isReset) {
        setThoughts(data.thoughts || []);
      } else {
        setThoughts((prev) => [...prev, ...(data.thoughts || [])]);
      }
      setHasMore(data.hasMore || false);
    } catch (err) {
      console.error('Error fetching thoughts:', err);
    } finally {
      setLoading(false);
    }
  }, [sort, search]);

  useEffect(() => {
    setPage(1);
    fetchThoughts(true, 1);
  }, [sort, search, fetchThoughts]);

  // Publish handler
  const handlePublish = async () => {
    if (!user) {
      onRequireIdentity();
      return;
    }

    const trimmed = thoughtInput.trim();
    if (!trimmed) return;
    if (trimmed.length > 300) {
      setPublishError('Thought cannot exceed 300 characters.');
      return;
    }

    setPublishing(true);
    setPublishError('');

    try {
      const res = await fetch('/api/thoughts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: trimmed })
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setThoughtInput('');
        setThoughts((prev) => [data.thought, ...prev]);
      } else {
        setPublishError(data.error || 'Failed to publish thought.');
      }
    } catch (err) {
      console.error('Error publishing thought:', err);
      setPublishError('Network error. Please try again.');
    } finally {
      setPublishing(false);
    }
  };

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchThoughts(false, nextPage);
  };

  const charCount = thoughtInput.length;
  const isNearLimit = charCount > 280;

  return (
    <main className="flex-grow max-w-container-max mx-auto w-full px-margin-mobile md:px-margin-desktop py-12 md:py-24 flex flex-col items-center">
      {/* Hero Header */}
      <header className="text-center mb-12 fade-in w-full max-w-2xl">
        <h1 className="font-display text-display-mobile md:text-display text-primary dark:text-dark-primary mb-4 transition-colors">
          i think
        </h1>
        <p className="font-body-lg text-body-lg text-secondary dark:text-dark-secondary transition-colors">
          A place where strangers leave thoughts, not identities.
        </p>
      </header>

      {/* Input Section */}
      <section className="w-full max-w-2xl mb-16 fade-in" style={{ transitionDelay: '0.1s' }}>
        <div className="bg-surface-container-lowest dark:bg-dark-surface border border-outline-variant dark:border-dark-border rounded-[14px] p-6 focus-within:border-primary dark:focus-within:border-dark-primary transition-colors">
          <textarea
            id="thought-input"
            maxLength={300}
            rows={4}
            value={thoughtInput}
            onChange={(e) => {
              setThoughtInput(e.target.value);
              setPublishError('');
            }}
            placeholder={user ? `What's on your mind, ${user.username}?` : "What's on your mind? (Create identity to publish)"}
            className="w-full bg-transparent border-none resize-none outline-none font-body-lg text-body-lg text-primary dark:text-dark-primary placeholder-outline dark:placeholder-dark-secondary p-0 focus:ring-0 transition-colors"
          />

          <div className="flex justify-between items-center mt-4 pt-2 border-t border-outline-variant/30 dark:border-dark-border/40">
            <span
              id="char-count"
              className={`font-label-sm text-label-sm transition-colors ${
                isNearLimit ? 'text-error dark:text-red-400 font-semibold' : 'text-outline dark:text-dark-secondary'
              }`}
            >
              {charCount}/300
            </span>

            <button
              onClick={handlePublish}
              disabled={publishing || charCount === 0}
              className="bg-primary dark:bg-dark-primary text-on-primary dark:text-dark-bg font-label-md text-label-md px-6 py-3 rounded-[14px] hover:opacity-80 transition-all duration-300 flex items-center gap-2 group cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {publishing ? 'Publishing...' : 'Publish'}
              <span className="material-symbols-outlined text-[16px] group-hover:translate-x-1 transition-transform">
                arrow_forward
              </span>
            </button>
          </div>
        </div>

        {publishError && (
          <p className="font-label-sm text-error dark:text-red-400 mt-2 px-2">
            {publishError}
          </p>
        )}
      </section>

      {/* Feed Section */}
      <section className="w-full max-w-2xl fade-in" style={{ transitionDelay: '0.2s' }}>
        {/* Controls: Header + Search + Tabs */}
        <div className="flex flex-col gap-4 mb-8 pb-4 border-b border-outline-variant dark:border-dark-border">
          <div className="flex items-center justify-between">
            <h2 className="font-headline-md text-headline-md text-primary dark:text-dark-primary">
              Recent Thoughts
            </h2>

            {/* Tabs */}
            <div className="flex gap-2">
              <button
                onClick={() => setSort('latest')}
                className={`font-label-sm text-label-sm px-3 py-1.5 rounded-full transition-colors cursor-pointer ${
                  sort === 'latest'
                    ? 'text-primary dark:text-dark-bg bg-surface-variant dark:bg-dark-primary font-medium'
                    : 'text-secondary dark:text-dark-secondary hover:text-primary dark:hover:text-dark-primary'
                }`}
              >
                Latest
              </button>
              <button
                onClick={() => setSort('top')}
                className={`font-label-sm text-label-sm px-3 py-1.5 rounded-full transition-colors cursor-pointer ${
                  sort === 'top'
                    ? 'text-primary dark:text-dark-bg bg-surface-variant dark:bg-dark-primary font-medium'
                    : 'text-secondary dark:text-dark-secondary hover:text-primary dark:hover:text-dark-primary'
                }`}
              >
                Top
              </button>
            </div>
          </div>

          {/* Search bar */}
          <div className="relative w-full">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-secondary dark:text-dark-secondary text-[20px]">
              search
            </span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search thoughts or identities..."
              className="w-full pl-10 pr-4 py-2.5 bg-surface-container-lowest dark:bg-dark-surface border border-outline-variant dark:border-dark-border rounded-[14px] text-body-md text-primary dark:text-white placeholder:text-outline focus:outline-none focus:border-primary dark:focus:border-white transition-colors"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-secondary hover:text-primary dark:hover:text-white text-xs"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Feed List */}
        <div className="flex flex-col gap-6" id="feed-container">
          {thoughts.map((item) => (
            <article
              key={item.id}
              className="bg-surface-container-lowest dark:bg-dark-surface border border-outline-variant dark:border-dark-border rounded-[14px] p-6 hover:shadow-[0_10px_30px_rgba(0,0,0,0.04)] dark:hover:shadow-[0_10px_30px_rgba(255,255,255,0.02)] transition-all duration-300 transform hover:-translate-y-0.5"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-surface-variant dark:bg-dark-bg flex items-center justify-center transition-colors">
                    <span className="material-symbols-outlined text-[14px] text-secondary dark:text-dark-secondary">
                      person
                    </span>
                  </div>
                  <span className="font-label-md text-label-md text-primary dark:text-dark-primary font-medium">
                    {item.username}
                  </span>
                </div>
                <span className="font-label-sm text-label-sm text-outline dark:text-dark-secondary">
                  {formatTimeAgo(item.created_at)}
                </span>
              </div>
              <p className="font-body-md text-body-md text-on-surface dark:text-dark-primary leading-relaxed whitespace-pre-line">
                {item.content}
              </p>
            </article>
          ))}

          {/* Loading state */}
          {loading && (
            <div className="py-8 text-center text-secondary dark:text-dark-secondary font-label-md">
              Loading thoughts...
            </div>
          )}

          {/* Empty state */}
          {!loading && thoughts.length === 0 && (
            <div className="py-16 text-center border border-outline-variant dark:border-dark-border border-dashed rounded-[14px] transition-colors">
              <span className="material-symbols-outlined text-4xl text-outline dark:text-dark-secondary mb-4">
                edit_note
              </span>
              <p className="font-body-md text-body-md text-secondary dark:text-dark-secondary">
                {search ? 'No thoughts found matching your search.' : 'Be the first stranger to leave a thought.'}
              </p>
            </div>
          )}

          {/* Load More Button */}
          {!loading && hasMore && (
            <div className="flex justify-center mt-4">
              <button
                onClick={handleLoadMore}
                className="font-label-md text-secondary dark:text-dark-secondary hover:text-primary dark:hover:text-white px-6 py-2.5 rounded-[14px] border border-outline-variant dark:border-dark-border transition-colors"
              >
                Load More Thoughts
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Contact Button */}
      <div className="w-full max-w-2xl mt-16 flex justify-center fade-in" style={{ transitionDelay: '0.3s' }}>
        <button
          onClick={onOpenContact}
          className="bg-primary dark:bg-dark-primary text-on-primary dark:text-dark-bg font-label-md text-label-md px-8 py-3 rounded-[14px] hover:opacity-80 transition-all duration-300 flex items-center gap-2 group cursor-pointer"
        >
          Contact Us
          <span className="material-symbols-outlined text-[16px] group-hover:translate-x-1 transition-transform">
            mail
          </span>
        </button>
      </div>
    </main>
  );
}
