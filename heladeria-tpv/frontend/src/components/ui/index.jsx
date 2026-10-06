import { useEffect, useId, useRef } from 'react'

// Componentes base del sistema de diseño (Especificación 12). Son envoltorios
// finos sobre las clases ui-* de styles/ui.css: no tienen logica de negocio.

function cx(...names) {
  return names.filter(Boolean).join(' ')
}

// variant: primary | secondary | neutral | danger | danger-text
// size: sm | md | lg
export function Button({ variant = 'primary', size = 'md', block = false, className, type = 'button', ...props }) {
  return (
    <button
      type={type}
      className={cx('ui-btn', `ui-btn--${variant}`, size !== 'md' && `ui-btn--${size}`, block && 'ui-btn--block', className)}
      {...props}
    />
  )
}

export function Card({ as: Tag = 'div', className, ...props }) {
  return <Tag className={cx('ui-card', className)} {...props} />
}

// variant: neutral | primary | primary-soft | success | warning | danger
export function Chip({ variant = 'neutral', dot = false, className, children, ...props }) {
  return (
    <span className={cx('ui-chip', `ui-chip--${variant}`, className)} {...props}>
      {dot && <span className="ui-chip__dot" />}
      {children}
    </span>
  )
}

// variant: info | success | warning | danger. icon: un <svg> opcional.
export function Notice({ variant = 'info', icon, className, children, ...props }) {
  return (
    <div className={cx('ui-notice', `ui-notice--${variant}`, className)} role={variant === 'danger' ? 'alert' : 'status'} {...props}>
      {icon}
      <span>{children}</span>
    </div>
  )
}

// Etiqueta + control + texto de ayuda o error. El control se pasa como hijo
// (normalmente <Input />, o un <select className="ui-input">).
export function Field({ label, hint, error, className, children }) {
  return (
    <label className={cx('ui-field', error && 'ui-field--error', className)}>
      {label && <span className="ui-field__label">{label}</span>}
      {children}
      {(error || hint) && <span className="ui-field__hint">{error || hint}</span>}
    </label>
  )
}

export function Input({ className, ...props }) {
  return <input className={cx('ui-input', className)} {...props} />
}

// Modal centrado. Se cierra con Escape o con un clic fuera (salvo que
// dismissible sea false). initialFocusRef indica que control recibe el foco
// al abrir; si no se pasa, el foco queda en el propio cuadro.
export function Modal({ title, subtitle, onClose, footer, width, initialFocusRef, dismissible = true, children }) {
  const titleId = useId()
  const dialogRef = useRef(null)

  useEffect(() => {
    const target = initialFocusRef?.current || dialogRef.current
    target?.focus()
  }, [initialFocusRef])

  useEffect(() => {
    if (!dismissible) return undefined
    function onKeyDown(e) {
      if (e.key === 'Escape') onClose?.()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [dismissible, onClose])

  return (
    <div
      className="ui-modal-overlay"
      onMouseDown={(e) => {
        if (dismissible && e.target === e.currentTarget) onClose?.()
      }}
    >
      <div
        ref={dialogRef}
        className="ui-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        tabIndex={-1}
        style={width ? { width } : undefined}
      >
        {title && (
          <div className="ui-modal__header">
            <h2 id={titleId} className="ui-modal__title">{title}</h2>
            {subtitle && <div className="ui-modal__subtitle">{subtitle}</div>}
          </div>
        )}
        <div className="ui-modal__body">{children}</div>
        {footer && <div className="ui-modal__footer">{footer}</div>}
      </div>
    </div>
  )
}
