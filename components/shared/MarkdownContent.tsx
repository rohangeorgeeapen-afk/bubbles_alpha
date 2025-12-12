"use client";

import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeRaw from 'rehype-raw';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

interface MarkdownContentProps {
  content: string;
  className?: string;
}

export default function MarkdownContent({ content, className = '' }: MarkdownContentProps) {
  return (
    <div className={`markdown-content ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeRaw, rehypeKatex]}
        components={{
          p: ({ children }) => <p className="mb-4 last:mb-0 leading-relaxed text-inherit">{children}</p>,
          h1: ({ children }) => <h1 className="text-lg font-semibold mb-4 mt-5 text-text-primary leading-snug">{children}</h1>,
          h2: ({ children }) => <h2 className="text-base font-semibold mb-3 mt-4 text-text-primary leading-snug">{children}</h2>,
          h3: ({ children }) => <h3 className="text-[15px] font-semibold mb-3 mt-3 text-text-primary leading-snug">{children}</h3>,
          ul: ({ children }) => <ul className="list-disc ml-5 mb-4 space-y-1.5">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal ml-5 mb-4 space-y-1.5">{children}</ol>,
          li: ({ children }) => <li className="leading-relaxed">{children}</li>,
          code: ({ inline, children, ...props }: any) =>
            inline ? (
              // Inline code - uses info color for distinction
              <code className="bg-void px-1.5 py-0.5 rounded text-[13px] font-mono text-info" {...props}>
                {children}
              </code>
            ) : (
              // Code blocks - void bg for maximum contrast
              <code className="block bg-void text-text-secondary p-3 rounded-md text-[13px] font-mono overflow-x-auto mb-3 leading-relaxed border border-border-subtle" {...props}>
                {children}
              </code>
            ),
          pre: ({ children }) => <pre className="mb-3 overflow-hidden rounded-md">{children}</pre>,
          // Blockquotes use info color for the border - informational content
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-info pl-4 py-1 mb-3 text-text-tertiary italic">
              {children}
            </blockquote>
          ),
          // Links use action-primary - they're interactive
          a: ({ children, href }) => (
            <a href={href} className="text-action-primary hover:text-action-primary-hover underline underline-offset-2" target="_blank" rel="noopener noreferrer">
              {children}
            </a>
          ),
          strong: ({ children }) => <strong className="font-semibold text-text-primary">{children}</strong>,
          em: ({ children }) => <em className="italic">{children}</em>,
          hr: () => <hr className="border-border-subtle my-4" />,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
