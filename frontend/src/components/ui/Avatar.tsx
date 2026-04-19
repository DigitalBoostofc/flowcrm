import { useState } from 'react';

interface Props {
  name?: string | null;
  url?: string | null;
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}

function initials(name?: string | null): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function colorFromName(name?: string | null): string {
  const palette = ['#635BFF', '#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6'];
  if (!name) return palette[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) | 0;
  return palette[Math.abs(hash) % palette.length];
}

export default function Avatar({ name, url, size = 32, className = '', style }: Props) {
  const [failed, setFailed] = useState(false);
  const showImg = !!url && !failed;
  const fontSize = Math.max(10, Math.round(size * 0.38));

  return (
    <div
      className={`rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden ${className}`}
      style={{
        width: size,
        height: size,
        background: showImg ? 'var(--surface-hover)' : colorFromName(name),
        color: '#fff',
        fontSize,
        fontWeight: 600,
        ...style,
      }}
      aria-label={name ?? 'Avatar'}
    >
      {showImg ? (
        <img
          src={url!}
          alt={name ?? ''}
          onError={() => setFailed(true)}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      ) : (
        <span style={{ letterSpacing: '-0.01em' }}>{initials(name)}</span>
      )}
    </div>
  );
}
