import React from 'react';

interface IconProps extends React.SVGProps<SVGSVGElement> {
  size?: number | string;
}

export default function RobotIcon({ size = 24, className = '', ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`inline-block ${className}`}
      {...props}
    >
    
      <mask id="robot-mask">
        <rect width="100" height="100" fill="white" />
        {/* العين اليسرى واليمنى */}
        <circle cx="43" cy="25.5" r="9.5" fill="black" />
        <circle cx="57" cy="25.5" r="9.5" fill="black" />
        {/* الفم */}
        <rect x="37" y="58.5" width="26" height="5.5" rx="2.75" fill="black" />
      </mask>

      <g mask="url(#robot-mask)" fill="currentColor">
        {/* الرأس */}
        <rect x="33" y="12" width="34" height="27" rx="7" />
        {/* الجسم */}
        <rect x="25" y="44" width="50" height="33" rx="7" />
      </g>
    </svg>
  );
}
