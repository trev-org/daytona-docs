import { useRef, useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { cn, Icon } from '@mintlify/components';
import { useAssistant } from '../../hooks/useAssistant';
import { useSwipeToDismiss } from '../../hooks/useSwipeToDismiss';
import { AssistantEmptyState } from './AssistantEmptyState';
import { AssistantHistoryList } from './AssistantHistoryList';
import { AssistantTextArea } from './AssistantTextArea';
import { ASSISTANT_EVENTS } from './events';
import '../../styles/components/assistant.scss';

const CHAT_SHEET_MIN_WIDTH = 368;
const CHAT_SHEET_MAX_WIDTH = 576;

export function AssistantSheet() {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return null;
  }

  return <AssistantSheetClient />;
}

function AssistantSheetClient() {
  const messagesRef = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const topBoundaryRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(CHAT_SHEET_MIN_WIDTH);
  const [isOpen, setIsOpen] = useState(false);
  const [shouldFocus, setShouldFocus] = useState(false);
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth < 1024 : false,
  );

  const {
    input,
    setInput,
    messages,
    status,
    handleSubmit,
    isLoading,
    onClear,
    errorMessage,
  } = useAssistant();

  const handleClose = useCallback(() => {
    setIsOpen(false);
  }, []);

  const { dragY, isDragging } = useSwipeToDismiss({
    enabled: isMobile && isOpen,
    sheetRef,
    scrollRef: messagesRef,
    topBoundaryRef,
    onDismiss: handleClose,
  });

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1024);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    const handleToggle = () => {
      setIsOpen((prev) => {
        const isOpening = !prev;
        setShouldFocus(isOpening && !isMobile);
        return isOpening;
      });
    };

    const handleOpen = () => {
      setIsOpen(true);
      setShouldFocus(!isMobile);
    };

    window.addEventListener(ASSISTANT_EVENTS.TOGGLE, handleToggle);
    window.addEventListener(ASSISTANT_EVENTS.OPEN, handleOpen);
    window.addEventListener(ASSISTANT_EVENTS.CLOSE, handleClose);

    return () => {
      window.removeEventListener(ASSISTANT_EVENTS.TOGGLE, handleToggle);
      window.removeEventListener(ASSISTANT_EVENTS.OPEN, handleOpen);
      window.removeEventListener(ASSISTANT_EVENTS.CLOSE, handleClose);
    };
  }, [handleClose, isMobile]);

  useEffect(() => {
    if (isMobile && isOpen) {
      const scrollY = window.scrollY;

      const originalOverflow = document.body.style.overflow;
      const originalPosition = document.body.style.position;
      const originalTop = document.body.style.top;
      const originalWidth = document.body.style.width;

      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
      document.body.style.height = '100%';

      return () => {
        document.body.style.overflow = originalOverflow;
        document.body.style.position = originalPosition;
        document.body.style.top = originalTop;
        document.body.style.width = originalWidth;
        document.body.style.height = '';
        window.scrollTo(0, scrollY);
      };
    }
  }, [isMobile, isOpen]);

  useEffect(() => {
    const { body } = document;

    if (!isMobile && isOpen) {
      body.dataset.assistantOpen = 'true';
      body.style.setProperty('--assistant-layout-offset', `${width}px`);
    } else {
      delete body.dataset.assistantOpen;
      body.style.removeProperty('--assistant-layout-offset');
    }

    return () => {
      delete body.dataset.assistantOpen;
      body.style.removeProperty('--assistant-layout-offset');
    };
  }, [isMobile, isOpen, width]);

  useEffect(() => {
    const { body } = document;

    if (isMobile || !isOpen) {
      delete body.dataset.assistantCompactNav;
      return;
    }

    let frameId = 0;

    const updateCompactNav = () => {
      const desktopNav = document.querySelector('.navbar .desktop-only');

      if (!(desktopNav instanceof HTMLElement)) {
        delete body.dataset.assistantCompactNav;
        return;
      }

      const shouldUseCompactNav = desktopNav.scrollWidth > desktopNav.clientWidth + 1;

      if (shouldUseCompactNav) {
        body.dataset.assistantCompactNav = 'true';
      } else {
        delete body.dataset.assistantCompactNav;
      }
    };

    const scheduleUpdate = () => {
      cancelAnimationFrame(frameId);
      frameId = requestAnimationFrame(updateCompactNav);
    };

    scheduleUpdate();
    window.addEventListener('resize', scheduleUpdate);

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener('resize', scheduleUpdate);
      delete body.dataset.assistantCompactNav;
    };
  }, [isMobile, isOpen, width]);

  const handleSubmitAndFocus = () => {
    handleSubmit();
    setShouldFocus(!isMobile);
  };

  const isMaximized = width >= CHAT_SHEET_MAX_WIDTH;

  const toggleMaximize = useCallback(() => {
    setWidth(isMaximized ? CHAT_SHEET_MIN_WIDTH : CHAT_SHEET_MAX_WIDTH);
  }, [isMaximized]);

  const rootClassName = cn('assistant-root', isMobile ? 'is-mobile' : '');

  const sheetContent = (
    <div
      suppressHydrationWarning
      className={cn(rootClassName, !isOpen && 'is-hidden')}
      style={{
        width: isMobile ? undefined : isOpen ? `${width}px` : 0,
        minWidth: isMobile || !isOpen ? undefined : `${CHAT_SHEET_MIN_WIDTH}px`,
        maxWidth: isMobile || !isOpen ? undefined : `${CHAT_SHEET_MAX_WIDTH}px`,
        pointerEvents: !isOpen ? 'none' : undefined,
        overflow: !isOpen ? 'hidden' : undefined,
        visibility: !isOpen ? 'hidden' : undefined,
      }}
    >
      {isMobile && (
        <div
          className={cn('assistant-backdrop', isOpen && 'is-open')}
          onClick={handleClose}
        />
      )}

      <div
        ref={sheetRef}
        className={cn(
          'assistant-sheet',
          isMobile && !isDragging && 'is-mobile-ready',
        )}
        style={
          isMobile
            ? {
                position: 'fixed',
                left: 0,
                right: 0,
                bottom: 0,
                height: '85vh',
                borderTopLeftRadius: '16px',
                borderTopRightRadius: '16px',
                transform: isOpen
                  ? `translateY(${dragY}px)`
                  : 'translateY(100%)',
                willChange: 'transform',
              }
            : undefined
        }
      >
        {isMobile && (
          <div className="assistant-drag-handle-wrap">
            <div className="assistant-drag-handle" />
          </div>
        )}
        <div
          className={cn('assistant-body', !isMobile && 'desktop')}
        >
          <div className="assistant-header">
            <div className="assistant-title">
              <Icon
                icon="sparkles"
                iconLibrary="lucide"
                color="var(--hover-color)"
                size={20}
              />
              <span className="assistant-title-text">Assistant</span>
            </div>

            <div className="assistant-actions">
              {!isMobile && (
                <button
                  onClick={toggleMaximize}
                  className="assistant-icon-button"
                  aria-label={isMaximized ? 'Minimize' : 'Maximize'}
                >
                  {isMaximized ? (
                    <Icon
                      icon="minimize-2"
                      iconLibrary="lucide"
                      size={14}
                      color="currentColor"
                    />
                  ) : (
                    <Icon
                      icon="maximize-2"
                      iconLibrary="lucide"
                      size={14}
                      color="currentColor"
                    />
                  )}
                </button>
              )}
              {messages.length > 0 && (
                <button
                  onClick={onClear}
                  className="assistant-icon-button"
                  aria-label="Clear chat"
                >
                  <Icon
                    icon="trash"
                    iconLibrary="lucide"
                    size={14}
                    color="currentColor"
                  />
                </button>
              )}
              <button
                onClick={handleClose}
                className="assistant-icon-button"
                aria-label="Close"
              >
                <Icon
                  icon="x"
                  iconLibrary="lucide"
                  size={16}
                  color="currentColor"
                />
              </button>
            </div>
          </div>

          <div
            ref={messagesRef}
            className={cn('assistant-messages', isDragging && 'is-dragging')}
            style={
              isDragging
                ? { overflow: 'hidden', touchAction: 'none' }
                : undefined
            }
          >
            <div className="assistant-grow" />
            {messages.length > 0 || errorMessage ? (
              <AssistantHistoryList
                messages={messages}
                status={status}
                errorMessage={errorMessage}
              />
            ) : (
              <AssistantEmptyState />
            )}
            <div ref={topBoundaryRef} className="assistant-top-boundary" />
          </div>

          <div className="assistant-composer">
            <AssistantTextArea
              value={input}
              onChange={setInput}
              onSubmit={handleSubmitAndFocus}
              isLoading={isLoading}
              disabled={!input.trim() || isLoading}
              shouldFocus={shouldFocus && isOpen}
              isMobile={isMobile}
            />
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(sheetContent, document.body);
}
