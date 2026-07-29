import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { sanitizeText, containsProfanity } from '../lib/moderation';

// Relative time formatter
function formatTimeAgo(dateString) {
  if (!dateString) return 'Just now';
  const now = new Date();
  const date = new Date(dateString.includes('Z') ? dateString : dateString + 'Z');
  const seconds = Math.floor((now - date) / 1000);

  if (isNaN(seconds) || seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min${minutes > 1 ? 's' : ''} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr${hours > 1 ? 's' : ''} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days > 1 ? 's' : ''} ago`;
}

const PAGE_LIMIT = 15;

export default function Home({ user, onRequireIdentity, onOpenContact }) {
  const [thoughtInput, setThoughtInput] = useState('');
  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState('');
  const [publishSuccess, setPublishSuccess] = useState('');

  const [thoughts, setThoughts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');
  const [sort, setSort] = useState('latest'); // 'latest' | 'top'
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const successTimerRef = useRef(null);

  // ──────────────────────────────────────────────────────────────────────────
  // Fetch thoughts from Supabase
  // ──────────────────────────────────────────────────────────────────────────
  const fetchThoughts = useCallback(async (reset = false) => {
    const currentPage = reset ? 0 : page;
    if (reset) {
      setLoading(true);
      setFetchError('');
    } else {
      setLoadingMore(true);
    }

    try {
      const from = currentPage * PAGE_LIMIT;
      const to = from + PAGE_LIMIT; // we fetch PAGE_LIMIT + 1 to detect if there are more

      if (!supabase) {
        const res = await fetch(`/api/thoughts?sort=${sort}&limit=${PAGE_LIMIT + 1}`);
        const payload = await res.json();
        const items = (payload.thoughts || []).map((row) => ({
          id: row.id,
          username: row.username || 'Anonymous',
          content: row.content || '',
          created_at: row.created_at,
          contentLength: (row.content || '').length,
        }));

        if (sort === 'top') {
          items.sort((a, b) => b.contentLength - a.contentLength);
        }

        if (reset) {
          setThoughts(items);
          setPage(1);
        } else {
          setThoughts((prev) => [...prev, ...items]);
          setPage((p) => p + 1);
        }

        setHasMore(items.length > PAGE_LIMIT);
        if (reset) setLoading(false);
        setLoadingMore(false);
        return;
      }

      let query = supabase
        .from('thoughts')
        .select('id, username, content, created_at')
        .range(from, to);

      if (sort === 'latest') {
        query = query.order('created_at', { ascending: false });
      }
      // 'top' sort is done client-side by thought length (same behaviour as before)

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching thoughts from Supabase:', error);
        setFetchError('Failed to load thoughts. Please try refreshing the page.');
        if (reset) setThoughts([]);
        return;
      }

      const fetchedMore = data.length > PAGE_LIMIT;
      const items = (fetchedMore ? data.slice(0, PAGE_LIMIT) : data).map((row) => ({
        id: row.id,
        username: row.username || 'Anonymous',
        content: row.content || '',
        created_at: row.created_at,
        contentLength: (row.content || '').length,
      }));

      if (sort === 'top') {
        items.sort((a, b) => b.contentLength - a.contentLength);
      }

      if (reset) {
        setThoughts(items);
        setPage(1);
      } else {
        setThoughts((prev) => [...prev, ...items]);
        setPage((p) => p + 1);
      }

      setHasMore(fetchedMore);
    } catch (err) {
      console.error('Unexpected error fetching thoughts:', err);
      setFetchError('An unexpected error occurred. Please try again.');
      if (reset) setThoughts([]);
    } finally {
      if (reset) setLoading(false);
      setLoadingMore(false);
    }
  }, [sort, page]);

  // Reset and refetch whenever sort changes
  useEffect(() => {
    setPage(0);
    fetchThoughts(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sort]);

  // ──────────────────────────────────────────────────────────────────────────
  // Publish a new thought to Supabase
  // ──────────────────────────────────────────────────────────────────────────
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

    if (containsProfanity(trimmed)) {
      setPublishError('Your thought contains offensive language.');
      return;
    }

    setPublishing(true);
    setPublishError('');
    setPublishSuccess('');

    try {
      const sanitized = sanitizeText(trimmed);

      if (!supabase) {
        const res = await fetch('/api/thoughts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: sanitized })
        });
        const payload = await res.json();
        if (!res.ok || payload.error) {
          throw new Error(payload.error || 'Failed to publish thought.');
        }

        const newThought = {
          id: payload.thought?.id,
          username: payload.thought?.username || user.username,
          content: payload.thought?.content || sanitized,
          created_at: payload.thought?.created_at,
          contentLength: (payload.thought?.content || sanitized).length,
        };

        setThoughtInput('');
        setThoughts((prev) => sort === 'latest' ? [newThought, ...prev] : [...prev, newThought]);
        setPublishSuccess('Your thought has been published!');
        if (successTimerRef.current) clearTimeout(successTimerRef.current);
        successTimerRef.current = setTimeout(() => setPublishSuccess(''), 3000);
        return;
      }

      const { data, error } = await supabase
        .from('thoughts')
        .insert([{ user_id: user.id || null, username: user.username, content: sanitized }])
        .select('id, username, content, created_at')
        .single();

      if (error) {
        console.error('Supabase insert error:', error);
        setPublishError('Failed to publish thought. Please try again.');
        return;
      }

      const newThought = {
        id: data.id,
        username: data.username,
        content: data.content,
        created_at: data.created_at,
        contentLength: (data.content || '').length,
      };

      setThoughtInput('');
      // Optimistically prepend to feed (works correctly when sorted by latest)
      setThoughts((prev) =>
        sort === 'latest' ? [newThought, ...prev] : [...prev, newThought]
      );

      // Show success message then clear it
      setPublishSuccess('Your thought has been published!');
      if (successTimerRef.current) clearTimeout(successTimerRef.current);
      successTimerRef.current = setTimeout(() => setPublishSuccess(''), 3000);

      // Also fire to backend API (best-effort, failures are silently ignored)
      try {
        await fetch('/api/thoughts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: sanitized }),
        });
      } catch (_) {}
    } catch (err) {
      console.error('Error publishing thought:', err);
      setPublishError('Failed to publish thought. Please try again.');
    } finally {
      setPublishing(false);
    }
  };

  // Cleanup success timer on unmount
  useEffect(() => () => { if (successTimerRef.current) clearTimeout(successTimerRef.current); }, []);

  const handleLoadMore = () => {
    fetchThoughts(false);
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
              setPublishSuccess('');
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
        {publishSuccess && (
          <p className="font-label-sm text-green-600 dark:text-green-400 mt-2 px-2">
            {publishSuccess}
          </p>
        )}
      </section>

      {/* Feed Section */}
      <section className="w-full max-w-2xl fade-in" style={{ transitionDelay: '0.2s' }}>
        {/* Header & Feed Sorting Tabs */}
        <div className="flex items-center justify-between mb-8 pb-4 border-b border-outline-variant dark:border-dark-border">
          <h2 className="font-headline-md text-headline-md text-primary dark:text-dark-primary">
            Recent Thoughts
          </h2>

          {/* Feed Sort Tabs */}
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

        {/* Feed error */}
        {fetchError && (
          <div className="py-6 text-center">
            <p className="font-label-sm text-error dark:text-red-400">{fetchError}</p>
            <button
              onClick={() => fetchThoughts(true)}
              className="mt-3 font-label-sm text-secondary dark:text-dark-secondary underline cursor-pointer"
            >
              Retry
            </button>
          </div>
        )}

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
          {!loading && !fetchError && thoughts.length === 0 && (
            <div className="py-16 text-center border border-outline-variant dark:border-dark-border border-dashed rounded-[14px] transition-colors">
              <span className="material-symbols-outlined text-4xl text-outline dark:text-dark-secondary mb-4">
                edit_note
              </span>
              <p className="font-body-md text-body-md text-secondary dark:text-dark-secondary">
                Be the first stranger to leave a thought.
              </p>
            </div>
          )}

          {/* Load More Button */}
          {!loading && !loadingMore && hasMore && (
            <div className="flex justify-center mt-4">
              <button
                onClick={handleLoadMore}
                className="font-label-md text-secondary dark:text-dark-secondary hover:text-primary dark:hover:text-white px-6 py-2.5 rounded-[14px] border border-outline-variant dark:border-dark-border transition-colors cursor-pointer"
              >
                Load More Thoughts
              </button>
            </div>
          )}

          {/* Loading more indicator */}
          {loadingMore && (
            <div className="py-4 text-center text-secondary dark:text-dark-secondary font-label-sm">
              Loading more...
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
