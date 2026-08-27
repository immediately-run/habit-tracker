interface StatTileProps {
  label: string;
  value: string | number;
  hint?: string;
  accent?: string;
}

function StatTile({ label, value, hint, accent }: StatTileProps) {
  return (
    <div className="stat">
      <div className="stat-label">{label}</div>
      <div className="stat-value" style={accent ? { color: accent } : undefined}>
        {value}
      </div>
      {hint ? <div className="stat-hint">{hint}</div> : null}
    </div>
  );
}

export default StatTile;
