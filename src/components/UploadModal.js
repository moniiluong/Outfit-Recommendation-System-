import React, { useEffect, useRef, useState } from 'react';
import Icon from './Icons';
import { CATEGORIES, preparePhoto } from '../data/wardrobe';

export default function UploadModal({ onClose, onSave }) {
  const dialog = useRef(null);
  const input = useRef(null);
  const [photo, setPhoto] = useState('');
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Tops');
  const [warmth, setWarmth] = useState('Medium');
  const [waterproof, setWaterproof] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [dragging, setDragging] = useState(false);
  useEffect(() => {
    dialog.current.showModal();
  }, []);
  async function choose(file) {
    if (!file) return;
    setBusy(true);
    setError('');
    try {
      setPhoto(await preparePhoto(file));
      if (!name)
        setName(file.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' '));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }
  async function submit(event) {
    event.preventDefault();
    if (!photo) {
      setError('Add a photo of your clothing first.');
      return;
    }
    if (!name.trim()) {
      setError('Give this piece a name before adding it.');
      return;
    }
    setBusy(true);
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
      setBusy(false);
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
          <div>
            <h2 id="upload-title">Add clothing</h2>
          </div>
          <button
            type="button"
            className="icon-button"
            aria-label="Close upload"
            onClick={onClose}
          >
            <Icon name="close" />
          </button>
        </div>
        <button
          type="button"
          className={`photo-drop ${dragging ? 'dragging' : ''}`}
          onClick={() => input.current.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            choose(e.dataTransfer.files[0]);
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
                {busy
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
          onChange={(e) => choose(e.target.files[0])}
        />
        <label>
          Item name
          <input
            required
            maxLength={60}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. My favorite blue sweater"
          />
        </label>
        <div className="form-row">
          <label>
            Category
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              {CATEGORIES.map((value) => (
                <option key={value}>{value}</option>
              ))}
            </select>
          </label>
          <label>
            Warmth
            <select value={warmth} onChange={(e) => setWarmth(e.target.value)}>
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
            onChange={(e) => setWaterproof(e.target.checked)}
          />
          Water-resistant / suitable for rain
        </label>
        <p className="privacy-note">
          <Icon name="info" size={15} /> Photos stay in this browser on this
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
          disabled={busy}
        >
          {busy ? 'Working…' : 'Add clothing'}
          <Icon name="plus" size={18} />
        </button>
      </form>
    </dialog>
  );
}
