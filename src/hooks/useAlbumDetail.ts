import { useState, useEffect, useRef } from 'react'
import exifr from 'exifr'
import { useRouter, useParams } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { createClient } from '@/utils/supabase/client'
import type { Album, AlbumPhoto } from '@/types/albums'

export function useAlbumDetail() {
  // Hook declarations
  const { user, isLoading: authLoading } = useAuth();
  const supabase = createClient();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { albumSlug } = useParams<{ albumSlug: string }>();
  const isNewAlbum = albumSlug === 'new';

  const [album, setAlbum] = useState<Album | null>(null);
  const [photos, setPhotos] = useState<AlbumPhoto[]>([]);
  const [pendingPhotos, setPendingPhotos] = useState<File[]>([]);
  const [profile, setProfile] = useState<{ nickname: string | null } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingPhotoId, setEditingPhotoId] = useState<string | null>(null);
  const [editingCaption, setEditingCaption] = useState('');

  // Form state
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');

  // Fetch profile and album data on mount
  useEffect(() => {
    if (!authLoading && !user) {
      setIsLoading(false);
      return;
    }
    const fetchProfileAndAlbum = async () => {
      if (!user) return;
      try {
        // Fetch profile
        const { data: profileData } = await supabase
          .from('profiles')
          .select('nickname')
          .eq('id', user.id)
          .single();
        if (profileData) setProfile(profileData);

        if (!isNewAlbum) {
          // Fetch album
          const { data: albumData, error: albumError } = await supabase
            .from('albums')
            .select('id, title, slug, description, is_public, cover_image_url, created_at, updated_at, user_id')
            .eq('slug', albumSlug)
            .eq('user_id', user.id)
            .single();
          if (albumError) {
            setError('Album not found');
            setIsLoading(false);
            return;
          }
          setAlbum(albumData as Album);
          setTitle(albumData.title);
          setSlug(albumData.slug);
          setDescription(albumData.description || '');
          setIsPublic(albumData.is_public);

          // Fetch tags
          const { data: tagsData } = await supabase
            .from('album_tags')
            .select('tag')
            .eq('album_id', albumData.id);
          if (tagsData) setTags(tagsData.map((t: { tag: string }) => t.tag));

          // Fetch photos
          const { data: photosData } = await supabase
            .from('album_photos')
            .select('id, album_id, photo_url, title, width, height, sort_order')
            .eq('album_id', albumData.id)
            .order('sort_order', { ascending: true })
          if (photosData) setPhotos(photosData as AlbumPhoto[])
        }
      } catch (err) {
        setError('Failed to load album/profile')
      }
      setIsLoading(false)
    }

    fetchProfileAndAlbum()
  }, [user, authLoading, albumSlug])


  // Handler and fetch functions
  const generateSlug = (text: string) => {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
  }

  const handleTitleChange = (value: string) => {
    setTitle(value)
    if (isNewAlbum) {
      setSlug(generateSlug(value))
    }
  }

  // Placeholder handler implementations (should be filled with actual logic as needed)
  const handleSave = async () => { }
  const handlePhotoUpload = async () => { }
  const handleDeletePhoto = async (photoId: string, photoUrl: string) => {
    setPhotos((prev) => prev.filter((p) => p.id !== photoId));
    // TODO: Add API call to delete photo from backend/storage if needed
  }
  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = photos.findIndex((p) => p.id === active.id);
    const newIndex = photos.findIndex((p) => p.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const newPhotos = [...photos];
    const moved = newPhotos.splice(oldIndex, 1)[0];
    newPhotos.splice(newIndex, 0, moved);
    setPhotos(newPhotos);
  }
  const handlePendingPhotosDragEnd = (event: any) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = Number(active.id.replace('pending-', ''));
    const newIndex = Number(over.id.replace('pending-', ''));
    if (isNaN(oldIndex) || isNaN(newIndex)) return;
    const newPendingPhotos = [...pendingPhotos];
    const moved = newPendingPhotos.splice(oldIndex, 1)[0];
    newPendingPhotos.splice(newIndex, 0, moved);
    setPendingPhotos(newPendingPhotos);
  }
  const handleEditCaption = (photoId: string, currentTitle: string | null) => {
    setEditingPhotoId(photoId);
    setEditingCaption(currentTitle || '');
  }
  const handleSaveCaption = async () => {
    if (!editingPhotoId) return;
    setPhotos((prev) =>
      prev.map((p) =>
        p.id === editingPhotoId ? { ...p, title: editingCaption } : p
      )
    );
    setEditingPhotoId(null);
    setEditingCaption('');
  }
  const handleCancelEdit = () => {
    setEditingPhotoId(null);
    setEditingCaption('');
  }
  const handleAddTag = () => { }
  const handleRemoveTag = () => { }
  const handleRemovePendingPhoto = () => { }

  return {
    user,
    authLoading,
    supabase,
    router,
    fileInputRef,
    albumSlug,
    isNewAlbum,
    album,
    setAlbum,
    photos,
    setPhotos,
    pendingPhotos,
    setPendingPhotos,
    profile,
    setProfile,
    isLoading,
    setIsLoading,
    isSaving,
    setIsSaving,
    isUploading,
    setIsUploading,
    success,
    setSuccess,
    error,
    setError,
    editingPhotoId,
    setEditingPhotoId,
    editingCaption,
    setEditingCaption,
    title,
    setTitle,
    slug,
    setSlug,
    description,
    setDescription,
    isPublic,
    setIsPublic,
    tags,
    setTags,
    tagInput,
    setTagInput,
    handleTitleChange,
    handleSave,
    handlePhotoUpload,
    handleDeletePhoto,
    handleDragEnd,
    handlePendingPhotosDragEnd,
    handleEditCaption,
    handleSaveCaption,
    handleCancelEdit,
    handleAddTag,
    handleRemoveTag,
    handleRemovePendingPhoto,
    // Export all handlers and fetchers here
  }
}
