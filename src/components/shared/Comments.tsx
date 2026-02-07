'use client';

import { useConfirm } from '@/app/providers/ConfirmProvider';
import type { Tables } from '@/database.types';
import { useAuth } from '@/hooks/useAuth';
import { useAuthPrompt } from '@/hooks/useAuthPrompt';
import { useSupabase } from '@/hooks/useSupabase';
import { confirmDeleteComment } from '@/utils/confirmHelpers';
import type { User } from '@supabase/supabase-js';
import Link from 'next/link';
import { memo, useCallback, useEffect, useState } from 'react';
import Avatar from '../auth/Avatar';
import Button from './Button';
import CommentActionsPopover from './CommentActionsPopover';
import Textarea from './Textarea';

import SendSVG from 'public/icons/arrow-right.svg';
import ChevronDownSVG from 'public/icons/chevron-down.svg';
import TrashSVG from 'public/icons/trash.svg';

interface Comment {
  id: string
  user_id: string
  comment_text: string
  created_at: string
  updated_at: string
  parent_comment_id?: string | null
  replied_to_id?: string | null
  replied_to_nickname?: string | null
  profile?: {
    full_name: string | null
    nickname: string
    avatar_url: string | null
  }
  replies?: Comment[]
  nestedReplies?: Comment[]
}

interface CommentsProps {
  albumId?: string
  photoId?: string
  eventId?: string
  challengeId?: string
}

// ─── Types for CommentItem props ───────────────────────────────────────────────

// Use the actual Supabase User type for proper type safety

interface CommentItemProps {
  comment: Comment;
  topLevelCommentId: string;
  depth?: number;
  isReplyingTo: string | null;
  replyTextValue: string;
  allReplyText: Record<string, string>;
  onReplyClick: (commentId: string) => void;
  onReplyTextChange: (commentId: string, value: string) => void;
  onSubmitReply: (parentCommentId: string) => void;
  onDeleteComment: (commentId: string) => void;
  formatDateFn: (dateString: string) => string;
  user: User | null;
  isAdmin: boolean;
  isSubmitting: boolean;
  showAuthPrompt: (opts: { feature: string }) => void;
}

// ─── CommentItem — defined OUTSIDE Comments so its identity is stable ──────────

