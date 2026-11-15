import type { ReactNode } from 'react';

export type UiStoryFrame = {
  title: string;
  render: () => ReactNode;
};

export type UiGroupSummary = {
  id: string;
  label: string;
  total: number;
  live: number;
  catalog: number;
};
