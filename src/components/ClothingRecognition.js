import React, { useEffect, useRef, useState } from 'react';
import apiService from '../services/apiService';
import clothingTypes from '../data/clothingTypes.json';

export default function ClothingRecognition({
  image,
  value,
  onChoose,
  disabled,
}) {
  const [result, setResult] = useState(null);
  const [status, setStatus] = useState('checking');
  const [showAlternatives, setShowAlternatives] = useState(false);
  const select = useRef(null);
  const selected = clothingTypes.find((item) => item.id === value);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    setResult(null);
    setStatus('checking');
    setShowAlternatives(false);
    async function identify() {
      try {
        const prediction = await apiService.recognizeGarment(
          image,
          controller.signal
        );
        if (!active) return;
        setResult(prediction);
        setStatus(prediction.status);
      } catch {
        if (active) setStatus('unavailable');
      } finally {
        clearTimeout(timeout);
      }
    }
    identify();
    return () => {
      active = false;
      clearTimeout(timeout);
      controller.abort();
    };
  }, [image]);

  const best = result?.suggestions[0];
  return (
    <section
      className="clothing-recognition"
      aria-label="Clothing identification"
    >
      <div className="recognition-message" aria-live="polite">
        {value ? (
          <p>
            {selected
              ? `${selected.label} selected`
              : 'Manual item details selected'}
          </p>
        ) : status === 'checking' ? (
          <p>Checking clothing type… You can also choose below.</p>
        ) : status === 'unavailable' ? (
          <p>Couldn’t suggest an item. You can choose its type below.</p>
        ) : status === 'uncertain' ? (
          <p>Not sure which item this is. Choose the closest match below.</p>
        ) : (
          <p>
            Looks like: <strong>{best?.label}</strong>. Is that correct?
          </p>
        )}
      </div>
      {!value && best && status === 'suggested' && !showAlternatives && (
        <div className="recognition-actions">
          <button
            type="button"
            className="button secondary"
            disabled={disabled}
            onClick={() => onChoose(best.type)}
          >
            Yes, use {best.label}
          </button>
          <button
            type="button"
            className="text-button"
            disabled={disabled}
            onClick={() => {
              setShowAlternatives(true);
              select.current.focus();
            }}
          >
            Change item
          </button>
        </div>
      )}
      {!value && best && (showAlternatives || status === 'uncertain') && (
        <div
          className="recognition-alternatives"
          aria-label="Suggested item types"
        >
          {result.suggestions.map((item) => (
            <button
              key={item.type}
              type="button"
              disabled={disabled}
              onClick={() => onChoose(item.type)}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
      <label>
        Clothing type
        <select
          ref={select}
          value={value}
          disabled={disabled}
          onChange={(event) => onChoose(event.target.value)}
        >
          <option value="">Choose an item type</option>
          {clothingTypes.map((item) => (
            <option key={item.id} value={item.id}>
              {item.label}
            </option>
          ))}
          <option value="OTHER">Other / enter details myself</option>
        </select>
      </label>
    </section>
  );
}
