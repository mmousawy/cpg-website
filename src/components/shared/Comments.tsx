'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { createClient } from '@/utils/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import Button from './Button'
import Avatar from '../auth/Avatar'

import SendSVG from 'public/icons/arrow-right.svg'
import TrashSVG from 'public/icons/trash.svg'

interface Comment {
  id: string
  album_id: string
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
  albumId: string
  isAlbumOwner?: boolean
}

export default function Comments({ albumId, isAlbumOwner = false }: CommentsProps) {
  const { user, isAdmin } = useAuth()
  const supabase = createClient()
  const [comments, setComments] = useState<Comment[]>([])
  const [commentText, setCommentText] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    fetchComments()
  }, [albumId])

  const fetchComments = async () => {
    setIsLoading(true)
    try {
      const { data, error } = await supabase
        .from('album_comments')
        .select(`
          id,
          album_id,
          user_id,
          comment_text,
          created_at,
          updated_at,
          profile:profiles(full_name, nickname, avatar_url)
        `)
        .eq('album_id', albumId)
        .order('created_at', { ascending: false })
        .limit(100)

      if (error) {
        console.error('Error fetching comments:', error)
      } else if (data) {
        // Map profile array to single object
        setComments(
          data.map((c: any) => ({
            ...c,
            profile: Array.isArray(c.profile) ? c.profile[0] : c.profile
          })) as Comment[]
        )
      }
    } catch (err) {
      console.error('Unexpected error:', err)
    }
    setIsLoading(false)
  }

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!user || !commentText.trim()) return

    setIsSubmitting(true)
    try {
      const { error } = await supabase
        .from('album_comments')
        .insert({
          album_id: albumId,
          user_id: user.id,
          comment_text: commentText.trim()
        })

      if (error) {
        console.error('Error posting comment:', error)
        alert('Failed to post comment')
      } else {
        setCommentText('')
        await fetchComments()
      }
    } catch (err) {
      console.error('Unexpected error:', err)
      alert('An unexpected error occurred')
    }
    setIsSubmitting(false)
  }

  const handleDeleteComment = async (commentId: string) => {
    if (!confirm('Are you sure you want to delete this comment?')) {
      return
    }

    try {
      const { error } = await supabase
        .from('album_comments')
        .delete()
        .eq('id', commentId)

      if (error) {
        console.error('Error deleting comment:', error)
        alert('Failed to delete comment')
      } else {
        setComments(comments.filter(c => c.id !== commentId))
      }
    } catch (err) {
      console.error('Unexpected error:', err)
      alert('An unexpected error occurred')
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

    if (diffInSeconds < 60) return 'just now'
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`

    return date.toLocaleDateString()
  }

  return (
    <div className="space-y-6">
      <h3 className="text-xl font-semibold">Comments ({comments.length})</h3>

      {/* Comments List */}
      <div className="space-y-4">
        {isLoading ? (
          <p className="text-center text-foreground/70">Loading comments...</p>
        ) : comments.length === 0 ? (
          <p className="text-center text-foreground/70">
            No comments yet. Be the first to comment!
          </p>
        ) : (
          comments.map((comment) => (
            <div key={comment.id} className="flex gap-3 dark:bg-foreground/5 rounded-lg shadow-md shadow-[#00000007] border border-border-color p-4">
              <Avatar
                avatarUrl={comment.profile?.avatar_url}
                fullName={comment.profile?.full_name}
                size="sm"
              />
              <div className="flex-1">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium">
                      {comment.profile?.full_name || 'Anonymous'}
                    </p>
                    <p className="text-xs text-foreground/50">
                      @{comment.profile?.nickname} · {formatDate(comment.created_at)}
                    </p>
                  </div>
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
                <p className="mt-2 text-sm text-foreground/90">
                  {comment.comment_text}
                </p>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Comment Form */}
      {user && (
        <form onSubmit={handleSubmitComment} className="space-y-3">
          <textarea
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            placeholder="Write a comment..."
            rows={3}
            className="w-full rounded-lg border border-border-color bg-background px-3 py-2 text-sm transition-colors focus:border-primary focus:outline-none"
            disabled={isSubmitting}
          />
          <Button
            type="submit"
            size="sm"
            icon={<SendSVG />}
            disabled={isSubmitting || !commentText.trim()}
          >
            {isSubmitting ? 'Posting...' : 'Post Comment'}
          </Button>
        </form>
      )}

      {!user && (
        <p className="text-sm text-foreground/70">
          Please log in to leave a comment.
        </p>
      )}
    </div>
  )
}
