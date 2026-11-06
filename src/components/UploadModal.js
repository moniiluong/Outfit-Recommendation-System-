import React, { useEffect, useRef, useState } from 'react';
import Icon from './Icons';
import GarmentCutoutEditor from './GarmentCutoutEditor';
import { CATEGORIES, preparePhoto } from '../data/wardrobe';
import apiService from '../services/apiService';

const defaultSettings = () => ({ trace: false, points: [], tolerance: 24 });
const settingsKey = (settings) =>
  JSON.stringify(settings.trace ? settings.points : settings.tolerance);

export default function UploadModal({ onClose, onSave }) {
  const dialog = useRef(null);
  const input = useRef(null);
  const requestVersion = useRef(0);
  const activeRequest = useRef(null);
  const [original, setOriginal] = useState('');
  const [cutout, setCutout] = useState(null);
  const [useCutout, setUseCutout] = useState(false);
  const [settings, setSettings] = useState(defaultSettings);
  const [appliedSettings, setAppliedSettings] = useState('');
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Tops');
  const [warmth, setWarmth] = useState('Medium');
  const [waterproof, setWaterproof] = useState(false);
  const [reading, setReading] = useState(false);
  const [cleaning, setCleaning] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [cleanupError, setCleanupError] = useState('');
  const [dragging, setDragging] = useState(false);
  const busy = reading || cleaning || saving;
  const dirty = !!cutout && appliedSettings !== settingsKey(settings);
  const photo = useCutout && cutout ? cutout.image : original;

  useEffect(() => {
    dialog.current.showModal();
    return () => {
      requestVersion.current += 1;
      activeRequest.current?.abort();
    };
  }, []);

  async function cleanPhoto(image, options, version) {
    activeRequest.current?.abort();
    const controller = new AbortController();
    activeRequest.current = controller;
    const timeout = setTimeout(() => controller.abort(), 25000);
    setCleaning(true);
    setCleanupError('');
    try {
      const result = await apiService.prepareGarment(
        {
          image,
          remove_background: true,
          tolerance: options.tolerance,
          outline: options.trace ? options.points : [],
        },
        controller.signal
      );
      if (version !== requestVersion.current) return;
      setCutout(result);
      setAppliedSettings(settingsKey(options));
      setUseCutout(true);
    } catch (err) {
      if (version !== requestVersion.current) return;
      setCleanupError(
        err.name === 'AbortError'
          ? 'Photo cleanup timed out. Keep the original photo or try again.'
          : err.message
      );
    } finally {
      clearTimeout(timeout);
      if (version === requestVersion.current) setCleaning(false);
    }
  }

  async function choose(file) {
    if (!file || saving) return;
    const version = ++requestVersion.current;
    activeRequest.current?.abort();
    setReading(true);
    setCleaning(false);
    setError('');
    setCleanupError('');
    setOriginal('');
    setCutout(null);
    setUseCutout(false);
    setAppliedSettings('');
    const options = defaultSettings();
    setSettings(options);
    try {
      const image = await preparePhoto(file);
      if (version !== requestVersion.current) return;
      setOriginal(image);
      setName(
        (current) =>
          current || file.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ')
      );
      setReading(false);
      await cleanPhoto(image, options, version);
    } catch (err) {
      if (version === requestVersion.current) setError(err.message);
    } finally {
      if (version === requestVersion.current) setReading(false);
    }
  }

  async function submit(event) {
    event.preventDefault();
    if (busy || (useCutout && dirty)) return;
    if (!photo) {
      setError('Add a photo of your clothing first.');
      return;
    }
    if (!name.trim()) {
      setError('Give this piece a name before adding it.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await onSave({
        id: crypto.randomUUID(),
        name: name.trim(),
        category,
        warmth,
        waterproof,
        image: photo,
      });
      onClose();
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  }

  return (
    <dialog
      className="upload-modal"
      aria-labelledby="upload-title"
      ref={dialog}
      onCancel={onClose}
      onClick={(event) => {
        if (event.target === dialog.current) onClose();
      }}
    >
      <form onSubmit={submit}>
        <div className="modal-heading">
          <h2 id="upload-title">Add clothing</h2>
          <button
            type="button"
            className="icon-button"
            aria-label="Close upload"
            onClick={onClose}
          >
            <Icon name="close" />
          </button>
        </div>
        <p className="upload-intro">
          We’ll try to remove the background so your clothing stands out.
        </p>
        <button
          type="button"
          className={`photo-drop ${photo ? 'has-photo' : ''} ${useCutout ? 'cutout-preview' : ''} ${dragging ? 'dragging' : ''}`}
          disabled={saving}
          onClick={() => input.current.click()}
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(event) => {
            event.preventDefault();
            setDragging(false);
            choose(event.dataTransfer.files[0]);
          }}
        >
          {photo ? (
            <img src={photo} alt="Your clothing preview. Click to replace." />
          ) : (
            <>
              <span className="upload-symbol">
                <Icon name="upload" size={26} />
              </span>
              <strong>
                {reading
                  ? 'Preparing your photo…'
                  : 'Drop your clothing photo here'}
              </strong>
              <span>or click to browse · JPG, PNG, WebP · up to 8 MB</span>
            </>
          )}
          {photo && <span className="replace-photo">Change photo</span>}
        </button>
        <input
          ref={input}
          className="sr-only"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          aria-label="Clothing photo"
          disabled={saving}
          onChange={(event) => {
            choose(event.target.files[0]);
            event.target.value = '';
          }}
        />
        {original && (
          <div className="photo-cleanup">
            <p className="cutout-status" role="status">
              {cleaning
                ? 'Separating clothing from its background…'
                : useCutout
                  ? 'Cutout selected · transparent background'
                  : 'Original photo selected'}
            </p>
            {cutout && (
              <div className="photo-versions" aria-label="Photo version">
                <button
                  type="button"
                  aria-pressed={useCutout}
                  disabled={busy}
                  onClick={() => setUseCutout(true)}
                >
                  Clothing cutout
                </button>
                <button
                  type="button"
                  aria-pressed={!useCutout}
                  disabled={busy}
                  onClick={() => setUseCutout(false)}
                >
                  Original photo
                </button>
              </div>
            )}
            {cleanupError && (
              <div className="cleanup-error" role="alert">
                <p>{cleanupError}</p>
                <p>
                  You can save the original photo, or refine the outline below.
                </p>
                <button
                  type="button"
                  className="text-button"
                  disabled={
                    busy || (settings.trace && settings.points.length < 3)
                  }
                  onClick={() =>
                    cleanPhoto(original, settings, ++requestVersion.current)
                  }
                >
                  Try cleanup again
                </button>
              </div>
            )}
            <details className="cutout-details">
              <summary>Refine outline</summary>
              <GarmentCutoutEditor
                image={original}
                settings={settings}
                onChange={setSettings}
                onApply={() =>
                  cleanPhoto(original, settings, ++requestVersion.current)
                }
                busy={busy}
                dirty={dirty}
              />
            </details>
            {useCutout && dirty && (
              <p className="cutout-hint">
                Apply your outline changes before saving, or select the original
                photo.
              </p>
            )}
          </div>
        )}
        <label>
          Item name
          <input
            required
            maxLength={60}
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="e.g. My favorite blue sweater"
          />
        </label>
        <div className="form-row">
          <label>
            Category
            <select
              value={category}
              onChange={(event) => setCategory(event.target.value)}
            >
              {CATEGORIES.map((value) => (
                <option key={value}>{value}</option>
              ))}
            </select>
          </label>
          <label>
            Warmth
            <select
              value={warmth}
              onChange={(event) => setWarmth(event.target.value)}
            >
              {['Light', 'Medium', 'Warm'].map((value) => (
                <option key={value}>{value}</option>
              ))}
            </select>
          </label>
        </div>
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={waterproof}
            onChange={(event) => setWaterproof(event.target.checked)}
          />
          Water-resistant / suitable for rain
        </label>
        <p className="privacy-note">
          <Icon name="info" size={15} /> Photos are sent to the app’s server for
          background cleanup. Saved clothing stays in this browser on this
          device.
        </p>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <button
          className="button primary full-width"
          type="submit"
          disabled={busy || (useCutout && dirty)}
        >
          {busy ? 'Working…' : 'Add clothing'}
          <Icon name="plus" size={18} />
        </button>
      </form>
    </dialog>
  );
}
