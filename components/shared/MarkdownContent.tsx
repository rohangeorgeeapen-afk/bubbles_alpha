"use client";

import React, { memo, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeRaw from 'rehype-raw';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

interface HighlightRange {
  text: string;
  startOffset: number;
  id: string;
}

interface MarkdownContentProps {
  content: string;
  className?: string;
  highlights?: HighlightRange[];
  onHighlightClick?: (id: string) => void;
}

// Memoized to prevent re-renders that would clear browser text selection
const MarkdownContent = memo(function MarkdownContent({ 
  content, 
  className = '',
  highlights = [],
  onHighlightClick,
}: MarkdownContentProps) {
  
  // Pre-process content to insert highlight markers
  const processedContent = useMemo(() => {
    console.log('🟢 MarkdownContent highlights:', { highlightsCount: highlights?.length, highlights });
    
    if (!highlights || highlights.length === 0) {
      return content;
    }

    let result = content;
    
    // Helper to find text in markdown, accounting for formatting characters
    const findTextInMarkdown = (markdown: string, searchText: string): { start: number; end: number } | null => {
      // First try exact match
      const exactIdx = markdown.indexOf(searchText);
      if (exactIdx !== -1) {
        return { start: exactIdx, end: exactIdx + searchText.length };
      }
      
      // Build a regex pattern that allows markdown formatting between words
      // This handles cases like "word *formatted* word" matching "word formatted word"
      const words = searchText.split(/\s+/);
      if (words.length === 0) return null;
      
      // Create pattern: each word can be surrounded by markdown formatting
      const markdownChars = '[*_~`]*';
      const pattern = words
        .map(word => markdownChars + word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + markdownChars)
        .join('\\s*');
      
      const regex = new RegExp(pattern, 'i');
      const match = markdown.match(regex);
      
      if (match && match.index !== undefined) {
        return { start: match.index, end: match.index + match[0].length };
      }
      
      return null;
    };
    
    // Sort highlights by position descending so we can insert from end to start
    const highlightsWithPositions = highlights
      .map(h => ({ ...h, pos: findTextInMarkdown(result, h.text) }))
      .filter(h => h.pos !== null)
      .sort((a, b) => (b.pos?.start || 0) - (a.pos?.start || 0));

    for (const highlight of highlightsWithPositions) {
      if (!highlight.pos) continue;
      
      const { start, end } = highlight.pos;
      const matchedText = result.slice(start, end);
      
      // Wrap with mark element (supported by rehype-raw)
      const before = result.slice(0, start);
      const after = result.slice(end);
      result = `${before}<mark class="explored-highlight" data-id="${highlight.id}">${matchedText}</mark>${after}`;
    }

    return result;
  }, [content, highlights]);

  return (
    <div className={`markdown-content ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeRaw, rehypeKatex]}
        components={{
          // Custom mark element for highlights
          mark: ({ node, children, ...props }: any) => {
            const id = props['data-id'];
            const isExploredHighlight = props.className === 'explored-highlight';
            
            if (isExploredHighlight && id) {
              return (
                <mark
                  onClick={(e) => {
                    e.stopPropagation();
                    onHighlightClick?.(id);
                  }}
                  className="bg-purple-500/50 hover:bg-purple-500/60 text-white rounded-sm cursor-pointer transition-colors px-0.5"
                  style={{ backgroundColor: 'rgba(168, 85, 247, 0.5)', color: 'white' }}
                >
                  {children}
                </mark>
              );
            }
            // Regular mark element
            return <mark {...props}>{children}</mark>;
          },
          p: ({ children }) => <p className="mb-4 last:mb-0 leading-relaxed text-inherit">{children}</p>,
          h1: ({ children }) => <h1 className="text-lg font-semibold mb-4 mt-5 text-text-primary leading-snug">{children}</h1>,
          h2: ({ children }) => <h2 className="text-base font-semibold mb-3 mt-4 text-text-primary leading-snug">{children}</h2>,
          h3: ({ children }) => <h3 className="text-[15px] font-semibold mb-3 mt-3 text-text-primary leading-snug">{children}</h3>,
          ul: ({ children }) => <ul className="list-disc ml-5 mb-4 space-y-1.5">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal ml-5 mb-4 space-y-1.5">{children}</ol>,
          li: ({ children }) => <li className="leading-relaxed">{children}</li>,
          code: ({ inline, children, ...props }: any) =>
            inline ? (
              <code className="bg-void px-1.5 py-0.5 rounded text-[13px] font-mono text-info" {...props}>
                {children}
              </code>
            ) : (
              <code className="block bg-void text-text-secondary p-3 rounded-md text-[13px] font-mono overflow-x-auto mb-3 leading-relaxed border border-border-subtle" {...props}>
                {children}
              </code>
            ),
          pre: ({ children }) => <pre className="mb-3 overflow-hidden rounded-md">{children}</pre>,
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-info pl-4 py-1 mb-3 text-text-tertiary italic">
              {children}
            </blockquote>
          ),
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
        {processedContent}
      </ReactMarkdown>
    </div>
  );
});

export default MarkdownContent;
