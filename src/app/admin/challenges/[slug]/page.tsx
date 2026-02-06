'use client';

import { useParams, useRouter } from 'next/navigation';
import { useContext, useEffect, useRef, useState } from 'react';

import { revalidateChallenge, revalidateChallenges } from '@/app/actions/revalidate';
import { useConfirm } from '@/app/providers/ConfirmProvider';
import { ModalContext } from '@/app/providers/ModalProvider';
import AnnounceChallengeModal from '@/components/admin/AnnounceChallengeModal';
import Container from '@/components/layout/Container';
import PageContainer from '@/components/layout/PageContainer';
import Button from '@/components/shared/Button';
import Checkbox from '@/components/shared/Checkbox';
import ErrorMessage from '@/components/shared/ErrorMessage';
import Input from '@/components/shared/Input';
import StickyActionBar from '@/components/shared/StickyActionBar';
import SuccessMessage from '@/components/shared/SuccessMessage';
import Textarea from '@/components/shared/Textarea';
import { useAuth } from '@/hooks/useAuth';
import { useChallengeBySlug } from '@/hooks/useChallenges';
import { useFormChanges } from '@/hooks/useFormChanges';
import { useSupabase } from '@/hooks/useSupabase';
import { generateBlurhash } from '@/utils/generateBlurhash';
import Image from 'next/image';

import MegaphoneSVG from 'public/icons/megaphone.svg';
import TrashSVG from 'public/icons/trash.svg';

