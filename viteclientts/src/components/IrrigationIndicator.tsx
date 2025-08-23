import React from 'react';
import { Box } from '@mui/material';
import { useTheme } from '@mui/material/styles';

type Props = {
  running: boolean;
  size?: number; // px
  ariaLabel?: string;
  title?: string;
};


const IrrigationIndicator: React.FC<Props> = ({ running, size = 32, ariaLabel = 'Bewässerung', title }) => {
  const theme = useTheme();
  const width = size;
  const height = Math.round(size * 0.85);
  const dropletColor = running ? theme.palette.info.main : theme.palette.text.disabled;
  const baseColor = running ? theme.palette.info.main : theme.palette.text.disabled;

  return (
    <Box
      role="img"
      aria-label={ariaLabel}
      title={title}
      className="irrigation-indicator"
      sx={{ display: 'inline-flex', alignItems: 'center', lineHeight: 0 }}
    >
      <svg
        width={width}
        height={height}
        viewBox="0 0 28 24"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden
        focusable="false"
      >
        {/* Spray droplets: left, up, right with staggered timing */}
        <g>
          <circle cx="9" cy="11" r="1.6" fill={dropletColor} className={running ? 'ia-spray-left' : undefined} style={running ? { animationDelay: '0s' } : {}} />
          <circle cx="14" cy="9" r="1.6" fill={dropletColor} className={running ? 'ia-spray-up' : undefined} style={running ? { animationDelay: '0.15s' } : {}} />
          <circle cx="19" cy="11" r="1.6" fill={dropletColor} className={running ? 'ia-spray-right' : undefined} style={running ? { animationDelay: '0.3s' } : {}} />
        </g>
        {/* Sprinkler head */}
        <rect x="11" y="12" width="6" height="3" rx="1" fill={baseColor} className={running ? 'ia-shimmer' : undefined} />
        {/* Base bar */}
        <rect x="6" y="17" width="16" height="3" rx="1.5" fill={baseColor} />
      </svg>
      {/* Component-scoped animations and reduced-motion handling */}
      <style>{`
        .irrigation-indicator svg .ia-spray-left { animation: ia-spray-left 1.2s ease-out infinite; transform-origin: 14px 10px; }
        .irrigation-indicator svg .ia-spray-up { animation: ia-spray-up 1.2s ease-out infinite; transform-origin: 14px 9px; }
        .irrigation-indicator svg .ia-spray-right { animation: ia-spray-right 1.2s ease-out infinite; transform-origin: 14px 10px; }
        .irrigation-indicator svg .ia-shimmer { animation: ia-shimmer 1.8s ease-in-out infinite; }

        @keyframes ia-spray-up { 0% { transform: translate(0,0) scale(1); opacity: 1; } 60% { opacity: .5; } 100% { transform: translate(0, -12px) scale(.9); opacity: 0; } }
        @keyframes ia-spray-left { 0% { transform: translate(0,0) scale(1); opacity: 1; } 60% { opacity: .5; } 100% { transform: translate(-8px, -10px) scale(.9); opacity: 0; } }
        @keyframes ia-spray-right { 0% { transform: translate(0,0) scale(1); opacity: 1; } 60% { opacity: .5; } 100% { transform: translate(8px, -10px) scale(.9); opacity: 0; } }
        @keyframes ia-shimmer { 0% { opacity: 1; } 50% { opacity: .75; } 100% { opacity: 1; } }

        @media (prefers-reduced-motion: reduce) {
          .irrigation-indicator svg * { animation: none !important; }
        }
      `}</style>
    </Box>
  );
};

export default IrrigationIndicator;
