"use client";

import React, { useEffect, useState } from 'react';
import { AsciiBox } from '@/components/ui/ascii-box';

interface LandingPageProps {
  onGetStarted: () => void;
}

export default function LandingPage({ onGetStarted }: LandingPageProps) {
  const [time, setTime] = useState<string>('');

  useEffect(() => {
    const update = () => {
      const d = new Date();
      setTime(d.toTimeString().slice(0, 8));
    };
    update();
    const t = setInterval(update, 1000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="theme-terminal font-mono min-h-screen bg-base text-text-secondary overflow-y-auto">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12 flex flex-col gap-[1lh] text-[13px] sm:text-[14px]">
        <PromptLine />

        <AsciiBox
          title="bubbles · conversational exploration shell · v0.1.0-beta"
          variant="strong"
          contentClassName="px-[2ch] py-[1lh] flex flex-col gap-[1lh]"
        >
          <div className="flex flex-col items-center gap-[0.5lh] py-[0.5lh]">
            <pre className="text-action-primary leading-[1.1] whitespace-pre text-[12px] sm:text-[14px]">{ASCII_LOGO}</pre>
            <pre className="text-action-primary leading-tight overflow-x-auto whitespace-pre text-[10px] sm:text-[12px]">{ASCII_BANNER}</pre>
          </div>
          <div className="text-text-secondary">
            <div>a tree-shaped chat surface.</div>
            <div>ask one thing, branch into ten, never lose your place.</div>
          </div>
          <div className="flex flex-col gap-[0.5lh]">
            <span className="text-text-tertiary text-[12px]">→ click below to begin</span>
            <PrimaryCTA onClick={onGetStarted}>START EXPLORING</PrimaryCTA>
          </div>
          <div className="flex flex-wrap items-center gap-x-[2ch] gap-y-[0.5lh] text-[12px]">
            <TerminalLink href="#how">[ how it works ]</TerminalLink>
            <TerminalLink href="/privacy">[ privacy ]</TerminalLink>
          </div>
        </AsciiBox>

        <section id="how">
          <AsciiBox title="$ man bubbles" contentClassName="px-[2ch] py-[1lh] flex flex-col gap-[0.5lh]">
            <Step n={1} title="ask">start with any question or topic you&apos;re curious about</Step>
            <Step n={2} title="branch">when something sparks, fork a new thread from the response</Step>
            <Step n={3} title="navigate">switch between branches, fullscreen any node to focus</Step>
          </AsciiBox>
        </section>

        <AsciiBox title="ready?" variant="accent" contentClassName="px-[2ch] py-[1lh] flex flex-col gap-[0.75lh]">
          <div className="text-text-tertiary">
            <span className="text-action-primary">$&nbsp;</span>bubbles
          </div>
          <div className="text-text-tertiary text-[12px]">→ click to launch</div>
          <div className="flex flex-wrap items-center gap-[2ch]">
            <SecondaryCTA onClick={onGetStarted}>OPEN BUBBLES</SecondaryCTA>
            <span className="text-text-tertiary text-[12px]">free · no card</span>
          </div>
        </AsciiBox>

        <footer className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-[0.5lh] text-text-tertiary pt-[1lh]">
          <span>© 2025 bubbles · {time}</span>
          <span className="flex items-center gap-[2ch]">
            <a href="/privacy" className="hover:text-text-secondary">privacy</a>
            <a href="mailto:rohan@chynex.com" className="hover:text-text-secondary">contact</a>
          </span>
        </footer>
      </div>
    </div>
  );
}

function PromptLine() {
  return (
    <div className="text-text-tertiary flex items-center gap-[1ch] flex-wrap">
      <span className="text-action-primary">guest@bubbles</span>
      <span>:</span>
      <span>~/exploration</span>
      <span>$</span>
      <span className="text-text-secondary">./bubbles --landing</span>
      <span className="text-action-primary animate-pulse">█</span>
    </div>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-baseline gap-x-[2ch] gap-y-[0.25lh]">
      <span className="text-text-tertiary flex-shrink-0">{String(n).padStart(2, '0')}</span>
      <span className="text-text-primary flex-shrink-0">{title}</span>
      <span className="text-text-tertiary">— {children}</span>
    </div>
  );
}

function TerminalButton({
  onClick,
  accent,
  children,
}: {
  onClick: () => void;
  accent?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={
        accent
          ? 'text-action-primary hover:text-action-primary-hover transition-colors'
          : 'text-text-secondary hover:text-text-primary transition-colors'
      }
    >
      {children}
    </button>
  );
}

/**
 * PrimaryCTA — boxed double-stroke ASCII frame around an inverted accent
 * block. Designed to read as "click me" even to non-technical visitors.
 */
function PrimaryCTA({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <div className="inline-block w-fit">
      <AsciiBox variant="accent" double className="text-[13px]">
        <button
          onClick={onClick}
          className="group inline-flex items-center gap-[1ch] bg-action-primary text-action-primary-text px-[3ch] py-[0.5lh] hover:bg-action-primary-hover transition-all font-bold tracking-wider text-[14px] active:scale-[0.98] hover:shadow-[0_0_24px_hsl(var(--action-primary)/0.45)]"
        >
          <span className="text-[16px]">▶</span>
          <span>{children}</span>
        </button>
      </AsciiBox>
    </div>
  );
}

/** SecondaryCTA — boxed double-stroke ASCII frame, no inverted fill. */
function SecondaryCTA({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <div className="inline-block w-fit">
      <AsciiBox variant="accent" double className="text-[13px]">
        <button
          onClick={onClick}
          className="group text-action-primary hover:text-action-primary-hover transition-colors font-bold tracking-wider text-[14px] px-[2ch] py-[0.25lh] inline-flex items-center gap-[1ch]"
        >
          <span>▶</span>
          <span>{children}</span>
        </button>
      </AsciiBox>
    </div>
  );
}

function TerminalLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a href={href} className="text-text-tertiary hover:text-text-secondary transition-colors">
      {children}
    </a>
  );
}

// 7-circle hex logo: 1 center + 6 around, all connected to center.
// Diagonals (\, /) link the four corner circles; dashes (-----) link L↔C↔R.
const ASCII_LOGO = String.raw`      ___       ___
     (   )     (   )
      ---       ---
         \     /
 ___       ___       ___
(   )-----(   )-----(   )
 ---       ---       ---
         /     \
      ___       ___
     (   )     (   )
      ---       ---      `;

const ASCII_BANNER = String.raw` _           _     _     _
| |__  _   _| |__ | |__ | | ___  ___
| '_ \| | | | '_ \| '_ \| |/ _ \/ __|
| |_) | |_| | |_) | |_) | |  __/\__ \
|_.__/ \__,_|_.__/|_.__/|_|\___||___/`;
