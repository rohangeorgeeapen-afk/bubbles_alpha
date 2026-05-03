"use client";

import React from 'react';
import { cn } from '@/lib/utils/cn';

interface AsciiBoxProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  /** Title shown inside the top border, like `┌─[ title ]──────┐`. */
  title?: React.ReactNode;
  /** Optional content placed inside the top-right corner of the border (status, badges). */
  topRight?: React.ReactNode;
  /** Variant for emphasis. `default` uses border-default, `strong` uses border-strong, `accent` uses action-primary. */
  variant?: 'default' | 'strong' | 'accent';
  /** Use double-stroke box-drawing characters (╔═╗) instead of single (┌─┐). */
  double?: boolean;
  /** Class for the inner content wrapper (the part inside the border). */
  contentClassName?: string;
  children?: React.ReactNode;
}

const SINGLE = { tl: '┌', tr: '┐', bl: '└', br: '┘', h: '─', v: '│' };
const DOUBLE = { tl: '╔', tr: '╗', bl: '╚', br: '╝', h: '═', v: '║' };

const VARIANT_COLOR: Record<NonNullable<AsciiBoxProps['variant']>, string> = {
  default: 'text-border-default',
  strong: 'text-border-strong',
  accent: 'text-action-primary',
};

/**
 * AsciiBox — draws a strict ASCII box (┌─┐ │ │ └─┘) around its children
 * with an optional title/top-right slot embedded in the top border.
 *
 * The borders are decorative siblings positioned absolutely; the content
 * lives in a normal flow inset by 1 character / 1 line height so the
 * border characters never overlap content.
 */
export function AsciiBox({
  title,
  topRight,
  variant = 'default',
  double = false,
  className,
  contentClassName,
  children,
  ...rest
}: AsciiBoxProps) {
  const C = double ? DOUBLE : SINGLE;
  const borderColor = VARIANT_COLOR[variant];
  // Long enough to cover any plausible card width / height in monospace cells.
  const FILL = C.h.repeat(400);
  const VERT_FILL = Array.from({ length: 400 }, () => C.v).join('\n');

  return (
    <div
      className={cn('relative font-mono leading-[1.2]', className)}
      {...rest}
    >
      {/* Top border row.
          Decorative parts use pointer-events-none so they don't trap clicks,
          but the title and topRight slots themselves are interactive so
          embedded controls (e.g. [x] [□] window buttons) work. */}
      <div
        className={cn(
          'absolute top-0 left-0 right-0 h-[1lh] flex items-center select-none whitespace-pre overflow-hidden',
          borderColor
        )}
      >
        <span aria-hidden className="pointer-events-none">{C.tl}</span>
        <span className="overflow-hidden whitespace-nowrap flex-1 flex">
          {title ? (
            <span className="flex-shrink-0 text-text-secondary">
              {C.h}[ {title} ]
            </span>
          ) : null}
          <span aria-hidden className="overflow-hidden whitespace-nowrap flex-1 pointer-events-none">
            {FILL}
          </span>
          {topRight ? (
            <span className="flex-shrink-0 text-text-secondary bg-base">
              {C.h}[&nbsp;{topRight}&nbsp;]
            </span>
          ) : null}
        </span>
        <span aria-hidden className="pointer-events-none">{C.tr}</span>
      </div>

      {/* Bottom border row */}
      <div
        aria-hidden
        className={cn(
          'absolute bottom-0 left-0 right-0 h-[1lh] flex items-center pointer-events-none select-none whitespace-pre overflow-hidden',
          borderColor
        )}
      >
        <span>{C.bl}</span>
        <span className="overflow-hidden whitespace-nowrap flex-1">{FILL}</span>
        <span>{C.br}</span>
      </div>

      {/* Left vertical border */}
      <pre
        aria-hidden
        className={cn(
          'absolute top-[1lh] bottom-[1lh] left-0 m-0 overflow-hidden pointer-events-none select-none',
          borderColor
        )}
      >
        {VERT_FILL}
      </pre>

      {/* Right vertical border */}
      <pre
        aria-hidden
        className={cn(
          'absolute top-[1lh] bottom-[1lh] right-0 m-0 overflow-hidden pointer-events-none select-none',
          borderColor
        )}
      >
        {VERT_FILL}
      </pre>

      {/* Content — inset by 2 chars horizontally and 1 line vertically so
          children never collide with the border characters. */}
      <div className={cn('px-[2ch] py-[1lh] relative h-full', contentClassName)}>
        {children}
      </div>
    </div>
  );
}

export default AsciiBox;
