import { Icon } from '@mintlify/components';
import { toggleAssistant } from './events';

function closeMobileMenu() {
  const menuButton = document.querySelector('starlight-menu-button');
  if (menuButton?.getAttribute('aria-expanded') === 'true') {
    menuButton.setAttribute('aria-expanded', 'false');
    document.body.removeAttribute('data-mobile-menu-expanded');
  }
}

interface AssistantButtonProps {
  className?: string;
  buttonClassName?: string;
  showLabel?: boolean;
  label?: string;
}

export function AssistantButton({
  className,
  buttonClassName,
  showLabel = false,
  label = 'Ask AI',
}: AssistantButtonProps = {}) {
  const handleClick = () => {
    closeMobileMenu();
    toggleAssistant();
  };

  return (
    <div className={['nav-item', 'assistant', className].filter(Boolean).join(' ')}>
      <button
        onClick={handleClick}
        type="button"
        className={['nav__link', buttonClassName].filter(Boolean).join(' ')}
        aria-label={label}
        title={label}
      >
        <Icon
          icon="sparkles"
          iconLibrary="lucide"
          size={16}
          color="currentColor"
          className="shrink-0"
        />
        {showLabel && <span>{label}</span>}
      </button>
    </div>
  );
}
