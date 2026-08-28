'use client';

import Button from '@/components/shared/Button';
import Popover from '@/components/shared/Popover';
import { formatShareTitle, getShareLinks } from '@/utils/share';
import clsx from 'clsx';
import FacebookSVG from 'public/icons/facebook.svg';
import LinkSVG from 'public/icons/link.svg';
import PinterestSVG from 'public/icons/pinterest.svg';
import ShareSVG from 'public/icons/share2.svg';
import WhatsAppSVG from 'public/icons/whatsapp.svg';
import XSVG from 'public/icons/x.svg';
import { useCallback, useState, type MouseEvent } from 'react';

type ShareButtonProps = {
  url: string;
  title: string;
  image?: string | null;
  size?: 'default' | 'compact';
  /** When set, renders a labeled secondary Button instead of the circular icon trigger */
  label?: string;
  /** Shorter label shown below the `md` breakpoint. Falls back to `label`. */
  labelSmall?: string;
  className?: string;
};

type CopiedAction = 'link' | 'instagram' | null;

const menuItemClass =
  'flex w-full items-center whitespace-nowrap rounded-lg px-3 py-2 text-left text-sm hover:bg-background';

function canUseNativeShare(): boolean {
  return typeof navigator !== 'undefined' && typeof navigator.share === 'function';
}

export default function ShareButton({
  url,
  title,
  image,
  size = 'default',
  label,
  labelSmall,
  className,
}: ShareButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [copiedAction, setCopiedAction] = useState<CopiedAction>(null);

  const shareTitle = formatShareTitle(title);
  const links = getShareLinks({ url, title: shareTitle, image });
  const isCompact = size === 'compact';
  const hasNativeShare = canUseNativeShare();

  const copyToClipboard = useCallback(async (action: 'link' | 'instagram') => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedAction(action);
      window.setTimeout(() => setCopiedAction(null), 2000);
    } catch {
      // Clipboard may be unavailable
    }
  }, [url]);

  const handleNativeShareClick = useCallback(async (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();

    try {
      await navigator.share({ title: shareTitle, text: shareTitle, url });
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        return;
      }
      setIsOpen(true);
    }
  }, [shareTitle, url]);

  const triggerButton = label ? (
    <Button
      type="button"
      variant="secondary"
      size="sm"
      className={clsx('inline-flex!', className)}
      icon={(
        <ShareSVG
          className="size-4 shrink-0 fill-current"
        />
      )}
      onClick={hasNativeShare ? handleNativeShareClick : undefined}
    >
      {labelSmall ? (
        <>
          <span
            className="md:hidden"
          >
            {labelSmall}
          </span>
          <span
            className="hidden md:inline"
          >
            {label}
          </span>
        </>
      ) : label}
    </Button>
  ) : (
    <button
      type="button"
      onClick={hasNativeShare ? handleNativeShareClick : undefined}
      className={clsx(
        'group relative z-10 inline-flex! items-center justify-center rounded-full border border-border-color-strong text-sm font-medium text-foreground transition-colors overflow-visible',
        'hover:border-primary focus-visible:border-primary focus-visible:outline-none',
        'bg-background-light hover:bg-background-medium focus-visible:bg-background-medium',
        isCompact ? 'size-6.5' : 'size-9',
        className,
      )}
      aria-label="Share"
    >
      <ShareSVG
        className={clsx(
          'fill-foreground/80 transition-colors group-hover:fill-primary',
          isCompact ? 'size-4' : 'size-5',
        )}
      />
    </button>
  );

  const shareMenu = (
    <>
      <div
        className="p-2"
      >
        <button
          type="button"
          onClick={() => void copyToClipboard('link')}
          className={menuItemClass}
        >
          <LinkSVG
            className="mr-3 h-4 w-4 shrink-0"
          />
          <span>
            {copiedAction === 'link' ? 'Copied!' : 'Copy link'}
          </span>
        </button>
      </div>

      <div
        className="border-t border-border-color-strong mx-4"
      />

      <div
        className="p-2"
      >
        <a
          href={links.facebook}
          target="_blank"
          rel="noopener noreferrer"
          className={menuItemClass}
          onClick={() => setIsOpen(false)}
        >
          <FacebookSVG
            className="mr-3 h-4 w-4 shrink-0 text-[#1877F2]"
          />
          <span>
            Facebook
          </span>
        </a>

        <a
          href={links.x}
          target="_blank"
          rel="noopener noreferrer"
          className={menuItemClass}
          onClick={() => setIsOpen(false)}
        >
          <XSVG
            className="mr-3 h-4 w-4 shrink-0"
          />
          <span>
            X
          </span>
        </a>

        <a
          href={links.whatsapp}
          target="_blank"
          rel="noopener noreferrer"
          className={menuItemClass}
          onClick={() => setIsOpen(false)}
        >
          <WhatsAppSVG
            className="mr-3 h-4 w-4 shrink-0 text-[#25D366]"
          />
          <span>
            WhatsApp
          </span>
        </a>

        {links.pinterest && (
          <a
            href={links.pinterest}
            target="_blank"
            rel="noopener noreferrer"
            className={menuItemClass}
            onClick={() => setIsOpen(false)}
          >
            <PinterestSVG
              className="mr-3 h-4 w-4 shrink-0 text-[#BD081C]"
            />
            <span>
              Pinterest
            </span>
          </a>
        )}
      </div>
    </>
  );

  return (
    <Popover
      align="auto"
      side="auto"
      width="trigger"
      className="rounded-xl border-border-color-strong"
      open={isOpen}
      onOpenChange={setIsOpen}
      trigger={triggerButton}
    >
      {shareMenu}
    </Popover>
  );
}
