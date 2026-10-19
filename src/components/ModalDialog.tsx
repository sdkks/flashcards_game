import type { ComponentChildren } from 'preact';
import { useLayoutEffect, useRef } from 'preact/hooks';

type ModalDialogProps = {
  class: string;
  labelledBy: string;
  onDismiss: () => void;
  children: ComponentChildren;
  fallbackFocusId?: string;
};

// Mount only while open. The browser owns modality, including nested dialogs.
export function ModalDialog({ class: className, labelledBy, onDismiss, children, fallbackFocusId }: ModalDialogProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useLayoutEffect(() => {
    const dialog = ref.current;
    const opener = document.activeElement;
    dialog?.showModal();
    return () => {
      dialog?.close();
      if (opener instanceof HTMLElement && opener.isConnected) {
        opener.focus();
      } else if (fallbackFocusId) {
        document.getElementById(fallbackFocusId)?.focus();
      }
    };
  }, []);

  return (
    <dialog
      ref={ref}
      class={`modal-dialog ${className}`}
      aria-labelledby={labelledBy}
      onCancel={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onDismiss();
      }}
      onClick={(event) => {
        if (event.target !== event.currentTarget) return;
        const rect = event.currentTarget.getBoundingClientRect();
        if (event.clientX < rect.left || event.clientX > rect.right ||
            event.clientY < rect.top || event.clientY > rect.bottom) {
          event.stopPropagation();
          onDismiss();
        }
      }}
    >
      {children}
    </dialog>
  );
}
