interface RangoliLoaderProps {
  size?: number;
  className?: string;
}

export function RangoliLoader({ size = 48, className = "" }: RangoliLoaderProps) {
  const cx = size / 2;
  const cy = size / 2;

  const outerCount = 12;
  const outerR = size * 0.37;
  const outerDot = size * 0.072;

  const innerCount = 6;
  const innerR = size * 0.21;
  const innerDot = size * 0.055;

  const centerDot = size * 0.07;

  const outerDots = Array.from({ length: outerCount }, (_, i) => {
    const angle = (i * 2 * Math.PI) / outerCount;
    return {
      x: cx + outerR * Math.sin(angle),
      y: cy - outerR * Math.cos(angle),
      delay: (i / outerCount) * 1.4,
    };
  });

  const innerDots = Array.from({ length: innerCount }, (_, i) => {
    const angle = (i * 2 * Math.PI) / innerCount + Math.PI / innerCount;
    return {
      x: cx + innerR * Math.sin(angle),
      y: cy - innerR * Math.cos(angle),
      delay: (i / innerCount) * 1.0,
    };
  });

  const uid = `rl-${size}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className={className}
      aria-label="Loading"
      role="status"
    >
      <defs>
        <style>{`
          @keyframes ${uid}-fade {
            0%, 100% { opacity: 0.12; transform: scale(0.7); }
            50% { opacity: 1; transform: scale(1); }
          }
          @keyframes ${uid}-cw {
            from { transform: rotate(0deg); }
            to   { transform: rotate(360deg); }
          }
          @keyframes ${uid}-ccw {
            from { transform: rotate(0deg); }
            to   { transform: rotate(-360deg); }
          }
          @keyframes ${uid}-pulse {
            0%, 100% { opacity: 0.5; }
            50% { opacity: 1; }
          }
        `}</style>
      </defs>

      <g
        style={{
          animation: `${uid}-cw 4s linear infinite`,
          transformOrigin: `${cx}px ${cy}px`,
        }}
      >
        {outerDots.map((d, i) => (
          <circle
            key={i}
            cx={d.x}
            cy={d.y}
            r={outerDot}
            fill="hsl(24 100% 50%)"
            style={{
              animation: `${uid}-fade 1.4s ease-in-out ${d.delay.toFixed(3)}s infinite`,
              transformOrigin: `${d.x}px ${d.y}px`,
            }}
          />
        ))}
      </g>

      <g
        style={{
          animation: `${uid}-ccw 2.8s linear infinite`,
          transformOrigin: `${cx}px ${cy}px`,
        }}
      >
        {innerDots.map((d, i) => (
          <circle
            key={i}
            cx={d.x}
            cy={d.y}
            r={innerDot}
            fill="hsl(24 80% 62%)"
            style={{
              animation: `${uid}-fade 1.0s ease-in-out ${d.delay.toFixed(3)}s infinite`,
              transformOrigin: `${d.x}px ${d.y}px`,
            }}
          />
        ))}
      </g>

      <circle
        cx={cx}
        cy={cy}
        r={centerDot}
        fill="hsl(24 100% 50%)"
        style={{ animation: `${uid}-pulse 1.4s ease-in-out infinite` }}
      />
    </svg>
  );
}

export function PageLoader({ bg = "bg-background" }: { bg?: string }) {
  return (
    <div className={`min-h-screen flex items-center justify-center ${bg}`}>
      <RangoliLoader size={64} />
    </div>
  );
}

export function SectionLoader({ className = "py-8" }: { className?: string }) {
  return (
    <div className={`flex justify-center ${className}`}>
      <RangoliLoader size={36} />
    </div>
  );
}
