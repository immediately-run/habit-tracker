import { useEffect, type ReactNode } from 'react';
import Icon from './Icon';

interface ModalProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
  /** 'sheet' slides up from the bottom (settings drawer); 'dialog' is centred. */
  variant?: 'dialog' | 'sheet';
}

function Modal({ title, onClose, children, variant = 'dialog' }: ModalProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className={`overlay ${variant}`} onClick={onClose} role="presentation">
      <div className="modal" role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <header className="modal-head">
          <h2>{title}</h2>
          <button type="button" className="iconbtn" aria-label="Close" onClick={onClose}>
            <Icon name="x" />
          </button>
        </header>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}

export default Modal;
