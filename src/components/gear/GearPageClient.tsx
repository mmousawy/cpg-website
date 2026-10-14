'use client';

import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useFormContext } from 'react-hook-form';

import { ModalContext } from '@/app/providers/ModalProvider';
import { useConfirm } from '@/app/providers/ConfirmProvider';
import GearAddEditForm from '@/components/gear/GearAddEditForm';
import GearItemRow from '@/components/gear/GearItemRow';
import GearSortableList from '@/components/gear/GearSortableList';
import { groupGearByCategory, sortGearItems, type GearSortMode } from '@/components/gear/sortGearItems';
import Button from '@/components/shared/Button';
import Select from '@/components/shared/Select';
import { useAuth } from '@/context/AuthContext';
import { useGearProfile } from '@/hooks/useGearProfile';
import { GEAR_CATEGORY_ICONS } from '@/lib/gear/gearCategoryIcons';
import { SAMPLE_GEAR_ITEMS, useShowGearSampleKit } from '@/lib/gear/sampleKit';
import { GEAR_CATEGORY_LABELS, type GearCategory, type UserGearItem, type UserGearProfile } from '@/lib/gear/types';
import FormatDigitalSVG from 'public/icons/gear/format-digital.svg';
import CameraLensSVG from 'public/icons/camera-lens.svg';
import PlusSVG from 'public/icons/plus.svg';

export type GearInventoryActions = {
  openAddModal: () => void;
  handleSampleKit: () => void;
};

const GEAR_SORT_OPTIONS: { value: GearSortMode; label: string }[] = [
  { value: 'type', label: 'Type' },
  { value: 'name', label: 'Name' },
  { value: 'added', label: 'Recently added' },
  { value: 'custom', label: 'Custom' },
];

type GearPageClientProps = {
  profileNickname: string;
  /** `account` = edit on /account/gear; `public` = read-only on /@nickname/gear */
  mode?: 'public' | 'account';
  hideAccountToolbar?: boolean;
  onInventoryActions?: (actions: GearInventoryActions) => void;
  /** Read profile and updates from parent `FormProvider` (account gear page). */
  useGearForm?: boolean;
  /** Server-rendered gear; skips client fetch on public gear pages. */
  initialProfile?: UserGearProfile;
};

type GearPageClientCoreProps = GearPageClientProps & {
  profile: UserGearProfile;
  hydrated: boolean;
  updateProfile: (next: UserGearProfile) => void;
};

function gearItemCountLabel(count: number): string {
  if (count === 0) {
    return 'No gear listed yet';
  }

  return `${count} ${count === 1 ? 'Item' : 'Items total'}`;
}

function CategoryHeading({
  category,
  label,
  itemCount,
  onAdd,
}: {
  category: GearCategory;
  label: string;
  itemCount: number;
  onAdd?: () => void;
}) {
  const Icon = GEAR_CATEGORY_ICONS[category];
  return (
    <div
      className="mb-3 flex items-center justify-between gap-3"
    >
      <h3
        className="flex min-w-0 items-center gap-2 text-lg font-semibold font-heading text-foreground"
      >
        <span
          className="flex size-8 shrink-0 items-center justify-center rounded-full bg-foreground/8 text-foreground"
        >
          <Icon
            className="size-4"
            aria-hidden
          />
        </span>
        <span
          className="min-w-0"
        >
          {label}
          {' '}
          &mdash;
          {' '}
          {itemCount}
        </span>
      </h3>
      {onAdd && (
        <Button
          type="button"
          variant="tertiary"
          size="sm"
          className="shrink-0"
          onClick={onAdd}
          aria-label={`Add ${GEAR_CATEGORY_LABELS[category].toLowerCase()}`}
          icon={(
            <PlusSVG
              className="size-4 -ml-1"
              aria-hidden
            />
          )}
        >
          {GEAR_CATEGORY_LABELS[category]}
        </Button>
      )}
    </div>
  );
}