export default function AdminChallengeFormPage() {
  const { user } = useAuth();
  const confirm = useConfirm();
  const router = useRouter();
  const params = useParams();
  const supabase = useSupabase();
  const modalContext = useContext(ModalContext);

  const challengeSlug = params.slug as string;
  const isNewChallenge = challengeSlug === 'new';

  // Fetch existing challenge data
  const { data: existingChallenge, isLoading: isLoadingChallenge } = useChallengeBySlug(
    isNewChallenge ? undefined : challengeSlug,
  );

  const coverImageInputRef = useRef<HTMLInputElement>(null);
  const [coverImageFile, setCoverImageFile] = useState<File | null>(null);
  const [coverImagePreview, setCoverImagePreview] = useState<string | null>(null);

  const [isSaving, setIsSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [prompt, setPrompt] = useState('');
  const [startsAt, setStartsAt] = useState('');
  const [endsAt, setEndsAt] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [maxPhotosPerUser, setMaxPhotosPerUser] = useState<string>('');
  const [coverImage, setCoverImage] = useState('');
  const [savedFormValues, setSavedFormValues] = useState<Record<string, unknown> | null>(null);

  // Load existing challenge data
  useEffect(() => {
    if (isNewChallenge || !existingChallenge) return;

    setTitle(existingChallenge.title || '');
    setSlug(existingChallenge.slug || '');
    setPrompt(existingChallenge.prompt || '');
    setStartsAt(existingChallenge.starts_at?.split('T')[0] || '');
    setEndsAt(existingChallenge.ends_at?.split('T')[0] || '');
    setIsActive(existingChallenge.is_active);
    setMaxPhotosPerUser(existingChallenge.max_photos_per_user?.toString() || '');
    setCoverImage(existingChallenge.cover_image_url || '');
    setCoverImagePreview(existingChallenge.cover_image_url || null);

    setSavedFormValues({
      title: existingChallenge.title || '',
      slug: existingChallenge.slug || '',
      prompt: existingChallenge.prompt || '',
      startsAt: existingChallenge.starts_at?.split('T')[0] || '',
      endsAt: existingChallenge.ends_at?.split('T')[0] || '',
      isActive: existingChallenge.is_active,
      maxPhotosPerUser: existingChallenge.max_photos_per_user?.toString() || '',
      coverImage: existingChallenge.cover_image_url || '',
    });
  }, [existingChallenge, isNewChallenge]);

  // Auto-generate slug from title
  const generateSlug = (text: string) => {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  };

  const handleTitleBlur = () => {
    if (!slug.trim() && title.trim()) {
      setSlug(generateSlug(title));
    }
  };

  const handleSlugChange = (newSlug: string) => {
    setSlug(generateSlug(newSlug));
  };

  const handleCoverImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        setError('Invalid file type. Please use JPEG, PNG, GIF, or WebP.');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setError('File too large. Maximum size is 5 MB.');
        return;
      }
      setCoverImageFile(file);
      setCoverImagePreview(URL.createObjectURL(file));
      setError(null);
    }
  };

  const handleCoverImageRemove = () => {
    setCoverImageFile(null);
    setCoverImagePreview(null);
    setCoverImage('');
    if (coverImageInputRef.current) {
      coverImageInputRef.current.value = '';
    }
  };

  // Track form changes
  const currentFormValues = {
    title,
    slug,
    prompt,
    startsAt,
    endsAt,
    isActive,
    maxPhotosPerUser,
    coverImage,
  };

  const { hasChanges, changeCount } = useFormChanges(currentFormValues, savedFormValues, {}, !!coverImageFile);

  const handleAnnounce = () => {
    if (!existingChallenge || !modalContext) return;

    modalContext.setTitle(`Announce challenge: ${existingChallenge.title}`);
    modalContext.setContent(
      <AnnounceChallengeModal
        challengeId={existingChallenge.id}
        onClose={() => modalContext.setIsOpen(false)}
      />,
    );
    modalContext.setSize('large');
    modalContext.setIsOpen(true);
  };

  const handleDelete = async () => {
    const confirmed = await confirm({
      title: 'Delete challenge?',
      message:
        'Are you sure you want to delete this challenge? This will also delete all submissions.',
      confirmLabel: 'Delete',
      cancelLabel: 'Cancel',
      variant: 'danger',
    });

    if (!confirmed) return;

    const { error: deleteError } = await supabase
      .from('challenges')
      .delete()
      .eq('slug', challengeSlug);

    if (deleteError) {
      setError(deleteError.message || 'Failed to delete challenge');
    } else {
      // Revalidate all challenges after deletion
      await revalidateChallenges();
      router.push('/admin/challenges');
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim() || !prompt.trim() || !slug.trim()) {
      setError('Title, slug, and prompt are required');
      return;
    }

    if (!user?.id) {
      setError('You must be logged in to save a challenge');
      return;
    }

    setIsSaving(true);
    setError(null);
    setSuccess(false);

    try {
      let coverImageUrl = coverImage;
      let imageBlurhash: string | null = null;
      let imageWidth: number | null = null;
      let imageHeight: number | null = null;

      // Upload cover image if selected
      if (coverImageFile) {
        const dimensions = await new Promise<{ width: number; height: number }>(
          (resolve, reject) => {
            const img = document.createElement('img');
            img.onload = () => resolve({ width: img.width, height: img.height });
            img.onerror = reject;
            img.src = URL.createObjectURL(coverImageFile);
          },
        );

        imageWidth = dimensions.width;
        imageHeight = dimensions.height;
        imageBlurhash = await generateBlurhash(coverImageFile);

        const fileExt = coverImageFile.name.split('.').pop();
        const randomId = crypto.randomUUID();
        const fileName = `${randomId}.${fileExt}`;
        const filePath = `challenges/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('event-covers')
          .upload(filePath, coverImageFile, {
            cacheControl: '3600',
            upsert: false,
          });

        if (uploadError) {
          setError('Failed to upload cover image');
          setIsSaving(false);
          return;
        }

        const {
          data: { publicUrl },
        } = supabase.storage.from('event-covers').getPublicUrl(filePath);

        coverImageUrl = publicUrl;
      }

      const challengeData = {
        title: title.trim(),
        slug: slug.trim(),
        prompt: prompt.trim(),
        starts_at: startsAt ? new Date(startsAt).toISOString() : new Date().toISOString(),
        ends_at: endsAt ? new Date(endsAt).toISOString() : null,
        is_active: isActive,
        max_photos_per_user: maxPhotosPerUser ? parseInt(maxPhotosPerUser, 10) : null,
        cover_image_url: coverImageUrl || null,
        image_blurhash: coverImageFile ? imageBlurhash : existingChallenge?.image_blurhash,
        image_width: coverImageFile ? imageWidth : existingChallenge?.image_width,
        image_height: coverImageFile ? imageHeight : existingChallenge?.image_height,
      };

      if (isNewChallenge) {
        const { error: createError } = await supabase.from('challenges').insert({
          ...challengeData,
          created_by: user.id,
        });

        if (createError) {
          setError(createError.message || 'Failed to create challenge');
          setIsSaving(false);
          return;
        }

        // Revalidate all challenges (new challenge affects list pages)
        await revalidateChallenges();

        setSuccess(true);
        setTimeout(() => router.push('/admin/challenges'), 1500);
      } else {
        const { error: updateError } = await supabase
          .from('challenges')
          .update(challengeData)
          .eq('slug', challengeSlug);

        if (updateError) {
          setError(updateError.message || 'Failed to update challenge');
          setIsSaving(false);
          return;
        }

        // Revalidate this specific challenge
        await revalidateChallenge(slug);

        setSavedFormValues({ ...currentFormValues, coverImage: coverImageUrl });
        setCoverImage(coverImageUrl);
        setCoverImageFile(null);
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setIsSaving(false);
    }
  };

  const isLoading = !isNewChallenge && isLoadingChallenge;

  return (
    <>
      <PageContainer>
        <div
          className="mb-8"
        >
          <h1
            className="mb-2 text-3xl font-bold"
          >
            {isNewChallenge ? 'Create new challenge' : 'Edit challenge'}
          </h1>
          <p
            className="text-lg opacity-70"
          >
            {isNewChallenge
            ? 'Set up a new photo challenge'
            : 'Update the challenge details'}
          </p>
        </div>

        {isLoading ? (
          <Container
            className="text-center animate-pulse"
          >
            <p
              className="text-foreground/50"
            >
              Loading challenge...
            </p>
          </Container>
      ) : (
        <div
          className="space-y-6"
        >
          <form
            id="challenge-form"
            onSubmit={handleSave}
          >
            <Container>
              <h2
                className="mb-6 text-xl font-semibold"
              >
                Challenge details
              </h2>
              <div
                className="space-y-6"
              >
                {/* Title */}
                <div
                  className="flex flex-col gap-2"
                >
                  <label
                    htmlFor="title"
                    className="text-sm font-medium"
                  >
                    Title *
                  </label>
                  <Input
                    id="title"
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    onBlur={handleTitleBlur}
                    required
                    placeholder="e.g., Golden Hour Challenge"
                  />
                </div>

                {/* Slug */}
                <div
                  className="flex flex-col gap-2"
                >
                  <label
                    htmlFor="slug"
                    className="text-sm font-medium"
                  >
                    URL Slug *
                  </label>
                  <Input
                    id="slug"
                    type="text"
                    value={slug}
                    onChange={(e) => handleSlugChange(e.target.value)}
                    required
                    pattern="[a-z0-9-]+"
                    mono
                    placeholder="golden-hour-challenge"
                  />
                  <p
                    className="text-xs text-muted-foreground"
                  >
                    Used in the URL: /challenges/
                    {slug || 'your-slug-here'}
                  </p>
                </div>

                {/* Prompt */}
                <div
                  className="flex flex-col gap-2"
                >
                  <label
                    htmlFor="prompt"
                    className="text-sm font-medium"
                  >
                    Prompt / Description *
                  </label>
                  <Textarea
                    id="prompt"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    rows={4}
                    required
                    placeholder="Describe the theme and what kind of photos you're looking for..."
                  />
                </div>

                {/* Dates */}
                <div
                  className="grid grid-cols-1 gap-4 sm:grid-cols-2"
                >
                  <div
                    className="flex flex-col gap-2"
                  >
                    <label
                      htmlFor="startsAt"
                      className="text-sm font-medium"
                    >
                      Starts at
                    </label>
                    <Input
                      id="startsAt"
                      type="date"
                      value={startsAt}
                      onChange={(e) => setStartsAt(e.target.value)}
                    />
                  </div>
                  <div
                    className="flex flex-col gap-2"
                  >
                    <label
                      htmlFor="endsAt"
                      className="text-sm font-medium"
                    >
                      Ends at
                    </label>
                    <Input
                      id="endsAt"
                      type="date"
                      value={endsAt}
                      onChange={(e) => setEndsAt(e.target.value)}
                    />
                    <p
                      className="text-xs text-muted-foreground"
                    >
                      Leave empty for no deadline
                    </p>
                  </div>
                </div>

                {/* Active Toggle */}
                <div
                  className="flex items-center gap-3"
                >
                  <Checkbox
                    id="isActive"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    label="Active (accepting submissions)"
                    labelClassName="flex items-center gap-3 cursor-pointer"
                  />
                </div>

                {/* Max Photos Per User */}
                <div
                  className="flex flex-col gap-2"
                >
                  <label
                    htmlFor="maxPhotosPerUser"
                    className="text-sm font-medium"
                  >
                    Max photos per user
                  </label>
                  <Input
                    id="maxPhotosPerUser"
                    type="number"
                    min="1"
                    max="100"
                    value={maxPhotosPerUser}
                    onChange={(e) => setMaxPhotosPerUser(e.target.value)}
                    placeholder="Unlimited"
                    className="max-w-32"
                  />
                  <p
                    className="text-xs text-muted-foreground"
                  >
                    Leave empty for unlimited submissions
                  </p>
                </div>

                {/* Cover Image */}
                <div
                  className="flex flex-col gap-2"
                >
                  <label
                    className="text-sm font-medium"
                  >
                    Cover Image
                  </label>
                  {coverImagePreview ? (
                    <div
                      className="space-y-3"
                    >
                      <div
                        className="relative aspect-video w-full overflow-hidden rounded-lg border border-border-color"
                      >
                        <Image
                          src={coverImagePreview}
                          alt="Cover preview"
                          fill
                          className="object-cover"
                        />
                      </div>
                      <div
                        className="flex gap-2"
                      >
                        <Button
                          type="button"
                          onClick={() => coverImageInputRef.current?.click()}
                          variant="secondary"
                          size="sm"
                        >
                          Change Image
                        </Button>
                        <Button
                          type="button"
                          onClick={handleCoverImageRemove}
                          variant="secondary"
                          size="sm"
                          icon={<TrashSVG
                            className="h-4 w-4"
                          />}
                        >
                          Remove
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div
                      className="rounded-lg border-2 border-dashed border-border-color p-8 text-center"
                    >
                      <p
                        className="mb-3 text-sm text-foreground/70"
                      >
                        No cover image selected (optional)
                      </p>
                      <Button
                        type="button"
                        onClick={() => coverImageInputRef.current?.click()}
                        variant="secondary"
                        size="sm"
                      >
                        Select image
                      </Button>
                    </div>
                  )}
                  <input
                    ref={coverImageInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/gif,image/webp"
                    onChange={handleCoverImageChange}
                    className="hidden"
                  />
                </div>
              </div>

            </Container>
          </form>

          {/* Notifications Section - Only for existing challenges */}
          {!isNewChallenge && existingChallenge && (
            <Container>
              <h2
                className="mb-6 text-xl font-semibold"
              >
                Notifications
              </h2>
              <div
                className="space-y-4"
              >
                <div>
                  <div
                    className="mb-2 flex items-center justify-between"
                  >
                    <div>
                      <h3
                        className="text-sm font-semibold"
                      >
                        Announce challenge
                      </h3>
                      <p
                        className="text-xs text-foreground/70"
                      >
                        Send a one-time announcement to all members who are opted in
                      </p>
                    </div>
                  </div>
                  <Button
                    onClick={handleAnnounce}
                    variant="primary"
                  >
                    <MegaphoneSVG
                      className="size-5"
                    />
                    Announce challenge
                  </Button>
                  {existingChallenge.announced_at && (
                    <p
                      className="mt-2 text-xs text-foreground/60"
                    >
                      Previously announced on
                      {' '}
                      {new Date(existingChallenge.announced_at).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>
            </Container>
          )}

          {/* Danger Zone - Only for existing challenges */}
          {!isNewChallenge && (
            <Container
              className="border-red-500/30 bg-red-500/5"
            >
              <h3
                className="mb-2 font-semibold text-red-600"
              >
                Danger zone
              </h3>
              <p
                className="mb-4 text-sm text-foreground/70"
              >
                Once you delete a challenge, there is no going back. This will permanently
                delete the challenge and all associated submissions.
              </p>
              <Button
                onClick={handleDelete}
                variant="danger"
                icon={<TrashSVG
                  className="h-4 w-4"
                />}
              >
                Delete challenge
              </Button>
            </Container>
          )}
        </div>
      )}
      </PageContainer>

      {/* Sticky Save Bar */}
      {(hasChanges || isNewChallenge || error || success) && (
        <StickyActionBar
          constrainWidth
        >
          <div
            className="flex items-center gap-3 text-sm"
          >
            {error && (
              <ErrorMessage
                variant="compact"
                className="py-1.5 text-sm"
              >
                {error}
              </ErrorMessage>
            )}
            {success && (
              <SuccessMessage
                variant="compact"
                className="py-1.5 text-sm"
              >
                {isNewChallenge ? 'Challenge created!' : 'Changes saved!'}
              </SuccessMessage>
            )}
            {!error && !success && hasChanges && (
              <span
                className="text-foreground/70"
              >
                {changeCount}
                {' '}
                unsaved
                {' '}
                {changeCount === 1 ? 'change' : 'changes'}
              </span>
            )}
            {!error && !success && isNewChallenge && !hasChanges && (
              <span
                className="text-foreground/70"
              >
                New challenge
              </span>
            )}
          </div>
          <div
            className="flex gap-2"
          >
            <Button
              href="/admin/challenges"
              variant="secondary"
              size="sm"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              form="challenge-form"
              disabled={isSaving || (!hasChanges && !isNewChallenge)}
              loading={isSaving}
              size="sm"
            >
              {isNewChallenge ? 'Create challenge' : 'Save changes'}
            </Button>
          </div>
        </StickyActionBar>
      )}
    </>
  );
}
