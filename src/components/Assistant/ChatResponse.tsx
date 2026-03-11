import * as React from 'react';
import { useState, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Icon } from '@mintlify/components';
import type { UIMessage } from '@ai-sdk/react';

interface ChatResponseProps extends React.HTMLAttributes<HTMLDivElement> {
  message: UIMessage;
  isLast?: boolean;
  hasError?: boolean;
}

const SOURCE_SITE_LABEL = (
  import.meta.env.PUBLIC_MINTLIFY_SUBDOMAIN || ''
).trim().toLowerCase();

const normalizePath = (path: string | undefined): string => {
  if (!path) return '/';

  let normalized = path.startsWith('/') ? path : `/${path}`;
  if (normalized.endsWith('index')) {
    normalized = normalized.replace('index', '');
  }
  return normalized;
};

const isLocalUrl = (url: string | undefined): boolean => {
  if (!url) return false;
  return (
    !url.startsWith('http://') &&
    !url.startsWith('https://') &&
    !url.startsWith('//')
  );
};

const getResultTitle = (result: any): string => {
  const title =
    typeof result?.metadata?.title === 'string' ? result.metadata.title.trim() : '';

  if (title) return title;

  const path = typeof result?.path === 'string' ? result.path.trim() : '';
  if (!path) return '';

  const normalizedPath = path.replace(/^\/+|\/+$/g, '');
  if (!normalizedPath) return '';

  const segments = normalizedPath.split('/');
  return segments[segments.length - 1] || normalizedPath;
};

const CopyButton = ({ content }: { content: string }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {}
  };

  return (
    <button
      className="assistant-copy-button"
      onClick={handleCopy}
      aria-label="Copy response"
    >
      {copied ? (
        <Icon icon="check" iconLibrary="lucide" color="currentColor" size={16} />
      ) : (
        <Icon icon="copy" iconLibrary="lucide" color="currentColor" size={16} />
      )}
    </button>
  );
};

const SearchingContainer = ({
  query,
  children,
}: {
  query: string;
  children?: React.ReactNode;
}) => {
  const [isSourcesOpen, setIsSourcesOpen] = useState(false);
  const hasResults = children != null;

  return (
    <div className="assistant-searching">
      <button
        className={`assistant-searching-toggle${hasResults ? '' : ' is-static'}`}
        onClick={() => {
          if (!hasResults) return;
          setIsSourcesOpen(!isSourcesOpen);
        }}
      >
        <span className="assistant-searching-label">
          {!isSourcesOpen && (
            <span>
              <Icon
                icon="search"
                iconLibrary="lucide"
                size={12}
                color="currentColor"
              />
            </span>
          )}
          {hasResults && (
            <span
              style={{
                transform: isSourcesOpen ? 'rotate(90deg)' : undefined,
                display: 'inline-flex',
              }}
            >
              <Icon
                icon="chevron-right"
                iconLibrary="lucide"
                color="currentColor"
                size={15}
              />
            </span>
          )}
          <span>
            {!hasResults ? `Searching for ${query}` : `Found results for ${query}`}
          </span>
        </span>
      </button>
      {isSourcesOpen && (
        <div className="assistant-searching-sources">{children}</div>
      )}
    </div>
  );
};

const hasVisibleParts = (parts: UIMessage['parts'] | undefined) =>
  parts?.some((part) => part.type === 'text' || part.type === 'tool-search') ??
  false;

const ChatSuggestions = ({ markdownLinks }: { markdownLinks: string }) => {
  const links = markdownLinks
    .split('\n')
    .map((line) => {
      const match = line.match(/\(([^)]*)\)\[([^\]]*)\]/);
      if (match && match[1] && match[2]) {
        return { label: match[1], path: match[2] };
      }
    })
    .filter((link) => link !== undefined);

  return (
    <div className="assistant-searching-sources">
      {links.map((link, idx) => {
        const href = isLocalUrl(link.path)
          ? normalizePath(link.path)
          : link.path;
        return (
          <a key={idx} href={href} className="assistant-suggestion-link">
            {link.label}
          </a>
        );
      })}
    </div>
  );
};

