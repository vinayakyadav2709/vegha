import React from 'react';
import { LucideIcon } from 'lucide-react';

interface CardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  iconColor?: string;
  iconBgColor?: string;
  subtitle?: string;
  trend?: {
    value: string;
    isPositive: boolean;
    icon: LucideIcon;
  };
  status?: {
    text: string;
    color: string;
    dotColor: string;
  };
  badge?: {
    text: string;
    color: string;
    bgColor: string;
  };
  className?: string;
  onClick?: () => void; // Note: only usable when this Card is rendered in a Client Component tree.
}

export default function Card({
  title,
  value,
  icon: Icon,
  iconColor = 'text-white',
  iconBgColor = '',
  subtitle,
  trend,
  status,
  badge,
  className = '',
  onClick,
}: CardProps) {
  // Token-driven fallback gradient for the icon chip (no Tailwind hardcoded colors).
  const iconFallbackGradient = 'linear-gradient(135deg, var(--color-primary-600), var(--color-primary-700))';

  return (
    <div
      className={[
        'group',
        'relative',
        'overflow-hidden',
        'bg-theme-surface',
        'rounded-2xl',
        'p-6',
        'shadow-sm',
        'card-hover',
        onClick ? 'cursor-pointer' : '',
        className,
      ].join(' ')}
      onClick={onClick}
    >
      {/* Subtle token-based tint (keeps cards “alive” like emergency, but calm) */}
      <div
        className="pointer-events-none absolute inset-0 opacity-100"
        style={{
          backgroundImage:
            'radial-gradient(800px circle at 20% 0%, var(--color-primary-soft), transparent 55%)',
        }}
      />

      {/* Content */}
      <div className="relative flex items-center justify-between">
        <div className="flex-1">
          <p className="text-xs font-medium text-theme-muted uppercase tracking-wide">
            {title}
          </p>

          <p className="text-3xl font-semibold text-theme-text mt-2">
            {value}
          </p>

          {subtitle && (
            <p className="text-sm text-theme-muted mt-1">
              {subtitle}
            </p>
          )}

          {status && (
            <div className="flex items-center mt-2">
              <div
                className="w-2 h-2 rounded-full mr-2"
                style={{
                  backgroundColor: status.dotColor.includes('green')
                    ? 'var(--color-success)'
                    : status.dotColor.includes('red')
                    ? 'var(--color-error)'
                    : status.dotColor.includes('amber')
                    ? 'var(--color-warning)'
                    : 'var(--color-text-muted)',
                }}
              />
              <span className={`text-xs font-medium ${status.color}`}>
                {status.text}
              </span>
            </div>
          )}

          {trend && (
            <div className="flex items-center mt-2">
              <trend.icon
                className={`w-4 h-4 mr-1 ${trend.isPositive ? 'text-theme-success' : 'text-theme-error'}`}
              />
              <span className={`text-xs ${trend.isPositive ? 'text-theme-success' : 'text-theme-error'}`}>
                {trend.value}
              </span>
            </div>
          )}
        </div>

        {/* Icon chip (styled like “emergency” icon block, but token-driven) */}
        <div className="relative">
          <div
            className={[
              'w-14',
              'h-14',
              'rounded-2xl',
              'flex',
              'items-center',
              'justify-center',
              'shadow-sm',
              'transition-shadow',
              'duration-300',
              'group-hover:shadow-md',
              iconBgColor, // still supported (won’t break existing callers)
            ].join(' ')}
            style={{
              background: iconBgColor ? undefined : iconFallbackGradient,
            }}
          >
            <Icon className={`w-7 h-7 ${iconColor}`} />
          </div>

          {badge && (
            <div
              className={`absolute -top-2 -right-2 w-6 h-6 ${badge.bgColor} rounded-full flex items-center justify-center`}
            >
              <span className={`text-xs font-bold ${badge.color}`}>
                {badge.text}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
