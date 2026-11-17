'use client';

import { cloneElement, useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactElement, type Ref } from 'react';

function assignRef<T>(ref: Ref<T> | undefined, value: T | null) {
  if (typeof ref === 'function') {
    ref(value);
  } else if (ref != null) {
    ref.current = value;
  }
}

const mergedNodes = new WeakMap<object, HTMLElement | null>();

function rememberMergedNode(key: object, node: HTMLElement | null) {
  mergedNodes.set(key, node);
}

function readMergedNode(key: object) {
  return mergedNodes.get(key) ?? null;
}

export function ProbeJsxRefObject() {
  const triggerRef = useRef<HTMLElement | null>(null);
  return <span
    ref={triggerRef}
  />;
}

export function ProbeJsxCallback() {
  const triggerRef = useRef<HTMLElement | null>(null);
  return (
    <span
      ref={(node) => {
        triggerRef.current = node;
      }}
    />
  );
}

export function ProbeCloneCallback({ children }: { children: ReactElement<{ ref?: Ref<HTMLElement> }> }) {
  const triggerRef = useRef<HTMLElement | null>(null);
  const childRef = children.props.ref;
  const [slotKey] = useState(() => ({}));
  useLayoutEffect(() => {
    const node = readMergedNode(slotKey);
    triggerRef.current = node;
    assignRef(childRef, node);
    return () => {
      const latest = readMergedNode(slotKey);
      triggerRef.current = latest;
      assignRef(childRef, latest);
    };
  });
  return cloneElement(children, {
    ref: (node: HTMLElement | null) => {
      rememberMergedNode(slotKey, node);
    },
  });
}

export function ProbeCloneUseCallback({ children }: { children: ReactElement<{ ref?: Ref<HTMLElement> }> }) {
  const triggerRef = useRef<HTMLElement | null>(null);
  const childRef = children.props.ref;
  const [slotKey] = useState(() => ({}));
  const setNode = useCallback((node: HTMLElement | null) => {
    rememberMergedNode(slotKey, node);
  }, [slotKey]);
  useLayoutEffect(() => {
    const node = readMergedNode(slotKey);
    triggerRef.current = node;
    assignRef(childRef, node);
    return () => {
      const latest = readMergedNode(slotKey);
      triggerRef.current = latest;
      assignRef(childRef, latest);
    };
  });
  return cloneElement(children, { ref: setNode });
}

export function ProbeJsxHandler() {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleMouseEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => { }, 0);
  };
  return (
    <span
      onMouseEnter={handleMouseEnter}
    />
  );
}

export function ProbeEffectListener() {
  const anchorRef = useRef<HTMLSpanElement>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    const trigger = anchorRef.current?.firstElementChild;
    if (!(trigger instanceof Element)) return;
    const enter = () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => { }, 0);
    };
    trigger.addEventListener('mouseenter', enter);
    return () => trigger.removeEventListener('mouseenter', enter);
  });
  return (
    <span
      ref={anchorRef}
      className="contents"
    />
  );
}
