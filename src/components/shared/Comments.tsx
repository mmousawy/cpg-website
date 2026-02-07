'use client';

import { useConfirm } from '@/app/providers/ConfirmProvider';
import type { Tables } from '@/database.types';
import { useAuth } from '@/hooks/useAuth';
import { useAuthPrompt } from '@/hooks/useAuthPrompt';
import { useSupabase } from '@/hooks/useSupabase';
import { confirmDeleteComment } from '@/utils/confirmHelpers';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import Avatar from '../auth/Avatar';
import Button from './Button';
import ReportButton from './ReportButton';
import Textarea from './Textarea';

import SendSVG from 'public/icons/arrow-right.svg';
import TrashSVG from 'public/icons/trash.svg';

interface Comment {
  id: string
  user_id: string
  comment_text: string
  created_at: string
  updated_at: string
  profile?: {
    full_name: string | null
    nickname: string
    avatar_url: string | null
  }
}

interface CommentsProps {
  albumId?: string
  photoId?: string
  eventId?: string
  challengeId?: string
}

export default function Comments({ albumId, photoId, eventId, challengeId }: CommentsProps) {
  const { user, isAdmin } = useAuth();
  const confirm = useConfirm();
  const supabase = useSupabase();
  const showAuthPrompt = useAuthPrompt();
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Determine which entity we're commenting on
  const entityType = albumId ? 'album' : eventId ? 'event' : challengeId ? 'challenge' : 'photo';
  const entityId = albumId || eventId || challengeId || photoId;

  const fetchComments = useCallback(async () => {
    if (!entityId) return;

    setIsLoading(true);
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
        type CommentRow = Pick<Tables<'comments'>, 'id' | 'user_id' | 'comment_text' | 'created_at' | 'updated_at'>;
        type ProfileRow = Pick<Tables<'profiles'>, 'full_name' | 'nickname' | 'avatar_url'>;
        type CommentQueryResult = {
          comment_id: string;
          comments: (CommentRow & {
            profile: ProfileRow | null;
          }) | null;
        };

        // Flatten the nested structure
        const flatComments = (data as CommentQueryResult[])
          .map((ac) => ac.comments)
          .filter((c): c is NonNullable<typeof c> => c !== null)
          .map((c) => ({
            id: c.id,
            user_id: c.user_id,
            comment_text: c.comment_text,
            created_at: c.created_at,
            updated_at: c.updated_at,
            profile: c.profile ? {
              full_name: c.profile.full_name,
              nickname: c.profile.nickname || '',
              avatar_url: c.profile.avatar_url,
            } : undefined,
          })) as Comment[];
        setComments(flatComments);
      }
    } catch (err) {
      console.error('Unexpected error:', err);
    }
    setIsLoading(false);
  }, [entityId, entityType, supabase]);

  // Fetch comments on mount and when albumId changes
  useEffect(() => {
    // Schedule fetch via microtask to satisfy React Compiler
    const timerId = setTimeout(() => {
      fetchComments();
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
    }
    setIsSubmitting(false);
  };

  const handleDeleteComment = async (commentId: string) => {
    const confirmed = await confirm(confirmDeleteComment());

    if (!confirmed) return;

    try {
      // Use API route for deletion (handles admin permissions via service role)
      const response = await fetch(`/api/comments?id=${commentId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setComments(comments.filter(c => c.id !== commentId));
      } else {
        const data = await response.json();
        console.error('Error deleting comment:', data.message);
        alert(data.message || 'Failed to delete comment');
      }
    } catch (err) {
      console.error('Unexpected error:', err);
      alert('An unexpected error occurred');
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;

    return date.toLocaleDateString();
  };

  return (
    <div
      id="comments"
      className="space-y-2"
    >
      <h3
        className="text-lg font-semibold"
      >
        {comments.length > 0 ? `${comments.length} Comments` : 'Comments'}
      </h3>

      {/* Comments List */}
      <div
        className="space-y-3"
      >
        {isLoading ? (
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
          comments.map((comment) => (
            <div
              key={comment.id}
              className="dark:bg-foreground/5 rounded-lg max-w-160 shadow-sm shadow-[#00000008] border border-border-color p-3"
            >
              <div
                className="flex items-start justify-between gap-2 mb-2"
              >
                <Link
                  href={comment.profile?.nickname ? `/@${comment.profile.nickname}` : '#'}
                  className="flex gap-2.5 group rounded-lg"
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
                    <p
                      className="text-xs text-foreground/50 group-hover:text-primary transition-colors leading-tight"
                    >
                      @
                      {comment.profile?.nickname}
                      {' '}
                      ·
                      {' '}
                      {formatDate(comment.created_at)}
                    </p>
                  </div>
                </Link>
                <div
                  className="flex items-center gap-1"
                >
                  <ReportButton
                    entityType="comment"
                    entityId={comment.id}
                    entityLabel="this comment"
                    entityOwnerId={comment.user_id}
                    variant="link"
                    className="text-xs text-foreground/60"
                  />
                  {(user?.id === comment.user_id || isAdmin) && (
                    <button
                      onClick={() => handleDeleteComment(comment.id)}
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
                className="text-sm text-foreground/90 ml-[50px]"
              >
                {comment.comment_text}
              </p>
            </div>
          ))
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
