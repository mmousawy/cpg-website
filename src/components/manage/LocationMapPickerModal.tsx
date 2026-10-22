'use client';

import Button from '@/components/shared/Button';
import Input from '@/components/shared/Input';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';
import { useDialogVisualViewport } from '@/hooks/useDialogVisualViewport';
import { useDebounce } from '@/hooks/useDebounce';
import { showDialogWithoutScrolling } from '@/lib/bodyScrollLock';
import {
  initialMapZoom,
  parseMapCenter,
  SEARCH_RESULT_MAP_ZOOM,
} from '@/lib/location/mapDefaults';
import type { PlaceSearchResult } from '@/lib/location/searchPlaces';
import clsx from 'clsx';
import { FocusTrap } from 'focus-trap-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';

import MapPinSolidSVG from 'public/icons/map-pin-solid.svg';

function formatCoord(value: number): string {
  return value.toFixed(6);
}

function SearchPendingSpinner() {
  return (
    <svg
      className="size-4 animate-spin text-foreground/50"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}

export type LocationMapPickerModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onChoose: (coords: { lat: number; lng: number }) => void;
  initialLatitude: string;
  initialLongitude: string;
};

type LocationMapPickerBodyProps = Omit<LocationMapPickerModalProps, 'isOpen'>;

function LocationMapPickerBody({
  onClose,
  onChoose,
  initialLatitude,
  initialLongitude,
}: LocationMapPickerBodyProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const searchFieldRef = useRef<HTMLDivElement>(null);
  const skipGeocodeSearchRef = useRef(false);
  const searchGenerationRef = useRef(0);
  const [center, setCenter] = useState<L.LatLngLiteral>(() =>
    parseMapCenter(initialLatitude, initialLongitude),
  );
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearchQuery = useDebounce(searchQuery, 350);
  const [searchResults, setSearchResults] = useState<PlaceSearchResult[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [mapInitialCoords] = useState(() => ({
    latitude: initialLatitude,
    longitude: initialLongitude,
  }));

  const flyMapTo = useCallback((lat: number, lng: number, zoom = SEARCH_RESULT_MAP_ZOOM) => {
    const map = mapRef.current;
    if (!map) return;
    map.flyTo([lat, lng], zoom, { duration: 0.45 });
  }, []);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    const initial = parseMapCenter(mapInitialCoords.latitude, mapInitialCoords.longitude);
    const zoom = initialMapZoom(mapInitialCoords.latitude, mapInitialCoords.longitude);
    const map = L.map(mapContainerRef.current, {
      center: initial,
      zoom,
      zoomControl: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);

    const syncCenter = () => {
      const size = map.getSize();
      if (!size.x || !size.y) return;
      const c = map.getCenter();
      setCenter({ lat: c.lat, lng: c.lng });
    };

    map.on('move', syncCenter);
    map.on('moveend', syncCenter);

    mapRef.current = map;
    const resizeObserver = new ResizeObserver(() => {
      map.invalidateSize();
      syncCenter();
    });
    resizeObserver.observe(mapContainerRef.current);

    return () => {
      resizeObserver.disconnect();
      map.off('move', syncCenter);
      map.off('moveend', syncCenter);
      map.remove();
      mapRef.current = null;
    };
  }, [mapInitialCoords.latitude, mapInitialCoords.longitude]);

  useEffect(() => {
    const q = debouncedSearchQuery.trim();
    if (q.length < 2) {
      return;
    }

    if (skipGeocodeSearchRef.current) {
      skipGeocodeSearchRef.current = false;
      return;
    }

    const generationAtStart = searchGenerationRef.current;
    let cancelled = false;
    setSearchLoading(true);
    setSearchError(null);

    void (async () => {
      try {
        const response = await fetch(`/api/location/search?q=${encodeURIComponent(q)}`);
        if (!response.ok) {
          throw new Error('Search failed');
        }
        const data = (await response.json()) as { results?: PlaceSearchResult[] };
        if (cancelled || generationAtStart !== searchGenerationRef.current) {
          return;
        }
        setSearchResults(data.results ?? []);
      } catch {
        if (!cancelled && generationAtStart === searchGenerationRef.current) {
          setSearchResults([]);
          setSearchError('Could not search locations. Try again.');
        }
      } finally {
        if (!cancelled && generationAtStart === searchGenerationRef.current) {
          setSearchLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [debouncedSearchQuery]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        searchFieldRef.current
        && !searchFieldRef.current.contains(event.target as Node)
      ) {
        setSearchOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectPlace = useCallback(
    (place: PlaceSearchResult) => {
      searchGenerationRef.current += 1;
      skipGeocodeSearchRef.current = true;
      setSearchQuery(place.label);
      setSearchOpen(false);
      setSearchResults([]);
      setSearchLoading(false);
      setSearchError(null);
      flyMapTo(place.lat, place.lng);
    },
    [flyMapTo],
  );

  const handleChoose = useCallback(() => {
    onChoose({ lat: center.lat, lng: center.lng });
  }, [center.lat, center.lng, onChoose]);

  const searchQueryTrimmed = searchQuery.trim();
  const isSearchDebouncing =
    searchQueryTrimmed.length >= 2 && searchQueryTrimmed !== debouncedSearchQuery.trim();
  const showSearchPending = isSearchDebouncing || searchLoading;
  const showSearchResults =
    searchOpen && debouncedSearchQuery.trim().length >= 2 && searchResults.length > 0;

  return (
    <div
      className={clsx(
        'scale-100 modal-panel-in',
        'flex w-full max-w-[42rem] min-w-0 flex-col',
        'relative max-h-full min-h-0',
        'flex flex-col',
        'rounded-xl sm:rounded-2xl border border-border-color bg-background-light shadow-xl shadow-black/25',
      )}
    >
      <div
        className="shrink-0 border-b border-border-color px-4 py-3 sm:px-6"
      >
        <h2
          className="text-lg font-semibold"
        >
          Choose location
        </h2>
        <p
          className="mt-1 text-xs text-foreground/60"
        >
          Search for a place or pan the map so the pin marks where the photo was taken.
        </p>
        <div
          ref={searchFieldRef}
          className="relative mt-3"
        >
          <div
            className="relative"
          >
            <Input
              type="text"
              value={searchQuery}
              className="pr-10"
              onChange={(e) => {
                const value = e.target.value;
                skipGeocodeSearchRef.current = false;
                setSearchQuery(value);
                setSearchError(null);
                if (value.trim().length < 2) {
                  setSearchResults([]);
                  setSearchOpen(false);
                  setSearchLoading(false);
                } else {
                  setSearchOpen(true);
                }
              }}
              onFocus={() => {
                if (searchResults.length > 0) {
                  setSearchOpen(true);
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  setSearchOpen(false);
                  return;
                }
                if (e.key === 'Enter' && searchResults[0]) {
                  e.preventDefault();
                  handleSelectPlace(searchResults[0]);
                }
              }}
              placeholder="Search address or place"
              fullWidth
              autoComplete="off"
              aria-busy={showSearchPending}
              aria-expanded={showSearchResults}
            />
            {showSearchPending && (
              <div
                className="pointer-events-none absolute right-3 top-1/2 z-10 -translate-y-1/2"
                aria-hidden
              >
                <SearchPendingSpinner />
              </div>
            )}
          </div>
          {searchError && (
            <p
              className="mt-1 text-xs text-red-500"
            >
              {searchError}
            </p>
          )}
          {showSearchResults && (
            <ul
              className="absolute z-20 mt-1 max-h-48 w-full overflow-auto rounded-lg border border-border-color bg-background-light py-1 shadow-lg"
            >
              {searchResults.map((place) => (
                <li
                  key={`${place.lat}-${place.lng}-${place.label}`}
                >
                  <button
                    type="button"
                    className="w-full px-3 py-2 text-left text-sm hover:bg-foreground/5"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => handleSelectPlace(place)}
                  >
                    {place.label}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div
        className="relative h-80 w-full shrink-0"
      >
        <div
          ref={mapContainerRef}
          className="absolute inset-0 z-0"
        />
        <div
          className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center"
          aria-hidden
        >
          <MapPinSolidSVG
            className="size-11 -mt-[1.65rem] drop-shadow-md"
          />
        </div>
      </div>

      <div
        className="shrink-0 border-t border-border-color px-4 py-3 sm:px-6"
      >
        <p
          className="mb-3 font-mono text-sm text-foreground/80"
        >
          {formatCoord(center.lat)}
          {', '}
          {formatCoord(center.lng)}
        </p>
        <div
          className="flex justify-end gap-2"
        >
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleChoose}
          >
            Choose
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function LocationMapPickerModal({
  isOpen,
  onClose,
  onChoose,
  initialLatitude,
  initialLongitude,
}: LocationMapPickerModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [isTrapped, setIsTrapped] = useState(false);

  useBodyScrollLock(isOpen);
  useDialogVisualViewport(dialogRef, isOpen);

  useLayoutEffect(() => {
    if (!isOpen) return;
    showDialogWithoutScrolling(dialogRef.current);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      dialogRef.current?.close();
      const timerId = setTimeout(() => setIsTrapped(false), 0);
      return () => clearTimeout(timerId);
    }
    const timerId = setTimeout(() => setIsTrapped(true), 16);
    return () => clearTimeout(timerId);
  }, [isOpen]);

  const handleCancel = useCallback(() => {
    onClose();
  }, [onClose]);

  return (
    <dialog
      ref={dialogRef}
      className={clsx(
        isOpen ? 'pointer-events-auto visible opacity-100 modal-overlay-in' : 'pointer-events-none invisible opacity-0',
        'fixed inset-0 z-[70] overflow-auto overscroll-contain',
        'flex size-full max-h-none max-w-none p-3 max-sm:p-4',
        'bg-black/60',
        'transition-[visibility,opacity] duration-200 ease-out',
      )}
    >
      <FocusTrap
        active={isTrapped}
        focusTrapOptions={{
          clickOutsideDeactivates: false,
          escapeDeactivates: true,
          preventScroll: true,
          onDeactivate: handleCancel,
          fallbackFocus: () => dialogRef.current || document.body,
        }}
      >
        <div
          className="flex w-full min-h-0 min-w-0 max-h-full m-auto"
        >
          {isOpen ? (
            <LocationMapPickerBody
              onClose={handleCancel}
              onChoose={onChoose}
              initialLatitude={initialLatitude}
              initialLongitude={initialLongitude}
            />
          ) : (
            <div
              className="hidden"
              aria-hidden
            />
          )}
        </div>
      </FocusTrap>
    </dialog>
  );
}