const CommentItem = memo(function CommentItem({
  comment,
  topLevelCommentId,
  depth = 0,
  isReplyingTo,
  replyTextValue,
  allReplyText,
  onReplyClick,
  onReplyTextChange,
  onSubmitReply,
  onDeleteComment,
  formatDateFn,
  user: currentUser,
  isAdmin: currentIsAdmin,
  isSubmitting: currentIsSubmitting,
  showAuthPrompt: currentShowAuthPrompt,
}: CommentItemProps) {
  const hasNestedReplies = comment.nestedReplies && comment.nestedReplies.length > 0;
  const hasChildren = hasNestedReplies || (comment.replies && comment.replies.length > 0);
  const isCurrentlyReplying = isReplyingTo === comment.id;
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Count total replies for the collapsed summary
  const totalChildCount = (comment.replies?.length || 0) +
    (comment.nestedReplies?.length || 0) +
    (comment.replies?.reduce((sum, r) => sum + (r.nestedReplies?.length || 0), 0) || 0);

  return (
    <div
      id={`comment-${comment.id}`}
    >
      <div
        className="dark:bg-foreground/5 rounded-md max-w-160 shadow-sm shadow-[#00000008] border border-border-color p-3 transition-colors duration-700 relative"
      >
        <div
          className="flex items-start justify-between gap-2 mb-2"
        >
          <Link
            href={comment.profile?.nickname ? `/@${comment.profile.nickname}` : '#'}
            className="flex gap-2.5 items-center group rounded-lg"
          >
            <Avatar
              avatarUrl={comment.profile?.avatar_url}
              fullName={comment.profile?.full_name}
              hoverEffect
              size="sm"
            />
            <div>
              <p
                className="text-sm font-medium group-hover:text-primary transition-colors leading-tight"
              >
                {comment.profile?.full_name || 'Anonymous'}
              </p>
              {comment.profile?.nickname && (
                <p
                  className="text-xs text-foreground/50 group-hover:text-primary transition-colors leading-tight"
                >
                  @
                  {comment.profile.nickname}
                </p>
              )}
            </div>
          </Link>
          <div
            className="flex items-center gap-1"
          >
            <CommentActionsPopover
              commentId={comment.id}
              commentUserId={comment.user_id}
            />
            {(currentUser?.id === comment.user_id || currentIsAdmin) && (
              <button
                onClick={() => onDeleteComment(comment.id)}
                className="rounded p-1 hover:bg-red-600/10"
                aria-label="Delete comment"
              >
                <TrashSVG
                  className="size-4 text-red-600"
                />
              </button>
            )}
          </div>
        </div>
        <p
          className="text-xs text-foreground/50 mb-2"
        >
          {formatDateFn(comment.created_at)}
          {comment.replied_to_nickname && comment.replied_to_id && (
            <>
              {' · '}
              <button
                type="button"
                className="hover:text-primary transition-colors"
                onClick={() => {
                  const target = document.getElementById(`comment-${comment.replied_to_id}`);
                  if (target) {
                    target.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    const card = target.querySelector(':scope > div');
                    if (card) {
                      card.classList.add('!border-primary', '!bg-primary/5');
                      setTimeout(() => {
                        card.classList.remove('!border-primary', '!bg-primary/5');
                      }, 2000);
                    }
                  }
                }}
              >
                replied to @
                {comment.replied_to_nickname}
              </button>
            </>
          )}
        </p>
        <p
          className="text-sm text-foreground/90"
        >
          {comment.comment_text}
        </p>
        {currentUser && (
          <div
            className="absolute bottom-2 right-2"
          >
            <Button
              onClick={() => onReplyClick(comment.id)}
              variant="custom"
              size="sm"
              className="px-2! py-0.5! text-xs h-auto border border-border-color bg-foreground/5 text-foreground/70"
            >
              {isCurrentlyReplying ? 'Cancel' : 'Reply'}
            </Button>
          </div>
        )}
        {isCurrentlyReplying && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              onSubmitReply(topLevelCommentId);
            }}
            className="mt-3 space-y-2"
          >
            <div
              className="text-xs text-foreground/50 mb-1"
            >
              Replying to
              {' '}
              <span
                className="font-medium"
              >
                @
                {comment.profile?.nickname || 'Anonymous'}
              </span>
            </div>
            <Textarea
              value={replyTextValue}
              onChange={(e) => {
                onReplyTextChange(comment.id, e.target.value);
              }}
              onFocus={(e) => {
                if (!currentUser) {
                  e.target.blur();
                  currentShowAuthPrompt({ feature: 'leave comments' });
                }
              }}
              placeholder="Write a reply..."
              rows={2}
              disabled={currentIsSubmitting}
              className="block max-w-160 text-sm"
              readOnly={!currentUser}
            />
            <Button
              type="submit"
              size="sm"
              iconRight={<SendSVG
                className="size-4"
              />}
              disabled={currentIsSubmitting || !replyTextValue.trim()}
              onClick={(e) => {
                if (!currentUser) {
                  e.preventDefault();
                  currentShowAuthPrompt({ feature: 'leave comments' });
                }
              }}
            >
              {currentIsSubmitting ? 'Posting...' : 'Reply'}
            </Button>
          </form>
        )}
      </div>
      {/* Collapse/expand toggle — shown below the comment card on the border line */}
      {hasChildren && (
        <button
          type="button"
          onClick={() => setIsCollapsed(prev => !prev)}
          className="flex items-center gap-1 mt-1 text-xs text-foreground/40 hover:text-primary transition-colors"
          aria-label={isCollapsed ? 'Expand replies' : 'Collapse replies'}
        >
          <ChevronDownSVG
            className={`size-3 transition-transform duration-200 ${isCollapsed ? '-rotate-90' : ''}`}
          />
          {isCollapsed ? (
            <span>
              {totalChildCount}
              {' '}
              {totalChildCount === 1 ? 'reply' : 'replies'}
            </span>
          ) : (
            <span>
              hide
              {' '}
              {totalChildCount === 1 ? 'reply' : 'replies'}
            </span>
          )}
        </button>
      )}
      {/* Render nested replies — cap visual indentation at depth 2 */}
      {!isCollapsed && (hasNestedReplies || (comment.replies && comment.replies.length > 0)) && (() => {
        const childDepth = Math.min(depth + 1, 2);
        const shouldIndent = depth < 2;
        const children = (
          <>
            {hasNestedReplies && comment.nestedReplies!.map((nestedReply) => (
              <CommentItem
                key={nestedReply.id}
                comment={nestedReply}
                topLevelCommentId={topLevelCommentId}
                depth={childDepth}
                isReplyingTo={isReplyingTo}
                replyTextValue={allReplyText[nestedReply.id] || ''}
                allReplyText={allReplyText}
                onReplyClick={onReplyClick}
                onReplyTextChange={onReplyTextChange}
                onSubmitReply={onSubmitReply}
                onDeleteComment={onDeleteComment}
                formatDateFn={formatDateFn}
                user={currentUser}
                isAdmin={currentIsAdmin}
                isSubmitting={currentIsSubmitting}
                showAuthPrompt={currentShowAuthPrompt}
              />
            ))}
            {comment.replies && comment.replies.map((reply) => (
              <CommentItem
                key={reply.id}
                comment={reply}
                topLevelCommentId={topLevelCommentId}
                depth={childDepth}
                isReplyingTo={isReplyingTo}
                replyTextValue={allReplyText[reply.id] || ''}
                allReplyText={allReplyText}
                onReplyClick={onReplyClick}
                onReplyTextChange={onReplyTextChange}
                onSubmitReply={onSubmitReply}
                onDeleteComment={onDeleteComment}
                formatDateFn={formatDateFn}
                user={currentUser}
                isAdmin={currentIsAdmin}
                isSubmitting={currentIsSubmitting}
                showAuthPrompt={currentShowAuthPrompt}
              />
            ))}
          </>
        );
        return shouldIndent ? (
          <div
            className="ml-1.5 mt-2 space-y-2 border-l-1 border-border-color pl-2"
          >
            {children}
          </div>
        ) : (
          <div
            className="mt-2 space-y-2"
          >
            {children}
          </div>
        );
      })()}
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison — return true to skip re-render, false to allow it.
  // Only re-render when something that actually affects THIS comment changes.

  if (prevProps.comment !== nextProps.comment) return false;

  // Did this comment's "is replying" state change?
  const prevIsReplying = prevProps.isReplyingTo === prevProps.comment.id;
  const nextIsReplying = nextProps.isReplyingTo === nextProps.comment.id;
  if (prevIsReplying !== nextIsReplying) return false;

  // If this comment is the one being replied to, check if the text changed
  if (nextIsReplying && prevProps.replyTextValue !== nextProps.replyTextValue) return false;

  if (prevProps.isSubmitting !== nextProps.isSubmitting) return false;

  // For child replies: did the isReplyingTo change to/from one of this comment's children?
  // We need to let the children re-render when reply state changes.
  if (prevProps.isReplyingTo !== nextProps.isReplyingTo) return false;

  // If allReplyText reference changed, allow re-render so descendants can update.
  // Each child CommentItem is individually memoized, so only the one being typed
  // in will actually re-render its DOM — intermediate parents just pass through.
  if (prevProps.allReplyText !== nextProps.allReplyText) return false;

  return true; // All relevant props are equal — skip render
});

