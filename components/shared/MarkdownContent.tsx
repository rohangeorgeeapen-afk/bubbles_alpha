"use client";

import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';

interface MarkdownContentProps {
  content: string;
  className?: string;
}

export default function MarkdownContent({ content, className = '' }: MarkdownContentProps) {
  return (
    <div className={`markdown-content ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw]}
        components={{
          p: ({ children }) => <p className="mb-4 last:mb-0 leading-[1.7]">{children}</p>,
          h1: ({ children }) => <h1 className="text-[19px] font-semibold mb-4 mt-5 text-[#ececec] leading-[1.4]">{children}</h1>,
          h2: ({ children }) => <h2 className="text-[17px] font-semibold mb-3 mt-4 text-[#ececec] leading-[1.4]">{children}</h2>,
          h3: ({ children }) => <h3 className="text-[16px] font-semibold mb-3 mt-3 text-[#ececec] leading-[1.4]">{children}</h3>,
          ul: ({ children }) => <ul className="list-disc ml-5 mb-4 space-y-2">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal ml-5 mb-4 space-y-2">{children}</ol>,
          li: ({ children }) => <li className="leading-[1.7]">{children}</li>,
          code: ({ inline, children, ...props }: any) =>
            inline ? (
              <code className="bg-[#0d0d0d] px-1.5 py-0.5 rounded text-[13px] font-mono text-[#ececec]" {...props}>
                {children}
              </code>
            ) : (
              <code className="block bg-[#0d0d0d] text-[#ececec] p-3 rounded-lg text-[13px] font-mono overflow-x-auto mb-3 leading-relaxed border border-[#4d4d4d]" {...props}>
                {children}
              </code>
            ),
          pre: ({ children }) => <pre className="mb-3 overflow-hidden rounded-lg">{children}</pre>,
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-[#4d4d4d] pl-4 py-1 mb-3 text-[#b4b4b4] italic">
              {children}
            </blockquote>
          ),
          a: ({ children, href }) => (
            <a href={href} className="text-[#ececec] underline hover:text-[#b4b4b4]" target="_blank" rel="noopener noreferrer">
              {children}
            </a>
          ),
          strong: ({ children }) => <strong className="font-semibold text-[#ececec]">{children}</strong>,
          em: ({ children }) => <em className="italic">{children}</em>,
          hr: () => <hr className="border-[#4d4d4d] my-3" />,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
