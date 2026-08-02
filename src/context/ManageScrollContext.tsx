'use client';

import { createContext, useContext, type RefObject } from 'react';

export const ManageScrollContext = createContext<RefObject<HTMLDivElement | null> | null>(null);

export function useManageScrollContainer() {
  return useContext(ManageScrollContext);
}
