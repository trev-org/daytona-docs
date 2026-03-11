import { useMemo } from 'react';
import type { UIMessage } from '@ai-sdk/react';
import { ChatItem } from './ChatItem';

interface AssistantHistoryListProps {
  messages: UIMessage[];
  status: 'ready' | 'streaming' | 'submitted' | 'error';
  errorMessage?: string | null;
}

const hasVisibleParts = (parts: UIMessage['parts'] | undefined) =>
  parts?.some((part) => part.type === 'text' || part.type === 'tool-search') ??
  false;

function LoadingIndicator() {
  return (
    <div className="assistant-loading">
      <span className="assistant-loading-dot" />
      <span className="assistant-loading-dot delay-1" />
      <span className="assistant-loading-dot delay-2" />
    </div>
  );
}

export function AssistantHistoryList({
  messages,
  status,
  errorMessage,
}: AssistantHistoryListProps) {
  const isLoading = useMemo(() => {
    if (status === 'submitted') return true;
    if (status !== 'streaming') return false;

    const lastMessage = messages[messages.length - 1];
    if (!lastMessage) return false;
    if (lastMessage.role === 'user') return true;

    const lastPart = lastMessage.parts[lastMessage.parts.length - 1];
    return lastPart?.type !== 'text' || !lastPart.text;
  }, [status, messages]);

  const visibleMessages = messages.filter(
    (msg) =>
      msg.role !== 'system' &&
      (msg.role !== 'assistant' || hasVisibleParts(msg.parts)),
  );

  return (
    <div className="assistant-history">
      {visibleMessages.map((msg, index) => (
        <ChatItem
          key={msg.id}
          message={msg}
          isLast={index === visibleMessages.length - 1}
        />
      ))}
      {errorMessage && (
        <div className="assistant-response-error">
          <span>{errorMessage}</span>
        </div>
      )}
      {isLoading && <LoadingIndicator />}
    </div>
  );
}