function GearPageClientCore({
  profileNickname,
  mode = 'public',
  hideAccountToolbar = false,
  onInventoryActions,
  profile,
  hydrated,
  updateProfile,
}: GearPageClientCoreProps) {
  const showSampleKit = useShowGearSampleKit();
  const { profile: authProfile } = useAuth();
  const isProfileOwner = authProfile?.nickname === profileNickname;
  const editable = mode === 'account';
  const accountLayout = mode === 'account';
  const isOwner = editable;
  const modalContext = useContext(ModalContext);
  const confirm = useConfirm();
  const gearModalInstanceRef = useRef(0);
  const [sortMode, setSortMode] = useState<GearSortMode>(mode === 'public' ? 'custom' : 'type');

  const sorted = useMemo(
    () => sortGearItems(profile.items, sortMode),
    [profile.items, sortMode],
  );
  const grouped = useMemo(() => groupGearByCategory(sorted), [sorted]);
  const items = profile.items;

  const openAddModal = (existing?: UserGearItem, presetCategory?: GearCategory) => {
    gearModalInstanceRef.current += 1;
    const modalKey = `${existing?.id ?? presetCategory ?? 'add'}-${gearModalInstanceRef.current}`;

    modalContext.setSize('default');
    modalContext.setFlushContentTop(false);
    modalContext.setTitle(existing ? 'Edit gear' : 'Add gear');
    modalContext.setContent(
      <GearAddEditForm
        key={modalKey}
        initial={existing ?? null}
        defaultCategory={existing ? undefined : presetCategory}
        onSave={(item) => {
          const nextItems = existing
            ? profile.items.map((i) => (i.id === item.id ? item : i))
            : [...profile.items, item];
          updateProfile({ ...profile, items: nextItems });
          modalContext.setIsOpen(false);
        }}
      />,
    );
    modalContext.setIsOpen(true);
  };

  const handleRemove = async (item: UserGearItem) => {
    const ok = await confirm({
      title: 'Remove gear',
      message: `Remove “${item.name}” from your inventory?`,
      confirmLabel: 'Remove',
      variant: 'danger',
    });
    if (!ok) return;
    updateProfile({
      ...profile,
      items: profile.items.filter((i) => i.id !== item.id),
    });
  };

  const handleSampleKit = async () => {
    const ok = await confirm({
      title: 'Use sample kit',
      message: 'This replaces your current gear list with a short sample kit.',
      confirmLabel: 'Replace list',
    });
    if (!ok) return;
    updateProfile({
      ...profile,
      items: SAMPLE_GEAR_ITEMS.map((item) => ({
        ...item,
        id: crypto.randomUUID(),
        addedAt: Date.now(),
      })),
    });
  };

  const inventoryHandlersRef = useRef<GearInventoryActions>({
    openAddModal: () => { },
    handleSampleKit: () => { },
  });

  useEffect(() => {
    inventoryHandlersRef.current = {
      openAddModal: () => openAddModal(),
      handleSampleKit,
    };
  });

  useEffect(() => {
    if (!onInventoryActions || mode !== 'account') {
      return;
    }
    onInventoryActions({
      openAddModal: () => inventoryHandlersRef.current.openAddModal(),
      handleSampleKit: () => inventoryHandlersRef.current.handleSampleKit(),
    });
  }, [onInventoryActions, mode]);

  if (!hydrated) {
    return null;
  }

  const empty = items.length === 0;

  const inventoryPanelListClass = 'rounded-lg bg-white border border-border-color dark:bg-background space-y-0';
  /** Collapsed list on public gear — same surface as standalone `GearItemRow` cards. */
  const publicGearPanelListClass =
    'rounded-lg border border-border-color bg-white dark:bg-white/5 space-y-0';
  const itemListClass = accountLayout ? inventoryPanelListClass : 'space-y-2';

  return (
    <div
      className="space-y-6"
    >
      {mode === 'public' && !empty && (
        <div
          className="flex w-full flex-wrap items-center justify-between gap-x-4 gap-y-3"
        >
          <p
            className="text-sm text-foreground/70 tabular-nums"
          >
            {gearItemCountLabel(items.length)}
          </p>
          <div
            className="flex flex-wrap items-center gap-3"
          >
            <span
              className="text-sm text-foreground/70 shrink-0"
            >
              Sort by
            </span>
            <Select
              value={sortMode}
              onValueChange={(v) => setSortMode(v as GearSortMode)}
              options={GEAR_SORT_OPTIONS}
              fullWidth={false}
              className="min-w-40"
            />
            {isProfileOwner && (
              <Button
                href="/account/gear"
                variant="secondary"
                size="sm"
              >
                Manage gear
              </Button>
            )}
          </div>
        </div>
      )}

      {mode === 'account' && !hideAccountToolbar && (
        <div
          className="flex flex-wrap justify-end gap-2"
        >
          {showSampleKit && (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleSampleKit}
            >
              Use sample kit
            </Button>
          )}
          <Button
            type="button"
            size="sm"
            onClick={() => openAddModal()}
          >
            Add gear
          </Button>
        </div>
      )}

      {!empty && mode === 'account' && (
        <div
          className="flex flex-col gap-1"
        >
          <div
            className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3"
          >
            <p
              className="text-sm text-foreground/70 tabular-nums"
            >
              {gearItemCountLabel(items.length)}
            </p>
            <div
              className="flex items-center gap-3"
            >
              <span
                className="text-sm text-foreground/70 shrink-0"
              >
                Sort by
              </span>
              <Select
                value={sortMode}
                onValueChange={(v) => setSortMode(v as GearSortMode)}
                options={GEAR_SORT_OPTIONS}
                fullWidth={false}
                className="min-w-[10rem]"
              />
            </div>
          </div>
          {sortMode === 'custom' && isOwner && (
            <p
              className="text-foreground/60 text-xs sm:text-sm sm:text-end"
            >
              Drag the handle to set your order. Visitors see this list on your gear page.
            </p>
          )}
        </div>
      )}

      {empty && (
        <div
          className={accountLayout
            ? 'flex flex-col items-center rounded-xl border border-dashed border-border-color bg-background px-6 py-12 text-center'
            : undefined}
        >
          {accountLayout && (
            <div
              className="mb-4 flex items-center gap-3 text-foreground/40"
            >
              <FormatDigitalSVG
                className="size-12"
                aria-hidden
              />
              <CameraLensSVG
                className="size-12"
                aria-hidden
              />
            </div>
          )}
          <p
            className={accountLayout ? 'text-base text-foreground/70 max-w-sm' : 'text-foreground/70 text-sm'}
          >
            {editable
              ? 'Nothing listed yet. Add your cameras, lenses, and other gear.'
              : 'No gear listed yet.'}
          </p>
          {accountLayout && editable && (
            <Button
              type="button"
              className="mt-6"
              size="sm"
              onClick={() => openAddModal()}
            >
              Add gear
            </Button>
          )}
        </div>
      )}

      {!empty && sortMode === 'type' && (
        <div
          className="space-y-6"
        >
          {grouped.map((group) => (
            <section
              key={group.category}
            >
              <CategoryHeading
                category={group.category}
                label={group.label}
                itemCount={group.items.length}
                onAdd={editable ? () => openAddModal(undefined, group.category) : undefined}
              />
              <div
                className={accountLayout ? inventoryPanelListClass : publicGearPanelListClass}
              >
                {group.items.map((item) => (
                  <GearItemRow
                    key={item.id}
                    item={item}
                    isOwner={isOwner}
                    embedded
                    onEdit={() => openAddModal(item)}
                    onRemove={() => handleRemove(item)}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {!empty && sortMode === 'custom' && accountLayout && (
        <GearSortableList
          items={sorted}
          isOwner={isOwner}
          embedded={accountLayout}
          showCategory
          listClassName={itemListClass}
          onReorder={(nextItems) => {
            updateProfile({ ...profile, items: nextItems });
          }}
          onEdit={openAddModal}
          onRemove={handleRemove}
        />
      )}

      {!empty && sortMode === 'custom' && !accountLayout && (
        <div
          className={publicGearPanelListClass}
        >
          {sorted.map((item) => (
            <GearItemRow
              key={item.id}
              item={item}
              isOwner={isOwner}
              embedded
              showCategory
              onEdit={() => openAddModal(item)}
              onRemove={() => handleRemove(item)}
            />
          ))}
        </div>
      )}

      {!empty && sortMode !== 'type' && sortMode !== 'custom' && (
        <div
          className={accountLayout ? itemListClass : 'space-y-2'}
        >
          {sorted.map((item) => (
            <GearItemRow
              key={item.id}
              item={item}
              isOwner={isOwner}
              showCategory
              embedded={accountLayout}
              onEdit={() => openAddModal(item)}
              onRemove={() => handleRemove(item)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function GearPageClientFromForm(props: GearPageClientProps) {
  const { watch, reset } = useFormContext<UserGearProfile>();
  const profile = watch();
  const updateProfile = useCallback(
    (next: UserGearProfile) => {
      reset(next);
    },
    [reset],
  );

  return (
    <GearPageClientCore
      {...props}
      profile={profile}
      hydrated={true}
      updateProfile={updateProfile}
    />
  );
}

function GearPageClientFromStorage({
  profileNickname,
  initialProfile,
  ...rest
}: GearPageClientProps) {
  const { profile, hydrated, persist } = useGearProfile(profileNickname, {
    initialProfile,
    skipFetch: initialProfile !== undefined,
  });
  const updateProfile = useCallback(
    (next: UserGearProfile) => {
      void persist(next);
    },
    [persist],
  );

  const resolvedProfile = initialProfile ?? profile;

  if (!resolvedProfile) {
    return null;
  }

  return (
    <GearPageClientCore
      {...rest}
      profileNickname={profileNickname}
      profile={resolvedProfile}
      hydrated={initialProfile !== undefined ? true : hydrated}
      updateProfile={updateProfile}
    />
  );
}

export default function GearPageClient(props: GearPageClientProps) {
  if (props.useGearForm) {
    return <GearPageClientFromForm
      {...props}
    />;
  }
  return (
    <GearPageClientFromStorage
      {...props}
    />
  );
}
