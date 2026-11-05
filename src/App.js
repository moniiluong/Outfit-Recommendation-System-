import React, { useEffect, useRef, useState } from 'react';
import './style.css';
import Icon from './components/Icons';
import Garment from './components/Garment';
import UploadModal from './components/UploadModal';
import {
  CATEGORIES,
  SAMPLE_ITEMS,
  buildOutfit,
  readWardrobe,
  writeWardrobe,
} from './data/wardrobe';
import { EXAMPLE_WEATHER, getLocalWeather } from './services/dashboardWeather';

const weatherIcon = (condition) =>
  /rain|storm|drizzle|snow/i.test(condition)
    ? 'rain'
    : /clear|sun/i.test(condition)
    ? 'sun'
    : 'cloud';
const NAV = [
  { id: 'Today', icon: 'home' },
  { id: 'My wardrobe', icon: 'hanger' },
  { id: 'Saved outfits', icon: 'heart' },
];

function App() {
  const [page, setPage] = useState('Today');
  const [data, setData] = useState({ items: [], looks: [] });
  const [loaded, setLoaded] = useState(false);
  const [demo, setDemo] = useState(true);
  const [weather, setWeather] = useState(EXAMPLE_WEATHER);
  const [weatherStatus, setWeatherStatus] = useState('');
  const [weatherError, setWeatherError] = useState('');
  const [upload, setUpload] = useState(false);
  const [category, setCategory] = useState('All items');
  const [query, setQuery] = useState('');
  const [unit, setUnit] = useState('C');
  const [variation, setVariation] = useState(0);
  const [notice, setNotice] = useState('');
  const [saving, setSaving] = useState(false);
  const [storageError, setStorageError] = useState('');
  const noticeTimer = useRef(null);
  const weatherRequest = useRef(0);
  const items = demo ? SAMPLE_ITEMS : data.items;
  const outfit = buildOutfit(items, weather, variation);
  const filtered = items.filter(
    (item) =>
      (category === 'All items' || item.category === category) &&
      item.name.toLowerCase().includes(query.toLowerCase())
  );
  const temp = (value) =>
    Math.round(unit === 'F' ? (value * 9) / 5 + 32 : value);
  const outfitKey = outfit.items
    .map((item) => item.id)
    .sort()
    .join(',');
  const saved = data.looks.some(
    (look) =>
      look.items
        .map((item) => item.id)
        .sort()
        .join(',') === outfitKey
  );

  useEffect(() => {
    let active = true;
    readWardrobe()
      .then((value) => {
        if (active) {
          setData(value);
          setDemo(value.items.length === 0);
        }
      })
      .catch(() => {
        if (active)
          setStorageError(
            'Browser storage is unavailable. Enable site storage to keep clothing and saved outfits.'
          );
      })
      .finally(() => {
        if (active) setLoaded(true);
      });
    return () => {
      active = false;
      clearTimeout(noticeTimer.current);
    };
  }, []);

  function toast(message) {
    setNotice(message);
    clearTimeout(noticeTimer.current);
    noticeTimer.current = setTimeout(() => setNotice(''), 4500);
  }
  async function persist(next) {
    await writeWardrobe(next);
    setData(next);
    setStorageError('');
  }
  async function addClothing(item) {
    if (data.items.length >= 60)
      throw new Error(
        'Your wardrobe has 60 items. Remove an item to add another.'
      );
    try {
      await persist({ ...data, items: [...data.items, item] });
    } catch (error) {
      throw new Error(
        'Could not save the photo. Your browser storage may be full or disabled.'
      );
    }
    setDemo(false);
    setVariation(0);
    toast('Clothing added.');
  }
  async function removeClothing(id) {
    try {
      await persist({
        ...data,
        items: data.items.filter((item) => item.id !== id),
      });
      toast('Clothing removed. Saved looks keep their photos.');
    } catch {
      toast('Could not remove this item. Please try again.');
    }
  }
  function requestWeather() {
    if (!navigator.geolocation) {
      setWeatherError(
        'Location isn’t supported in this browser. You can still explore with example weather.'
      );
      return;
    }
    const requestId = ++weatherRequest.current;
    setWeatherStatus('Finding your weather…');
    setWeatherError('');
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const next = await getLocalWeather(
            position.coords.latitude,
            position.coords.longitude
          );
          if (requestId !== weatherRequest.current) return;
          setWeather(next);
          setVariation(0);
          setWeatherStatus('');
          toast('Weather updated for your location.');
        } catch (error) {
          if (requestId === weatherRequest.current) {
            setWeatherStatus('');
            setWeatherError(
              `${error.message || 'Live weather couldn’t load. Please try again.'} Your wardrobe is still available.`
            );
          }
        }
      },
      (error) => {
        if (requestId === weatherRequest.current) {
          setWeatherStatus('');
          setWeatherError(
            error.code === 1
              ? 'Location access is off. Allow location in your browser and try again, or continue with example weather.'
              : 'We couldn’t find your location. Try again or continue with example weather.'
          );
        }
      },
      { timeout: 12000, maximumAge: 300000 }
    );
  }
  async function saveLook() {
    if (saved || !outfit.items.length) return;
    setSaving(true);
    try {
      await persist({
        ...data,
        looks: [
          {
            id: crypto.randomUUID(),
            name: demo ? 'Everyday layers · sample' : 'Everyday layers',
            date: new Date().toISOString(),
            temperature: weather.temperature,
            weatherSample: weather.sample,
            items: outfit.items,
            sample: demo,
          },
          ...data.looks,
        ],
      });
      toast('Outfit saved. Find it in Saved outfits.');
    } catch {
      toast('Could not save this outfit. Please check your browser storage.');
    } finally {
      setSaving(false);
    }
  }
  function showWardrobe() {
    setPage('My wardrobe');
    setQuery('');
    setCategory('All items');
  }

  function wardrobeSection(full = false) {
    return (
      <section
        className={`wardrobe-section ${full ? 'full-wardrobe' : ''}`}
        aria-labelledby="wardrobe-title"
      >
        <div className="section-heading">
          <div>
            <div className="title-line">
              <h2 id="wardrobe-title">Your wardrobe</h2>
              <span className="count-badge">{items.length} pieces</span>
            </div>
          </div>
          {!full && (
            <button className="text-button" onClick={showWardrobe}>
              View wardrobe
              <Icon name="arrow" size={17} />
            </button>
          )}
        </div>
        <div className="wardrobe-toolbar">
          <div className="filter-tabs" aria-label="Clothing categories">
            {['All items', ...CATEGORIES].map((value) => (
              <button
                key={value}
                className={category === value ? 'selected' : ''}
                aria-pressed={category === value}
                onClick={() => setCategory(value)}
              >
                {value}
              </button>
            ))}
          </div>
          {full && (
            <input
              className="search-input"
              aria-label="Search your wardrobe"
              placeholder="Find a piece…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          )}
        </div>
        <div className="garment-grid">
          {(full ? filtered : filtered.slice(0, 5)).map((item) => (
            <article className="garment-card" key={item.id}>
              <div className="garment-image">
                <Garment item={item} />
                <span className="garment-category">{item.category}</span>
                {!item.sample && (
                  <button
                    className="delete-item"
                    aria-label={`Remove ${item.name}`}
                    onClick={() => removeClothing(item.id)}
                  >
                    <Icon name="trash" size={16} />
                  </button>
                )}
              </div>
              <h3>{item.name}</h3>
              <p>
                {item.warmth}{' '}
                {item.waterproof ? '· Water-resistant' : '· Everyday essential'}
              </p>
            </article>
          ))}
          <button
            className="add-clothing-card"
            onClick={() => setUpload(true)}
            disabled={!loaded}
          >
            <span>
              <Icon name="plus" size={25} />
            </span>
            <strong>Add item</strong>
          </button>
        </div>
        {!filtered.length && (
          <p className="empty-message">
            {items.length
              ? 'No pieces here yet. Try another category or search.'
              : 'No clothing yet. Add a top, bottoms, and shoes to build an outfit.'}
          </p>
        )}
      </section>
    );
  }

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <aside className="sidebar">
        <a
          href="#main"
          className="brand"
          onClick={(e) => {
            e.preventDefault();
            setPage('Today');
          }}
          aria-label="Thread, home"
        >
          <span className="brand-mark">
            <Icon name="hanger" size={25} />
          </span>
          <span>
            thread<span className="brand-dot">.</span>
          </span>
        </a>
        <nav aria-label="Main navigation">
          {NAV.map((nav) => (
            <button
              key={nav.id}
              className={`nav-item ${page === nav.id ? 'active' : ''}`}
              onClick={() => setPage(nav.id)}
              aria-current={page === nav.id ? 'page' : undefined}
            >
              <Icon name={nav.icon} />
              <span>{nav.id}</span>
              {nav.id === 'Saved outfits' && data.looks.length > 0 && (
                <small>{data.looks.length}</small>
              )}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <button
            className={`nav-item ${page === 'Settings' ? 'active' : ''}`}
            onClick={() => setPage('Settings')}
          >
            <Icon name="settings" />
            <span>Settings</span>
          </button>
          <div className="local-profile">
            <span className="profile-icon">Y</span>
            <div>
              <strong>Local storage</strong>
              <span>Stored on this device</span>
            </div>
            <span className="online-dot" />
          </div>
        </div>
      </aside>
      <main id="main" className="main-content">
        <header className="topbar">
          <div className="location">
            <Icon name="pin" size={19} />
            <div>
              <strong>
                {weather.sample ? 'Weather & outfits' : weather.location}
              </strong>
              <span>
                {new Date().toLocaleDateString('en-US', {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                })}
              </span>
            </div>
          </div>
          <div className="topbar-actions">
            <div className="unit-toggle" aria-label="Temperature unit">
              {['C', 'F'].map((value) => (
                <button
                  key={value}
                  className={unit === value ? 'selected' : ''}
                  aria-pressed={unit === value}
                  onClick={() => setUnit(value)}
                >
                  °{value}
                </button>
              ))}
            </div>
            <button
              className="button primary"
              onClick={() => setUpload(true)}
              disabled={!loaded}
            >
              <Icon name="plus" size={18} />
              <span>Add clothing</span>
            </button>
          </div>
        </header>
        {storageError && (
          <p role="alert" className="banner error-banner">
            {storageError}
          </p>
        )}
        {weatherError && (
          <div role="alert" className="banner error-banner">
            <span>{weatherError}</span>
            <button
              className="text-button"
              onClick={requestWeather}
              disabled={!!weatherStatus}
            >
              Try again
            </button>
          </div>
        )}
        {page === 'Today' && (
          <>
            <div className="page-heading">
              <div>
                <h1>Today</h1>
              </div>
              <span className={`context-badge ${demo ? '' : 'personal'}`}>
                <span />
                {demo
                  ? 'Exploring a sample wardrobe'
                  : 'Made from your wardrobe'}
              </span>
            </div>
            <div className="dashboard-grid">
              <div className="weather-column">
                <section
                  className={`weather-hero ${weatherIcon(weather.condition)}`}
                  aria-label="Current weather"
                >
                  <div className="weather-topline">
                    <span>
                      <Icon name="pin" size={15} />
                      {weather.location}
                    </span>
                    <span className="weather-label">
                      {weather.sample ? 'EXAMPLE WEATHER' : 'LIVE WEATHER'}
                    </span>
                  </div>
                  <div className="weather-temperature">
                    {temp(weather.temperature)}
                    <span>°</span>
                  </div>
                  <div className="weather-summary">
                    <div>
                      <h2>{weather.description}</h2>
                      <p>
                        H: {temp(weather.high)}°<span />
                        L: {temp(weather.low)}°
                      </p>
                    </div>
                    <span className="weather-large-icon">
                      <Icon name={weatherIcon(weather.condition)} size={62} />
                    </span>
                  </div>
                  <div className="weather-hero-footer">
                    <span>
                      {weather.sample
                        ? 'Example conditions'
                        : 'Current conditions · OpenWeatherMap'}
                    </span>
                    <button onClick={requestWeather} disabled={!!weatherStatus}>
                      <Icon
                        name={weatherStatus ? 'refresh' : 'pin'}
                        size={15}
                      />
                      {weatherStatus ||
                        (weather.sample ? 'Use my location' : 'Refresh')}
                    </button>
                  </div>
                </section>
                <section className="hourly-panel" aria-label="Weather forecast">
                  <div className="panel-label">
                    <h3>Forecast</h3>
                    <span>
                      {weather.sample ? 'Example forecast' : '3-hour forecast'}
                    </span>
                  </div>
                  <div className="hourly-list">
                    {[
                      {
                        dt: Date.now(),
                        temp: weather.temperature,
                        condition: weather.condition,
                      },
                      ...weather.forecast.slice(0, 5),
                    ].map((entry, i) => (
                      <div
                        className={`hour-item ${i === 0 ? 'current' : ''}`}
                        key={i}
                      >
                        <span>
                          {i === 0
                            ? 'Now'
                            : new Date(entry.dt).toLocaleTimeString('en-US', {
                                hour: 'numeric',
                              })}
                        </span>
                        <Icon name={weatherIcon(entry.condition)} size={25} />
                        <strong>{temp(entry.temp)}°</strong>
                      </div>
                    ))}
                  </div>
                </section>
                <div className="weather-metrics">
                  <div>
                    <Icon name="drop" />
                    <span>
                      Humidity<strong>{weather.humidity}%</strong>
                    </span>
                  </div>
                  <div>
                    <Icon name="wind" />
                    <span>
                      Wind
                      <strong>
                        {Math.round(weather.wind)} <small>km/h</small>
                      </strong>
                    </span>
                  </div>
                  <div>
                    <Icon name="hanger" />
                    <span>
                      Dress for
                      <strong>
                        {weather.temperature < 15
                          ? 'Cozy layers'
                          : weather.temperature < 22
                          ? 'Light layers'
                          : 'Keep it light'}
                      </strong>
                    </span>
                  </div>
                </div>
              </div>
              <section className="outfit-panel" aria-labelledby="outfit-title">
                <div className="outfit-heading">
                  <div>
                    <h2 id="outfit-title">Today’s outfit</h2>
                  </div>
                  <span className="tiny-badge">
                    {demo ? 'Sample look' : 'Your pieces'}
                  </span>
                </div>
                <div
                  className={`outfit-board ${
                    outfit.items.length ? '' : 'is-empty'
                  }`}
                >
                  {outfit.items.length ? (
                    outfit.items.map((item) => (
                      <div
                        className={`outfit-piece piece-${item.category.toLowerCase()}`}
                        key={item.id}
                      >
                        <Garment item={item} />
                        <span>{item.name}</span>
                      </div>
                    ))
                  ) : (
                    <div className="board-empty">
                      <Icon name="hanger" size={48} />
                      <h3>No clothing yet</h3>
                      <p>Add clothes to create an outfit.</p>
                      <button
                        className="button secondary"
                        onClick={() => setUpload(true)}
                      >
                        Add your first piece
                        <Icon name="plus" size={17} />
                      </button>
                    </div>
                  )}
                </div>
                <div className="outfit-description">
                  <div>
                    {outfit.items.length > 0 && <p>{outfit.tips[0]}</p>}
                    {outfit.missing.length > 0 && (
                      <p className="missing-items">
                        Add {outfit.missing.join(', ').toLowerCase()} to
                        complete this look.
                      </p>
                    )}
                  </div>
                  <span className="outfit-count">
                    {outfit.items.length} pieces
                  </span>
                </div>
                <div className="outfit-actions">
                  <button
                    className="button primary"
                    onClick={() => {
                      setVariation((value) => value + 1);
                      toast(
                        'Look refreshed using the best weather-matched pieces available.'
                      );
                    }}
                    disabled={!items.length}
                  >
                    <Icon name="refresh" size={17} />
                    Refresh outfit
                  </button>
                  <button
                    className={`button secondary ${saved ? 'is-saved' : ''}`}
                    onClick={saveLook}
                    disabled={!loaded || !items.length || saved || saving}
                  >
                    <Icon name={saved ? 'check' : 'heart'} size={17} />
                    {saved ? 'Saved' : saving ? 'Saving…' : 'Save outfit'}
                  </button>
                </div>
              </section>
            </div>
            {wardrobeSection()}
          </>
        )}
        {page === 'My wardrobe' && (
          <>
            <div className="page-heading">
              <div>
                <h1>My wardrobe</h1>
              </div>
              <button
                className="button secondary"
                onClick={() => {
                  setDemo((value) => !value);
                  setCategory('All items');
                  setQuery('');
                  setVariation(0);
                }}
              >
                {demo ? 'Show my clothes' : 'Explore sample wardrobe'}
              </button>
            </div>
            {demo && (
              <p className="banner">
                <Icon name="info" size={17} />
                These are sample pieces. Your first upload switches to your
                personal wardrobe.
              </p>
            )}
            {wardrobeSection(true)}
          </>
        )}
        {page === 'Saved outfits' && (
          <>
            <div className="page-heading">
              <div>
                <h1>Saved outfits</h1>
              </div>
            </div>
            {!data.looks.length ? (
              <div className="empty-state">
                <Icon name="heart" size={45} />
                <h2>No saved outfits</h2>
                <p>Save an outfit from Today to find it here.</p>
                <button
                  className="button primary"
                  onClick={() => setPage('Today')}
                >
                  Find today’s outfit
                  <Icon name="arrow" size={18} />
                </button>
              </div>
            ) : (
              <div className="saved-grid">
                {data.looks.map((look) => (
                  <article className="saved-card" key={look.id}>
                    <div className="saved-preview">
                      {look.items.map((item) => (
                        <Garment key={item.id} item={item} />
                      ))}
                    </div>
                    <div className="saved-details">
                      <div>
                        <h3>{look.name}</h3>
                        <p>
                          {new Date(look.date).toLocaleDateString()} ·{' '}
                          {temp(look.temperature)}°{unit}
                          {look.weatherSample ? ' · Example weather' : ''}
                        </p>
                      </div>
                      <button
                        className="icon-button"
                        aria-label={`Delete saved outfit from ${new Date(
                          look.date
                        ).toLocaleDateString()}`}
                        onClick={async () => {
                          try {
                            await persist({
                              ...data,
                              looks: data.looks.filter(
                                (entry) => entry.id !== look.id
                              ),
                            });
                            toast('Saved outfit removed.');
                          } catch {
                            toast('Could not remove the saved outfit.');
                          }
                        }}
                      >
                        <Icon name="trash" size={18} />
                      </button>
                    </div>
                    <p className="saved-piece-names">
                      {look.items.map((item) => item.name).join(' · ')}
                    </p>
                  </article>
                ))}
              </div>
            )}
          </>
        )}
        {page === 'Settings' && (
          <>
            <div className="page-heading">
              <div>
                <h1>Settings</h1>
              </div>
            </div>
            <section className="settings-panel">
              <div>
                <h2>Temperature</h2>
                <p>Choose the unit you use every day.</p>
                <div className="filter-tabs">
                  {['C', 'F'].map((value) => (
                    <button
                      key={value}
                      className={unit === value ? 'selected' : ''}
                      aria-pressed={unit === value}
                      onClick={() => setUnit(value)}
                    >
                      {value === 'C' ? 'Celsius (°C)' : 'Fahrenheit (°F)'}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <h2>Your weather</h2>
                <p>
                  {weather.sample
                    ? 'Currently showing clearly labeled example conditions.'
                    : `Connected to ${weather.location}.`}
                </p>
                <button
                  className="button secondary"
                  disabled={!!weatherStatus}
                  onClick={requestWeather}
                >
                  <Icon name="pin" size={17} />
                  {weatherStatus || 'Use my location'}
                </button>
              </div>
              <div>
                <h2>Storage</h2>
                <p>
                  Photos and saved looks are stored in this browser using local
                  device storage. They aren’t uploaded to a server or synced
                  between devices. Clearing site data removes them.
                </p>
              </div>
              <div>
                <h2>How your outfits come together</h2>
                <p>
                  Thread matches the categories, warmth, and rain suitability
                  you choose with the weather. Outfits use your uploaded photos.
                </p>
              </div>
            </section>
          </>
        )}
      </main>
      {upload && (
        <UploadModal onClose={() => setUpload(false)} onSave={addClothing} />
      )}
      {notice && (
        <div className="toast" role="status">
          <Icon name="check" size={18} />
          {notice}
          <button
            aria-label="Dismiss notification"
            onClick={() => setNotice('')}
          >
            <Icon name="close" size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
export default App;
