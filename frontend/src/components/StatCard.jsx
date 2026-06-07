import React from 'react';

export default function StatCard({ label, value, sub, color = '#3b82f6', icon }) {
  return (
    <div
      style={{ background: '#1a1d2e', border: '1px solid #2a2d3e', borderRadius: 12 }}
      className="p-5 flex flex-col gap-2"
    >
      <div className="flex items-center justify-between">
        <span style={{ color: '#9ca3af', fontSize: 13 }}>{label}</span>
        {icon && (
          <span style={{ fontSize: 20 }}>{icon}</span>
        )}
      </div>
      <div style={{ fontSize: 28, fontWeight: 700, color: '#f9fafb', letterSpacing: '-0.5px' }}>
        {value}
      </div>
      {sub && (
        <div style={{ fontSize: 12, color }}>
          {sub}
        </div>
      )}
    </div>
  );
}
