import React from 'react';

export default function GarmentCutoutEditor({
  image,
  settings,
  onChange,
  onApply,
  busy,
  dirty,
}) {
  const update = (change) => onChange({ ...settings, ...change });
  function addPoint(event) {
    if (busy || settings.points.length >= 80) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    update({
      points: [
        ...settings.points,
        {
          x: Math.max(
            0,
            Math.min(1, (event.clientX - bounds.left) / bounds.width)
          ),
          y: Math.max(
            0,
            Math.min(1, (event.clientY - bounds.top) / bounds.height)
          ),
        },
      ],
    });
  }
  return (
    <div className="cutout-editor">
      <p className="cutout-hint">
        Plain, contrasting backgrounds work best. For a busy background, trace
        around the clothing.
      </p>
      <label className="checkbox-label">
        <input
          type="checkbox"
          checked={settings.trace}
          disabled={busy}
          onChange={(event) => update({ trace: event.target.checked })}
        />
        Trace garment outline
      </label>
      {settings.trace ? (
        <>
          <p className="cutout-hint">
            Tap around the edges in order, using at least 3 points. The last
            point connects to the first.
          </p>
          <div className="outline-photo" onClick={addPoint}>
            <img
              src={image}
              alt="Trace around your clothing"
              draggable="false"
            />
            <svg
              viewBox="0 0 1000 1000"
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              <polygon
                points={settings.points
                  .map((p) => `${p.x * 1000},${p.y * 1000}`)
                  .join(' ')}
              />
              {settings.points.map((p, index) => (
                <circle key={index} cx={p.x * 1000} cy={p.y * 1000} r="9" />
              ))}
            </svg>
          </div>
          <div className="outline-actions">
            <span className="cutout-hint">
              {settings.points.length} / 80 points
            </span>
            <button
              type="button"
              className="text-button"
              disabled={busy || !settings.points.length}
              onClick={() => update({ points: settings.points.slice(0, -1) })}
            >
              Undo point
            </button>
            <button
              type="button"
              className="text-button"
              disabled={busy || !settings.points.length}
              onClick={() => update({ points: [] })}
            >
              Clear outline
            </button>
          </div>
        </>
      ) : (
        <label>
          Background tolerance: {settings.tolerance}
          <input
            type="range"
            min="0"
            max="80"
            aria-label="Background tolerance"
            value={settings.tolerance}
            disabled={busy}
            onChange={(event) =>
              update({ tolerance: Number(event.target.value) })
            }
          />
          <span className="cutout-hint">
            Lower it if clothing disappears; raise it if the backdrop remains.
          </span>
        </label>
      )}
      {dirty && (
        <p className="cutout-hint">Your changes haven’t been applied yet.</p>
      )}
      <button
        type="button"
        className="button secondary full-width"
        disabled={busy || (settings.trace && settings.points.length < 3)}
        onClick={onApply}
      >
        {busy ? 'Cleaning photo…' : 'Apply cleanup'}
      </button>
    </div>
  );
}
