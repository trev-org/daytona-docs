import * as React from 'react';
import type { UIMessage } from '@ai-sdk/react';

interface ChatMessageProps extends React.HTMLAttributes<HTMLDivElement> {
  message: UIMessage;
}

export const ChatMessage = React.forwardRef<HTMLDivElement, ChatMessageProps>(
  ({ className, message, ...props }, ref) => {
    const content = message.parts
      .filter((p) => p.type === 'text')
      .map((p) => ('text' in p ? p.text : ''))
      .join('');

    return (
      <div className="assistant-user-row">
        <div
          ref={ref}
          className={['assistant-user-bubble', className].filter(Boolean).join(' ')}
          {...props}
        >
          {content}
        </div>
      </div>
    );
  },
);
ChatMessage.displayName = 'ChatMessage';