const MarkdownContent = ({ text }: { text: string }) => {
  return (
    <div className="assistant-markdown">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => <h1>{children}</h1>,
          h2: ({ children }) => <h2>{children}</h2>,
          h3: ({ children }) => <h3>{children}</h3>,
          h4: ({ children }) => <h4>{children}</h4>,
          h5: ({ children }) => <h5>{children}</h5>,
          h6: ({ children }) => <h6>{children}</h6>,
          a: ({ href, children, ...props }) => {
            const isLocal = isLocalUrl(href);
            const normalizedHref = isLocal ? normalizePath(href) : href;
            return (
              <a
                href={normalizedHref}
                className={isLocal ? undefined : 'assistant-external-link'}
                target={isLocal ? undefined : '_blank'}
                rel={isLocal ? undefined : 'noopener noreferrer'}
                {...props}
              >
                {children}
              </a>
            );
          },
          p: ({ node, children }) => {
            const parentNode = (node as { parent?: { tagName?: string } } | undefined)
              ?.parent;
            const parentTagName =
              parentNode && 'tagName' in parentNode ? parentNode.tagName : undefined;

            if (parentTagName === 'li') {
              return (
                <span className="assistant-markdown-inline-paragraph">
                  {children}
                </span>
              );
            }

            return <p>{children}</p>;
          },
          pre: ({ children, ...props }) => {
            if (
              typeof children === 'object' &&
              children !== null &&
              'props' in children &&
              typeof children.props === 'object' &&
              children.props !== null &&
              'className' in children.props &&
              children.props.className === 'language-suggestions'
            ) {
              return children;
            }

            return <pre {...props}>{children}</pre>;
          },
          code: ({ inline, children, ...props }: any) => {
            if (!inline && 'className' in props) {
              const match = /language-(\w+)/.exec(props.className || '');
              const language = match ? match[1] : undefined;
              if (language === 'suggestions' && typeof children === 'string') {
                return <ChatSuggestions markdownLinks={children} />;
              }
            }

            return inline ? <code {...props}>{children}</code> : <code {...props}>{children}</code>;
          },
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
};

const ChatMarkdown = ({ text }: { text: string }) => {
  if (!text.trim()) {
    return null;
  }

  return <MarkdownContent text={text} />;
};

export const ChatResponse = React.forwardRef<HTMLDivElement, ChatResponseProps>(
  ({ className, message, isLast, hasError, ...props }, ref) => {
    const showWrapper = useMemo(
      () => hasVisibleParts(message.parts),
      [message.parts],
    );

    const content = message.parts
      .filter((p) => p.type === 'text')
      .map((p) => ('text' in p ? p.text : ''))
      .join('');

    if (hasError) {
      return (
        <div
          ref={ref}
          className={['assistant-response-error', className].filter(Boolean).join(' ')}
          {...props}
        >
          <span>Sorry, we could not generate a response to your question.</span>
        </div>
      );
    }

    if (!showWrapper) {
      return null;
    }

    if (message.parts && message.parts.length > 0) {
      return (
        <div
          ref={ref}
          className={['assistant-response', className].filter(Boolean).join(' ')}
          {...props}
        >
          {message.parts.map((part, index) => {
            if (part.type === 'text') {
              return <ChatMarkdown key={`text-${index}`} text={part.text} />;
            } else if (
              part.type === 'tool-search' &&
              'state' in part &&
              (part.state === 'input-streaming' ||
                part.state === 'input-available')
            ) {
              const query =
                'input' in part &&
                part.input &&
                typeof part.input === 'object' &&
                'query' in part.input
                  ? String(part.input.query)
                  : 'your documentation';
              const toolCallId =
                'toolCallId' in part ? String(part.toolCallId) : `${index}`;
              return (
                <SearchingContainer key={`${toolCallId}-call`} query={query} />
              );
            } else if (
              part.type === 'tool-search' &&
              'state' in part &&
              part.state === 'output-available'
            ) {
              const query =
                'input' in part &&
                part.input &&
                typeof part.input === 'object' &&
                'query' in part.input
                  ? String(part.input.query)
                  : 'your documentation';
              const toolCallId =
                'toolCallId' in part ? String(part.toolCallId) : `${index}`;

              const results =
                'output' in part &&
                part.output &&
                typeof part.output === 'object' &&
                'results' in part.output &&
                Array.isArray(part.output.results)
                  ? part.output.results
                  : [];

              const displayResults = results
                .map((result: any) => {
                  const label = getResultTitle(result);
                  const href = normalizePath(result.path);

                  return {
                    label,
                    href,
                    dedupeKey: `${label.toLowerCase()}::${href}`,
                  };
                })
                .filter((result) => {
                  if (!result.label) return false;
                  return result.label.trim().toLowerCase() !== SOURCE_SITE_LABEL;
                })
                .filter((result, index, array) => {
                  return (
                    array.findIndex(
                      (candidate) => candidate.dedupeKey === result.dedupeKey,
                    ) === index
                  );
                });

              return (
                <div
                  key={`${toolCallId}-result`}
                  style={{
                    display: displayResults.length === 0 ? 'none' : undefined,
                  }}
                >
                  <SearchingContainer query={query}>
                    <div className="assistant-searching-sources">
                      {displayResults.map((result, idx: number) => (
                        <a
                          key={idx}
                          href={result.href}
                          className="assistant-source-link"
                        >
                          {result.label}
                        </a>
                      ))}
                    </div>
                  </SearchingContainer>
                </div>
              );
            }
            return null;
          })}
          {content && (
            <div className="assistant-response-footer">
              <CopyButton content={content} />
            </div>
          )}
        </div>
      );
    }

    return (
      <div
        ref={ref}
        className={['assistant-response', className].filter(Boolean).join(' ')}
        {...props}
      >
        <ChatMarkdown text={content} />
        {content && (
          <div className="assistant-response-footer">
            <CopyButton content={content} />
          </div>
        )}
      </div>
    );
  },
);

ChatResponse.displayName = 'ChatResponse';
