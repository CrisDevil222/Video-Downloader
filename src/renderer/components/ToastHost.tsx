import React from 'react'
import { useToastStore } from '../store/toastStore'

const ICONS = { success: '✓', error: '⚠', info: 'ℹ' } as const

export const ToastHost: React.FC = React.memo(() => {
  const toasts = useToastStore(s => s.toasts)
  const dismiss = useToastStore(s => s.dismiss)

  return (
    <div className="toast-host" aria-live="polite">
      {toasts.map(toast => (
        <div key={toast.id} className={`toast toast-${toast.type}`} role="status">
          <span className="toast-icon">{ICONS[toast.type]}</span>
          <span className="toast-message">{toast.message}</span>
          <button className="toast-close" onClick={() => dismiss(toast.id)} aria-label="Close">✕</button>
        </div>
      ))}
    </div>
  )
})
