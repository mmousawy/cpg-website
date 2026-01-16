'use client';

import { useConfirm } from '@/app/providers/ConfirmProvider';
import { useAuth } from '@/hooks/useAuth';
import { useSupabase } from '@/hooks/useSupabase';
import { confirmDeleteComment } from '@/utils/confirmHelpers';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import Avatar from '../auth/Avatar';
import Button from './Button';
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
}

export default function Comments({ albumId, photoId, eventId }: CommentsProps) {
  const { user, isAdmin } = useAuth();
  const confirm = useConfirm();
  const supabase = useSupabase();
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Determine which entity we're commenting on
  const entityType = albumId ? 'album' : eventId ? 'event' : 'photo';
  const entityId = albumId || eventId || photoId;

  const fetchComments = useCallback(async () => {
    if (!entityId) return;

    setIsLoading(true);
    try {
      // Query through appropriate junction table
      const junctionTable = entityType === 'album' ? 'album_comments' : entityType === 'event' ? 'event_comments' : 'photo_comments';
      const entityColumn = entityType === 'album' ? 'album_id' : entityType === 'event' ? 'event_id' : 'photo_id';

      const { data, error } = await supabase
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
        // Flatten the nested structure
        const flatComments = data
          .map((ac: any) => ac.comments)
          .filter((c: any) => c !== null)
          .map((c: any) => ({
            ...c,
            profile: Array.isArray(c.profile) ? c.profile[0] : c.profile,
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
      // Soft delete comment
      const { error } = await supabase
        .from('comments')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', commentId)
        .is('deleted_at', null);

      if (error) {
        console.error('Error deleting comment:', error);
        alert('Failed to delete comment');
      } else {
        setComments(comments.filter(c => c.id !== commentId));
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
    <div id="comments" className="space-y-4">
      <h3 className="text-lg font-semibold">Comments ({comments.length})</h3>

      {/* Comments List */}
      <div className="space-y-4">
        {isLoading ? (
          <p className="text-base text-foreground/70">Loading comments...</p>
        ) : comments.length === 0 ? (
          <p className="text-base text-foreground/70">
            No comments yet. Be the first to comment!
          </p>
        ) : (
          comments.map((comment) => (
            <div key={comment.id} className="dark:bg-foreground/10 rounded-lg shadow-md shadow-[#00000007] border border-border-color-strong p-4">
              <div className="flex items-start justify-between gap-2">
                <Link
                  href={comment.profile?.nickname ? `/@${comment.profile.nickname}` : '#'}
                  className="flex gap-3 group rounded-lg"
                >
                  <Avatar
                    avatarUrl={comment.profile?.avatar_url}
                    fullName={comment.profile?.full_name}
                    hoverEffect
                    size="sm"
                  />
                  <div>
                    <p className="font-medium group-hover:text-primary transition-colors">
                      {comment.profile?.full_name || 'Anonymous'}
                    </p>
                    <p className="text-xs text-foreground/50 group-hover:text-primary transition-colors">
                      @{comment.profile?.nickname} · {formatDate(comment.created_at)}
                    </p>
                  </div>
                </Link>
                {(user?.id === comment.user_id || isAdmin) && (
                  <button
                    onClick={() => handleDeleteComment(comment.id)}
                    className="rounded p-1 hover:bg-red-600/10"
                    aria-label="Delete comment"
                  >
                    <TrashSVG className="size-4 text-red-600" />
                  </button>
                )}
              </div>
              <p className="mt-2 text-sm text-foreground/90 ml-[52px]">
                {comment.comment_text}
              </p>
            </div>
          ))
        )}
      </div>

      {/* Comment Form */}
      {user && (
        <form onSubmit={handleSubmitComment} className="space-y-3">
          <Textarea
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            placeholder="Write a comment..."
            rows={3}
            disabled={isSubmitting}
          />
          <Button
            type="submit"
            size="sm"
            iconRight={<SendSVG />}
            disabled={isSubmitting || !commentText.trim()}
          >
            {isSubmitting ? 'Posting...' : 'Post comment'}
          </Button>
        </form>
      )}

      {!user && (
        <p className="text-sm text-foreground/70">
          Please log in to leave a comment.
        </p>
      )}
    </div>
  );
}
