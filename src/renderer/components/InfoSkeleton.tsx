import React from 'react'

/** Grey pulsing placeholder shown while fetching video info. */
export const InfoSkeleton: React.FC = React.memo(() => (
  <div className="card skeleton-card" aria-busy="true" aria-label="Loading">
    <div className="video-info-card" style={{ marginBottom: 16 }}>
      <div className="skeleton skeleton-thumb" />
      <div className="video-meta" style={{ flex: 1 }}>
        <div className="skeleton skeleton-line" style={{ width: '80%' }} />
        <div className="skeleton skeleton-line" style={{ width: '55%' }} />
        <div className="skeleton skeleton-line short" style={{ width: '30%' }} />
      </div>
    </div>
    <div className="skeleton skeleton-tabs" />
    <div className="skeleton skeleton-row" />
    <div className="skeleton skeleton-row" />
    <div className="skeleton skeleton-row" style={{ width: '70%' }} />
  </div>
))
