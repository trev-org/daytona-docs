import { useRef, useEffect } from 'react';
import { Icon } from '@mintlify/components';

interface AssistantTextAreaProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  isLoading: boolean;
  disabled: boolean;
  shouldFocus?: boolean;
  isMobile?: boolean;
}

export function AssistantTextArea({
  value,
  onChange,
  onSubmit,
  isLoading,
  disabled,
  shouldFocus,
  isMobile = false,
}: AssistantTextAreaProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (shouldFocus && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [shouldFocus]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!disabled) {
        onSubmit();
      }
    }
  };

  return (
    <div className="assistant-composer-inner">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Ask a question..."
        rows={2}
        className="assistant-textarea"
        style={
          {
            resize: 'none',
            fontSize: isMobile ? '16px' : undefined,
          } as React.CSSProperties
        }
      />
      <button
        type="button"
        onClick={onSubmit}
        disabled={disabled}
        className="assistant-send-button"
        aria-label="Send message"
      >
        {isLoading ? (
          <span className="assistant-spinner" />
        ) : (
          <Icon icon="arrow-up" color="currentColor" iconLibrary="lucide" size={16} />
        )}
      </button>
    </div>
  );
}
