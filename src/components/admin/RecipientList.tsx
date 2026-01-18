'use client';

import Checkbox from '@/components/shared/Checkbox';
import CheckSVG from 'public/icons/check.svg';
import CloseSVG from 'public/icons/close.svg';
import { useMemo } from 'react';

export type Recipient = {
  email: string;
  name: string;
  nickname: string | null;
  selected: boolean;
  sendStatus?: 'success' | 'error' | null;
  errorMessage?: string | null;
  // Allow additional properties for extensibility
  [key: string]: string | number | boolean | null | undefined;
};

type RecipientListProps = {
  recipients: Recipient[];
  onRecipientsChange: (recipients: Recipient[]) => void;
  showTypeColumn?: boolean;
  getTypeLabel?: (recipient: Recipient) => string;
  emptyMessage?: string;
  maxHeight?: 'sm' | 'md' | 'lg'; // sm: max-h-64, md: max-h-96, lg: max-h-[32rem]
};

export default function RecipientList({
  recipients,
  onRecipientsChange,
  showTypeColumn = false,
  getTypeLabel,
  emptyMessage = 'No recipients found',
  maxHeight = 'md',
}: RecipientListProps) {
  const selectedCount = useMemo(
    () => recipients.filter(r => r.selected).length,
    [recipients],
  );

  const allSelected = recipients.length > 0 && recipients.every(r => r.selected);

  const handleSelectAll = (checked: boolean) => {
    onRecipientsChange(recipients.map(r => ({ ...r, selected: checked })));
  };

  const handleToggleRecipient = (email: string, checked: boolean) => {
    onRecipientsChange(
      recipients.map(r => (r.email === email ? { ...r, selected: checked } : r)),
    );
  };

  if (recipients.length === 0) {
    return (
      <div
        className="rounded-lg border border-border-color bg-background-light p-4 text-center text-sm text-foreground/70"
      >
        {emptyMessage}
      </div>
    );
  }

  return (
    <div>
      <h3
        className="mb-3 text-sm font-semibold"
      >
        Recipients (
        {selectedCount}
        {' '}
        of
        {' '}
        {recipients.length}
        {' '}
        selected)
      </h3>

      <div
        className={`overflow-hidden rounded-lg border border-border-color bg-background-light ${
          maxHeight === 'sm' ? 'max-h-64' : maxHeight === 'lg' ? 'max-h-[32rem]' : 'max-h-96'
        }`}
      >
        <div
          className={`overflow-y-auto ${
            maxHeight === 'sm' ? 'max-h-64' : maxHeight === 'lg' ? 'max-h-[32rem]' : 'max-h-96'
          }`}
        >
          <table
            className="w-full"
          >
            <thead
              className="sticky top-0 bg-background-light border-b border-border-color z-10"
            >
              <tr>
                <th
                  className="px-4 py-2 text-left text-xs font-semibold text-foreground/70"
                >
                  <Checkbox
                    id="select-all"
                    checked={allSelected}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                  />
                </th>
                <th
                  className="px-4 py-2 text-left text-xs font-semibold text-foreground/70"
                >
                  Status
                </th>
                {showTypeColumn && (
                  <th
                    className="px-4 py-2 text-left text-xs font-semibold text-foreground/70"
                  >
                    Type
                  </th>
                )}
                <th
                  className="px-4 py-2 text-left text-xs font-semibold text-foreground/70"
                >
                  Name
                </th>
                <th
                  className="px-4 py-2 text-left text-xs font-semibold text-foreground/70"
                >
                  Username
                </th>
                <th
                  className="px-4 py-2 text-left text-xs font-semibold text-foreground/70"
                >
                  Email
                </th>
              </tr>
            </thead>
            <tbody
              className="divide-y divide-border-color"
            >
              {recipients.map((recipient, idx) => (
                <tr
                  key={`${recipient.email}-${idx}`}
                  className="hover:bg-background"
                >
                  <td
                    className="px-4 py-2"
                  >
                    <Checkbox
                      id={`select-${idx}`}
                      checked={recipient.selected}
                      onChange={(e) => handleToggleRecipient(recipient.email, e.target.checked)}
                    />
                  </td>
                  <td
                    className="px-4 py-2"
                  >
                    {recipient.sendStatus === 'success' && (
                      <CheckSVG
                        className="size-4 fill-green-600"
                      />
                    )}
                    {recipient.sendStatus === 'error' && (
                      <CloseSVG
                        className="size-4 fill-red-600"
                      />
                    )}
                    {!recipient.sendStatus && (
                      <span
                        className="text-xs text-foreground/40"
                      >
                        -
                      </span>
                    )}
                  </td>
                  {showTypeColumn && getTypeLabel && (
                    <td
                      className="px-4 py-2 text-xs text-foreground/60"
                    >
                      {getTypeLabel(recipient)}
                    </td>
                  )}
                  <td
                    className="px-4 py-2 text-sm text-foreground/80"
                  >
                    {recipient.name}
                  </td>
                  <td
                    className="px-4 py-2 text-sm text-foreground/60"
                  >
                    {recipient.nickname ? `@${recipient.nickname}` : '-'}
                  </td>
                  <td
                    className="px-4 py-2 text-sm text-foreground/80"
                  >
                    {recipient.email}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
