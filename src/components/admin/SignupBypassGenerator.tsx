'use client';

import { ModalContext } from '@/app/providers/ModalProvider';
import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

import Button from '@/components/shared/Button';
import ErrorMessage from '@/components/shared/ErrorMessage';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import SuccessMessage from '@/components/shared/SuccessMessage';

type BypassToken = {
  id: string;
  createdAt: string;
  expiresAt: string;
  usedAt: string | null;
  status: 'unused' | 'used' | 'expired';
  bypassUrl: string | null; // URL for tokens that have plain token stored
};

export default function SignupBypassGenerator() {
  const modalContext = useContext(ModalContext);
  const [isGenerating, setIsGenerating] = useState(false);
  const [bypassUrl, setBypassUrl] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [tokens, setTokens] = useState<BypassToken[]>([]);
  const [isLoadingTokens, setIsLoadingTokens] = useState(true);
  const [copiedTokenId, setCopiedTokenId] = useState<string | null>(null);
  const [deletingTokenId, setDeletingTokenId] = useState<string | null>(null);
  const [tokenToDelete, setTokenToDelete] = useState<BypassToken | null>(null);

  // Use refs for callbacks to prevent infinite loops
  const handleDeleteRef = useRef<((token: BypassToken) => Promise<void>) | undefined>(undefined);
  const onCloseRef = useRef<(() => void) | undefined>(undefined);

  const loadTokens = useCallback(async () => {
    setIsLoadingTokens(true);
    setError(null);

    try {
      const response = await fetch('/api/admin/signup-bypass');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load bypass tokens');
      }

      setTokens(data.tokens || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load bypass tokens');
    } finally {
      setIsLoadingTokens(false);
    }
  }, []);

  useEffect(() => {
    loadTokens();
  }, [loadTokens]);

  const handleGenerate = async () => {
    setIsGenerating(true);
    setError(null);
    setBypassUrl(null);
    setExpiresAt(null);
    setCopied(false);

    try {
      const response = await fetch('/api/admin/signup-bypass', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate bypass link');
      }

      setBypassUrl(data.bypassUrl);
      setExpiresAt(data.expiresAt);

      // Reload tokens list to show the new one (URL is now included in the response)
      await loadTokens();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate bypass link');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = async () => {
    if (!bypassUrl) return;

    try {
      await navigator.clipboard.writeText(bypassUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      setError('Failed to copy link');
    }
  };

  const handleCopyToken = async (token: BypassToken) => {
    if (!token.bypassUrl) return;

    try {
      await navigator.clipboard.writeText(token.bypassUrl);
      setCopiedTokenId(token.id);
      setTimeout(() => setCopiedTokenId(null), 2000);
    } catch (err) {
      setError('Failed to copy link');
    }
  };

  const handleDeleteToken = useCallback(async (token: BypassToken) => {
    setDeletingTokenId(token.id);
    setError(null);

    try {
      const response = await fetch(`/api/admin/signup-bypass?id=${token.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        // Try to parse error response
        let errorMessage = 'Failed to delete bypass token';
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          try {
            const errorData = await response.json();
            errorMessage = errorData.error || errorMessage;
          } catch {
            // If parsing fails, use status text
            errorMessage = response.statusText || errorMessage;
          }
        } else {
          errorMessage = response.statusText || errorMessage;
        }
        throw new Error(errorMessage);
      }

      // Parse success response only if there's content
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const text = await response.text();
        if (text) {
          try {
            JSON.parse(text);
          } catch {
            // Ignore parse errors for success responses
          }
        }
      }

      // Reload tokens list
      await loadTokens();
      modalContext.setIsOpen(false);
      setTokenToDelete(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete bypass token');
    } finally {
      setDeletingTokenId(null);
    }
  }, [loadTokens, modalContext]);

  // Update refs when callbacks change
  useEffect(() => {
    handleDeleteRef.current = handleDeleteToken;
  }, [handleDeleteToken]);

  useEffect(() => {
    onCloseRef.current = () => {
      modalContext.setIsOpen(false);
      setTokenToDelete(null);
    };
  }, [modalContext]);

  // Memoize footer to prevent infinite loops - use refs for callbacks
  const footerContent = useMemo(
    () => {
      if (!tokenToDelete) return null;

      return (
        <div
          className="flex flex-row justify-end gap-2 sm:gap-3"
        >
          <Button
            variant="secondary"
            onClick={() => onCloseRef.current?.()}
            disabled={deletingTokenId === tokenToDelete.id}
          >
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={() => handleDeleteRef.current?.(tokenToDelete)}
            disabled={deletingTokenId === tokenToDelete.id}
          >
            {deletingTokenId === tokenToDelete.id ? 'Deleting...' : 'Delete'}
          </Button>
        </div>
      );
    },
    [tokenToDelete, deletingTokenId],
  );

  // Set sticky footer buttons - only update when footer content changes
  useEffect(() => {
    if (!modalContext) return;

    // Only set footer if we have content - ModalProvider will clear it after animation on close
    if (footerContent) {
      modalContext.setFooter(footerContent);
    }
  }, [modalContext, footerContent]);

  // Open delete confirmation modal
  const openDeleteModal = (token: BypassToken) => {
    setTokenToDelete(token);
    modalContext.setTitle('Delete bypass token');
    modalContext.setContent(
      <div
        className="space-y-4"
      >
        <p
          className="text-sm text-foreground/70"
        >
          Are you sure you want to delete this bypass token? This action cannot be undone.
          {token.status === 'unused' && (
            <span
              className="mt-2 block font-medium text-foreground"
            >
              This token has not been used yet.
            </span>
          )}
        </p>
      </div>,
    );
    modalContext.setIsOpen(true);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  const getStatusBadge = (status: BypassToken['status']) => {
    const baseClasses = 'inline-flex items-center rounded-full px-2 py-1 text-xs font-medium';
    switch (status) {
      case 'unused':
        return `${baseClasses} bg-green-500/20 text-green-600 dark:text-green-400`;
      case 'used':
        return `${baseClasses} bg-gray-500/20 text-gray-600 dark:text-gray-400`;
      case 'expired':
        return `${baseClasses} bg-red-500/20 text-red-600 dark:text-red-400`;
      default:
        return baseClasses;
    }
  };

  return (
    <div
      className="space-y-4"
    >
      <div
        className="rounded-lg border border-border-color bg-background-light p-4 sm:p-6"
      >
        <h2
          className="mb-2 text-lg sm:text-xl font-semibold"
        >
          Generate signup bypass link
        </h2>
        <p
          className="mb-4 text-sm text-foreground/70"
        >
          Generate a single-use link that allows users to sign up without BotID verification.
          The link expires in 7 days and can only be used once.
        </p>

        <Button
          onClick={handleGenerate}
          disabled={isGenerating}
          loading={isGenerating}
          variant="primary"
        >
          {isGenerating ? 'Generating...' : 'Generate bypass link'}
        </Button>

        {error && (
          <div
            className="mt-4"
          >
            <ErrorMessage
              variant="compact"
            >
              {error}
            </ErrorMessage>
          </div>
        )}

        {bypassUrl && (
          <div
            className="mt-4 space-y-3"
          >
            <SuccessMessage
              variant="compact"
            >
              Bypass link generated successfully
            </SuccessMessage>

            <div
              className="rounded-md border border-border-color bg-background p-4"
            >
              <label
                className="mb-2 block text-sm font-medium"
              >
                Bypass link:
              </label>
              <div
                className="flex flex-col gap-2 sm:flex-row"
              >
                <input
                  type="text"
                  readOnly
                  value={bypassUrl}
                  className="flex-1 rounded-md border border-border-color bg-background-light px-3 py-2 text-xs sm:text-sm font-mono break-all"
                />
                <Button
                  onClick={handleCopy}
                  variant="secondary"
                  disabled={copied}
                  className="shrink-0"
                >
                  {copied ? 'Copied!' : 'Copy'}
                </Button>
              </div>
              {expiresAt && (
                <p
                  className="mt-2 text-xs text-foreground/50"
                >
                  Expires:
                  {' '}
                  {formatDate(expiresAt)}
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* List of previously generated bypass links */}
      <div
        className="rounded-lg border border-border-color bg-background-light p-4 sm:p-6"
      >
        <h2
          className="mb-2 text-lg sm:text-xl font-semibold"
        >
          Previously generated links
        </h2>
        <p
          className="mb-4 text-sm text-foreground/70"
        >
          View all bypass links that have been generated. Links can only be used once and expire after 7 days.
        </p>

        {isLoadingTokens ? (
          <div
            className="flex items-center justify-center py-8"
          >
            <LoadingSpinner />
          </div>
        ) : tokens.length === 0 ? (
          <div
            className="rounded-md border border-border-color bg-background p-4 text-center text-sm text-foreground/70"
          >
            No bypass links have been generated yet.
          </div>
        ) : (
          <div
            className="space-y-3"
          >
            {tokens.map((token) => (
              <div
                key={token.id}
                className="rounded-md border border-border-color bg-background p-3 sm:p-4"
              >
                <div
                  className="space-y-3"
                >
                  {/* Status and URL row */}
                  <div
                    className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div
                      className="flex flex-wrap items-center gap-2 min-w-0"
                    >
                      <span
                        className={getStatusBadge(token.status)}
                      >
                        {token.status.charAt(0).toUpperCase() + token.status.slice(1)}
                      </span>
                      {token.bypassUrl && (
                        <span
                          className="text-xs text-foreground/50 font-mono break-all"
                        >
                          {token.bypassUrl}
                        </span>
                      )}
                    </div>
                    <div
                      className="flex items-center gap-2 shrink-0"
                    >
                      {token.status === 'unused' && token.bypassUrl && (
                        <Button
                          onClick={() => handleCopyToken(token)}
                          variant="secondary"
                          disabled={copiedTokenId === token.id}
                          className="text-xs whitespace-nowrap"
                        >
                          {copiedTokenId === token.id ? 'Copied!' : 'Copy link'}
                        </Button>
                      )}
                      <Button
                        onClick={() => openDeleteModal(token)}
                        variant="secondary"
                        disabled={deletingTokenId === token.id}
                        className="text-xs text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 whitespace-nowrap"
                      >
                        {deletingTokenId === token.id ? 'Deleting...' : 'Delete'}
                      </Button>
                    </div>
                  </div>
                  {/* Date information */}
                  <div
                    className="grid grid-cols-1 gap-2 text-xs text-foreground/70 sm:grid-cols-3 sm:gap-1"
                  >
                    <div>
                      <span
                        className="font-medium"
                      >
                        Created:
                      </span>
                      {' '}
                      {formatDate(token.createdAt)}
                    </div>
                    <div>
                      <span
                        className="font-medium"
                      >
                        Expires:
                      </span>
                      {' '}
                      {formatDate(token.expiresAt)}
                    </div>
                    {token.usedAt && (
                      <div>
                        <span
                          className="font-medium"
                        >
                          Used:
                        </span>
                        {' '}
                        {formatDate(token.usedAt)}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
