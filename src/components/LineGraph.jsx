import React from 'react';

const LineGraph = ({ data, dataKey, color = "#3B82F6", height = 100 }) => {
  if (!data || data.length < 2) {
    return (
      <div className="h-24 flex items-center justify-center text-gray-400 text-xs">
        Not enough data
      </div>
    );
  }

  const values = data.map(d => d[dataKey]);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const points = values.map((val, i) => {
    const x = (i / (values.length - 1)) * 100;
    const y = 100 - ((val - min) / range) * 80 - 10;
    return `${x},${y}`;
  }).join(' ');

  return (
    <div className="w-full relative" style={{ height: `${height}px` }}>
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full overflow-visible">
        <polyline
          fill="none"
          stroke={color}
          strokeWidth="2"
          points={points}
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
        {values.map((val, i) => (
          <circle
            key={i}
            cx={(i / (values.length - 1)) * 100}
            cy={100 - ((val - min) / range) * 80 - 10}
            r="1.5"
            fill="white"
            stroke={color}
            strokeWidth="1"
            vectorEffect="non-scaling-stroke"
          />
        ))}
      </svg>
    </div>
  );
};

export default LineGraph;
