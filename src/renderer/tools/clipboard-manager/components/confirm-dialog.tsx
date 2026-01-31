/**
 * ConfirmDialog - Confirmation dialog for destructive actions
 */

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  danger = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps): JSX.Element | null {
  if (!isOpen) return null;

  return (
    <div className="dialog-overlay" onClick={onCancel}>
      <div className="dialog-content confirm-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="dialog-header">
          <h3>{title}</h3>
          <button className="dialog-close" onClick={onCancel}>
            &times;
          </button>
        </div>

        <div className="dialog-body">
          <p className="confirm-message">{message}</p>
        </div>

        <div className="dialog-footer">
          <button type="button" className="btn-secondary" onClick={onCancel}>
            {cancelLabel}
          </button>
          <button
            type="button"
            className={danger ? 'btn-danger' : 'btn-primary'}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
