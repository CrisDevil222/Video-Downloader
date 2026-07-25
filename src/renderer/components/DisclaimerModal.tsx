import React, { useEffect } from 'react'
import { useSettingsStore } from '../store/settingsStore'

interface DisclaimerModalProps {
  onAgree: () => void
}

export const DisclaimerModal: React.FC<DisclaimerModalProps> = ({ onAgree }) => {
  const t = useSettingsStore(s => s.t)
  const agreeDisclaimer = useSettingsStore(s => s.agreeDisclaimer)

  const handleAgree = () => {
    agreeDisclaimer()
    onAgree()
  }

  const handleDecline = () => {
    window.close()
  }

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="disclaimer-title">
      <div className="modal">
        <div className="modal-icon">⚖️</div>
        <h2 id="disclaimer-title" className="modal-title">{t.disclaimerTitle}</h2>
        <div className="modal-body">{t.disclaimerBody}</div>
        <div className="modal-actions">
          <button
            id="btn-agree-disclaimer"
            className="btn btn-primary"
            onClick={handleAgree}
            style={{ justifyContent: 'center' }}
          >
            ✓ {t.disclaimerAgree}
          </button>
          <button
            id="btn-decline-disclaimer"
            className="btn btn-ghost"
            onClick={handleDecline}
            style={{ justifyContent: 'center' }}
          >
            {t.disclaimerDecline}
          </button>
        </div>
      </div>
    </div>
  )
}