// ─── Main Comments component ───────────────────────────────────────────────────

export default function Comments({ albumId, photoId, eventId, challengeId }: CommentsProps) {
  const { user, isAdmin } = useAuth();
  const confirm = useConfirm();
  const supabase = useSupabase();
  const showAuthPrompt = useAuthPrompt();

  // Determine which entity we're commenting on (needed before useState)
  const entityType = albumId ? 'album' : eventId ? 'event' : challengeId ? 'challenge' : 'photo';
  const entityId = albumId || eventId || challengeId || photoId;

  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState(() => {
    if (typeof window !== 'undefined' && entityId) {
      try {
        return localStorage.getItem(`comment-text-${entityId}`) || '';
      } catch {
        return '';
      }
    }
    return '';
  });
  const [isLoading, setIsLoading] = useState(true);   // true only for initial load
  const [isRefetching, setIsRefetching] = useState(false); // true when refreshing after post/delete
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  // Track which reply a reply-to-reply was responding to (for extra indentation)
  const [replyToMap, setReplyToMap] = useState<Record<string, string>>(() => {
    // Load reply-to mapping from localStorage on mount
    if (typeof window !== 'undefined' && entityId) {
      try {
        const saved = localStorage.getItem(`reply-to-map-${entityId}`);
        return saved ? JSON.parse(saved) : {};
      } catch {
        return {};
      }
    }
    return {};
  });
  const [replyText, setReplyText] = useState<Record<string, string>>(() => {
    // Load reply text from localStorage on mount
    if (typeof window !== 'undefined' && entityId) {
      try {
        const saved = localStorage.getItem(`reply-text-${entityId}`);
        return saved ? JSON.parse(saved) : {};
      } catch {
        return {};
      }
    }
    return {};
  });

  // Save reply text to localStorage with debounce
  useEffect(() => {
    if (typeof window !== 'undefined' && entityId) {
      const timeoutId = setTimeout(() => {
        try {
          localStorage.setItem(`reply-text-${entityId}`, JSON.stringify(replyText));
        } catch {
          // Ignore localStorage errors (quota exceeded, etc.)
        }
      }, 300);

      return () => clearTimeout(timeoutId);
    }
  }, [replyText, entityId]);

  // Save main comment text to localStorage with debounce
  useEffect(() => {
    if (typeof window !== 'undefined' && entityId) {
      const timeoutId = setTimeout(() => {
        try {
          if (commentText) {
            localStorage.setItem(`comment-text-${entityId}`, commentText);
          } else {
            localStorage.removeItem(`comment-text-${entityId}`);
          }
        } catch {
          // Ignore localStorage errors
        }
      }, 300);

      return () => clearTimeout(timeoutId);
    }
  }, [commentText, entityId]);

  const fetchComments = useCallback(async (isInitial = false) => {
    if (!entityId) return;

    if (isInitial) {
      setIsLoading(true);
    } else {
      setIsRefetching(true);
    }
    try {
      // Query through appropriate junction table
      const junctionTable = entityType === 'album' ? 'album_comments'
        : entityType === 'event' ? 'event_comments'
        : entityType === 'challenge' ? 'challenge_comments'
        : 'photo_comments';
      const entityColumn = entityType === 'album' ? 'album_id'
        : entityType === 'event' ? 'event_id'
        : entityType === 'challenge' ? 'challenge_id'
        : 'photo_id';


      const { data, error } = await (supabase as any)
        .from(junctionTable)
        .select(`
          comment_id,
          comments (
            id,
            user_id,
            comment_text,
            created_at,
            updated_at,
            parent_comment_id,
            profile:profiles(full_name, nickname, avatar_url)
          )
        `)
        .eq(entityColumn, entityId)
        .is('comments.deleted_at', null)
        .order('comments(created_at)', { ascending: false })
        .limit(100);

      if (error) {
        console.error('Error fetching comments:', error);
      } else if (data) {
        type CommentRow = {
          id: string;
          user_id: string;
          comment_text: string;
          created_at: string;
          updated_at: string;
          parent_comment_id: string | null;
        };
        type ProfileRow = Pick<Tables<'profiles'>, 'full_name' | 'nickname' | 'avatar_url'>;
        type CommentQueryResult = {
          comment_id: string;
          comments: (CommentRow & {
            profile: ProfileRow | null;
          }) | null;
        };

        // Flatten the nested structure and include parent_comment_id
        const allComments = (data as CommentQueryResult[])
          .map((ac) => ac.comments)
          .filter((c): c is NonNullable<typeof c> => c !== null)
          .map((c) => ({
            id: c.id,
            user_id: c.user_id,
            comment_text: c.comment_text,
            created_at: c.created_at,
            updated_at: c.updated_at,
            parent_comment_id: c.parent_comment_id || null,
            profile: c.profile ? {
              full_name: c.profile.full_name,
              nickname: c.profile.nickname || '',
              avatar_url: c.profile.avatar_url,
            } : undefined,
            replies: [] as Comment[],
          })) as Comment[];

        // Separate top-level comments and replies
        const topLevelComments = allComments.filter(c => !c.parent_comment_id);
        const replies = allComments.filter(c => c.parent_comment_id);

        // Build a lookup: comment ID -> display name (for "replied to @nickname")
        const nicknameById = new Map<string, string>();
        allComments.forEach(c => {
          const name = c.profile?.nickname || c.profile?.full_name || 'Anonymous';
          nicknameById.set(c.id, name);
        });

        // Load reply-to mapping from localStorage
        let currentReplyToMap: Record<string, string> = {};
        if (typeof window !== 'undefined' && entityId) {
          try {
            const saved = localStorage.getItem(`reply-to-map-${entityId}`);
            if (saved) {
              currentReplyToMap = JSON.parse(saved);
            }
          } catch {
            // Ignore errors
          }
        }

        // Populate replied_to fields for all replies
        replies.forEach(reply => {
          const repliedToId = currentReplyToMap[reply.id];
          if (repliedToId) {
            // This reply was made to a specific comment (via replyToMap)
            reply.replied_to_id = repliedToId;
            reply.replied_to_nickname = nicknameById.get(repliedToId) || null;
          } else if (reply.parent_comment_id) {
            // First-level reply: it replied to the top-level comment
            reply.replied_to_id = reply.parent_comment_id;
            reply.replied_to_nickname = nicknameById.get(reply.parent_comment_id) || null;
          }
        });

        // Group replies under their parent comments and separate first-level from replies-to-replies
        const commentsWithReplies = topLevelComments.map(comment => {
          const commentReplies = replies
            .filter(r => r.parent_comment_id === comment.id)
            .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

          // Build a set of all reply IDs for this parent comment
          const commentReplyIds = new Set(commentReplies.map(r => r.id));
          const firstLevelReplies: Comment[] = [];
          const repliesToRepliesMap = new Map<string, Comment[]>();

          // Helper: find the first-level reply ancestor for a given repliedToId.
          // This ensures replies to deeply nested comments are attached to the
          // nearest first-level reply, keeping visual nesting at max 2 levels.
          const findFirstLevelAncestor = (targetId: string): string | null => {
            const visited = new Set<string>();
            let current = targetId;
            while (current && commentReplyIds.has(current)) {
              if (visited.has(current)) break; // prevent cycles
              visited.add(current);
              const parent = currentReplyToMap[current];
              if (!parent || !commentReplyIds.has(parent)) {
                // `current` has no parent in the map, so it's a first-level reply
                return current;
              }
              current = parent;
            }
            return commentReplyIds.has(current) ? current : null;
          };

          commentReplies.forEach(reply => {
            const repliedToId = currentReplyToMap[reply.id];
            if (repliedToId && commentReplyIds.has(repliedToId)) {
              // This is a reply to another reply — attach to first-level ancestor
              const firstLevelId = findFirstLevelAncestor(repliedToId) || repliedToId;
              if (!repliesToRepliesMap.has(firstLevelId)) {
                repliesToRepliesMap.set(firstLevelId, []);
              }
              repliesToRepliesMap.get(firstLevelId)!.push(reply);
            } else {
              // This is a first-level reply
              firstLevelReplies.push(reply);
            }
          });

          // Attach replies-to-replies to their first-level parent replies
          const repliesWithNested = firstLevelReplies.map(reply => ({
            ...reply,
            nestedReplies: (repliesToRepliesMap.get(reply.id) || [])
              .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()),
          }));

          return {
            ...comment,
            replies: repliesWithNested,
          };
        });

        setComments(commentsWithReplies);
      }
    } catch (err) {
      console.error('Unexpected error:', err);
    }
    setIsLoading(false);
    setIsRefetching(false);
  }, [entityId, entityType, supabase]);

  // Fetch comments on mount and when albumId changes
  useEffect(() => {
    // Schedule fetch via microtask to satisfy React Compiler
    const timerId = setTimeout(() => {
      fetchComments(true); // initial load
    }, 0);
    return () => clearTimeout(timerId);
  }, [fetchComments]);

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user || !commentText.trim() || !entityId) return;

    setIsSubmitting(true);
    try {
      // Use API route to create comment and send notification email
      const response = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entityType,
          entityId,
          commentText: commentText.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('Error creating comment:', data.message);
        alert(data.message || 'Failed to post comment');
      } else {
        setCommentText('');
        await fetchComments();
      }
    } catch (err) {
      console.error('Unexpected error:', err);
      alert('An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitReply = useCallback(async (parentCommentId: string) => {
    // Find the reply text - could be stored under parentCommentId or replyingTo
    const replyId = replyingTo || parentCommentId;
    const text = replyText[replyId]?.trim();
    if (!user || !text || !entityId) return;

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entityType,
          entityId,
          commentText: text,
          parentCommentId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('Error creating reply:', data.message);
        alert(data.message || 'Failed to post reply');
      } else {
        // Track which reply this was responding to (for extra indentation)
        const clickedReplyId = replyingTo;
        if (clickedReplyId && clickedReplyId !== parentCommentId && data.commentId) {
          // This was a reply to another reply - track it for extra indentation
          setReplyToMap(prev => {
            const next = { ...prev, [data.commentId]: clickedReplyId };
            // Save to localStorage
            if (typeof window !== 'undefined' && entityId) {
              try {
                localStorage.setItem(`reply-to-map-${entityId}`, JSON.stringify(next));
              } catch {
                // Ignore localStorage errors
              }
            }
            return next;
          });
        }

        setReplyText(prev => {
          const next = { ...prev };
          // Clear both the reply ID and parent ID in case either was used
          delete next[replyId];
          delete next[parentCommentId];
          // Save to localStorage
          if (typeof window !== 'undefined' && entityId) {
            try {
              localStorage.setItem(`reply-text-${entityId}`, JSON.stringify(next));
            } catch {
              // Ignore localStorage errors
            }
          }
          return next;
        });
        setReplyingTo(null);
        await fetchComments();
      }
    } catch (err) {
      console.error('Unexpected error:', err);
      alert('An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  }, [user, entityType, entityId, replyingTo, replyText, fetchComments]);

  const handleDeleteComment = useCallback(async (commentId: string) => {
    const confirmed = await confirm(confirmDeleteComment());

    if (!confirmed) return;

    try {
      // Use API route for deletion (handles admin permissions via service role)
      const response = await fetch(`/api/comments?id=${commentId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        // Refetch to get the updated list (handles nested replies, cascade deletes, etc.)
        await fetchComments();
      } else {
        const data = await response.json();
        console.error('Error deleting comment:', data.message);
        alert(data.message || 'Failed to delete comment');
      }
    } catch (err) {
      console.error('Unexpected error:', err);
      alert('An unexpected error occurred');
    }
  }, [confirm, fetchComments]);

  const formatDate = useCallback((dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;

    return date.toLocaleDateString();
  }, []);

  const handleReplyClick = useCallback((commentId: string) => {
    setReplyingTo(prev => prev === commentId ? null : commentId);
  }, []);

  const handleReplyTextChange = useCallback((commentId: string, value: string) => {
    setReplyText(prev => ({ ...prev, [commentId]: value }));
  }, []);

  // Stable reference for showAuthPrompt to pass to CommentItem
  const stableShowAuthPrompt = useCallback((opts: { feature: string }) => {
    showAuthPrompt(opts);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- showAuthPrompt is stable from the hook
  }, []);

  return (
    <div
      id="comments"
      className="space-y-2"
    >
      <h3
        className="text-lg font-semibold"
      >
        {comments.length > 0 ? (() => {
          const countReplies = (comment: Comment): number => {
            let count = 1; // Count this comment
            if (comment.replies) {
              count += comment.replies.reduce((sum, r) => sum + countReplies(r), 0);
            }
            if (comment.nestedReplies) {
              count += comment.nestedReplies.reduce((sum, r) => sum + countReplies(r), 0);
            }
            return count;
          };
          const totalCount = comments.reduce((sum, c) => sum + countReplies(c), 0);
          return `${totalCount} ${totalCount === 1 ? 'Comment' : 'Comments'}`;
        })() : 'Comments'}
      </h3>

      {/* Comments List */}
      <div
        className="space-y-3"
      >
        {isLoading && comments.length === 0 ? (
          <p
            className="text-sm text-foreground/70"
          >
            Loading comments...
          </p>
        ) : comments.length === 0 ? (
          <p
            className="text-sm text-foreground/70"
          >
            No comments yet. Be the first to comment!
          </p>
        ) : (
          <div
            className={`space-y-3 transition-opacity duration-200 ${isRefetching ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}
          >
            {comments.map((comment) => (
              <CommentItem
                key={comment.id}
                comment={comment}
                topLevelCommentId={comment.id}
                depth={0}
                isReplyingTo={replyingTo}
                replyTextValue={replyText[comment.id] || ''}
                allReplyText={replyText}
                onReplyClick={handleReplyClick}
                onReplyTextChange={handleReplyTextChange}
                onSubmitReply={handleSubmitReply}
                onDeleteComment={handleDeleteComment}
                formatDateFn={formatDate}
                user={user}
                isAdmin={isAdmin}
                isSubmitting={isSubmitting}
                showAuthPrompt={stableShowAuthPrompt}
              />
            ))}
          </div>
        )}
      </div>

      {/* Comment Form */}
      <form
        onSubmit={handleSubmitComment}
        className="space-y-3 mt-4"
      >
        <Textarea
          value={commentText}
          onChange={(e) => setCommentText(e.target.value)}
          onFocus={(e) => {
            if (!user) {
              // Blur immediately to prevent re-triggering when modal closes
              e.target.blur();
              showAuthPrompt({ feature: 'leave comments' });
            }
          }}
          placeholder="Write a comment..."
          rows={3}
          disabled={isSubmitting}
          className="block max-w-160"
          readOnly={!user}
        />
        <Button
          type="submit"
          size="sm"
          iconRight={<SendSVG
            className="size-4"
          />}
          disabled={isSubmitting || !commentText.trim()}
          onClick={(e) => {
            if (!user) {
              e.preventDefault();
              showAuthPrompt({ feature: 'leave comments' });
            }
          }}
        >
          {isSubmitting ? 'Posting...' : 'Add comment'}
        </Button>
      </form>
    </div>
  );
}
