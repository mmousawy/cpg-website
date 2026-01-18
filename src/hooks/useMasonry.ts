import { useEffect, useRef, useCallback } from 'react';

const useMasonry = () => {
  const masonryContainer = useRef<HTMLDivElement | null>(null);

  const recalculateMasonry = useCallback(() => {
    if (!masonryContainer.current) return;

    const container = masonryContainer.current;
    const items = Array.from(container.children);

    if (items.length < 1) return;

    const gapSize = parseInt(
      window.getComputedStyle(container).getPropertyValue('grid-row-gap'),
    ) || 0;

    const elementLeft = (el: HTMLElement) => el.getBoundingClientRect().left;
    const elementTop = (el: HTMLElement) => el.getBoundingClientRect().top + window.scrollY;
    const elementBottom = (el: HTMLElement) => el.getBoundingClientRect().bottom + window.scrollY;

    items.forEach((el) => {
      if (!(el instanceof HTMLElement)) return;

      // Show the element once we start processing
      el.classList.add('opacity-100');

      let previous = el.previousSibling;
      while (previous) {
        if (previous.nodeType === 1) {
          el.style.marginTop = '0';
          if (
            previous instanceof HTMLElement &&
            elementLeft(previous) === elementLeft(el)
          ) {
            el.style.marginTop =
              -(elementTop(el) - elementBottom(previous) - gapSize) + 'px';
            break;
          }
        }
        previous = previous.previousSibling;
      }
    });
  }, []);

  useEffect(() => {
    if (!masonryContainer.current) return;

    const container = masonryContainer.current;

    // Initial calculation
    recalculateMasonry();

    // Recalculate on resize
    window.addEventListener('resize', recalculateMasonry);

    // Use ResizeObserver to detect when children change size (e.g., images loading)
    const resizeObserver = new ResizeObserver(() => {
      recalculateMasonry();
    });

    // Observe all children for size changes
    Array.from(container.children).forEach((child) => {
      resizeObserver.observe(child);
    });

    // Also listen for image load events as a fallback
    const images = container.querySelectorAll('img');
    const handleImageLoad = () => recalculateMasonry();

    images.forEach((img) => {
      if (img.complete) {
        // Image already loaded
        recalculateMasonry();
      } else {
        img.addEventListener('load', handleImageLoad);
      }
    });

    // MutationObserver to handle dynamically added children
    const mutationObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node instanceof HTMLElement) {
            resizeObserver.observe(node);
            const imgs = node.querySelectorAll('img');
            imgs.forEach((img) => {
              img.addEventListener('load', handleImageLoad);
            });
          }
        });
      });
      recalculateMasonry();
    });

    mutationObserver.observe(container, { childList: true });

    return () => {
      window.removeEventListener('resize', recalculateMasonry);
      resizeObserver.disconnect();
      mutationObserver.disconnect();
      images.forEach((img) => {
        img.removeEventListener('load', handleImageLoad);
      });
    };
  }, [recalculateMasonry]);

  return masonryContainer;
};

export default useMasonry;
