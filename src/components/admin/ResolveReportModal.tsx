'use client';

import { useState } from 'react';
import Button from '@/components/shared/Button';
import Textarea from '@/components/shared/Textarea';

export const RESOLUTION_OPTIONS = [
  'Content removed',
  'Content edited/modified',
  'User warned',
  'User suspended/banned',
  'Report invalid/false',
  'Other',
] as const;

export type ResolutionOption = typeof RESOLUTION_OPTIONS[number];

type ResolveReportModalProps = {
  reportId?: string;
  reportCount?: number;
  onResolve: (resolutionType: ResolutionOption, message?: string) => Promise<void>;
  onCancel: () => void;
  isSubmitting?: boolean;
  actionType?: 'resolve' | 'dismiss';
};

export default function ResolveReportModal({
  reportId,
  reportCount,
  onResolve,
  onCancel,
  isSubmitting = false,
  actionType = 'resolve',
}: ResolveReportModalProps) {
  const [selectedResolution, setSelectedResolution] = useState<ResolutionOption | ''>('');
  const [customMessage, setCustomMessage] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!selectedResolution) {
      setError('Please select a resolution type');
      return;
    }

    if (selectedResolution === 'Other' && !customMessage.trim()) {
      setError('Please provide details when selecting "Other"');
      return;
    }

    setError(null);
    await onResolve(selectedResolution, customMessage.trim() || undefined);
  };

  const isBulk = reportCount !== undefined && reportCount > 1;

  return (
    <div
      className="space-y-4"
    >
      <p
        className="text-sm text-foreground/70"
      >
        {isBulk
          ? actionType === 'resolve'
            ? `How were these ${reportCount} reports resolved? Select the appropriate action taken.`
            : `Why are you dismissing these ${reportCount} reports? Select the appropriate reason.`
          : actionType === 'resolve'
            ? 'How was this report resolved? Select the appropriate action taken.'
            : 'Why are you dismissing this report? Select the appropriate reason.'}
      </p>

      {error && (
        <div
          className="p-3 rounded bg-red-500/10 border border-red-500/20"
        >
          <p
            className="text-sm text-red-600"
          >
            {error}
          </p>
        </div>
      )}

      {/* Resolution options */}
      <div>
        <p
          className="block text-sm font-medium mb-2"
        >
          Resolution type *
        </p>
        <div
          className="space-y-2"
        >
          {RESOLUTION_OPTIONS.map((option) => (
            <label
              key={option}
              className="flex items-center gap-3 cursor-pointer group"
            >
              <input
                type="radio"
                name="resolution-type"
                value={option}
                checked={selectedResolution === option}
                onChange={(e) => setSelectedResolution(e.target.value as ResolutionOption)}
                className="size-4 accent-primary cursor-pointer"
                disabled={isSubmitting}
              />
              <span
                className="text-sm text-foreground/80 group-hover:text-foreground"
              >
                {option}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Optional message */}
      <div>
        <label
          className="block text-sm font-medium mb-1.5"
        >
          Additional message
          {' '}
          <span
            className="text-foreground/60 text-xs"
          >
            (optional - will be sent to reporter)
          </span>
        </label>
        <Textarea
          value={customMessage}
          onChange={(e) => setCustomMessage(e.target.value)}
          placeholder="Provide any additional context or details about the resolution..."
          rows={4}
          disabled={isSubmitting}
          maxLength={500}
        />
      </div>

      {/* Footer buttons */}
      <div
        className="flex justify-end gap-2 pt-2"
      >
        <Button
          variant="secondary"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={isSubmitting || !selectedResolution}
          loading={isSubmitting}
        >
          {isBulk
            ? actionType === 'resolve'
              ? `Resolve ${reportCount} reports`
              : `Dismiss ${reportCount} reports`
            : actionType === 'resolve'
              ? 'Resolve report'
              : 'Dismiss report'}
        </Button>
      </div>
    </div>
  );
}
