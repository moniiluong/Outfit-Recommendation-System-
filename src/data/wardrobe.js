export const CATEGORIES = [
  'Tops',
  'Bottoms',
  'Dresses',
  'Outerwear',
  'Shoes',
  'Accessories',
];

export const SAMPLE_ITEMS = [
  {
    id: 'sample-1',
    name: 'Everyday cotton tee',
    category: 'Tops',
    warmth: 'Light',
    color: '#dedbcf',
    style: 'tee',
  },
  {
    id: 'sample-2',
    name: 'Relaxed straight jeans',
    category: 'Bottoms',
    warmth: 'Medium',
    color: '#586d80',
    style: 'pants',
  },
  {
    id: 'sample-3',
    name: 'Olive overshirt',
    category: 'Outerwear',
    warmth: 'Medium',
    color: '#7e8164',
    style: 'jacket',
  },
  {
    id: 'sample-4',
    name: 'Classic white sneakers',
    category: 'Shoes',
    warmth: 'Light',
    color: '#e2dfd5',
    style: 'shoes',
  },
  {
    id: 'sample-5',
    name: 'Charcoal knit sweater',
    category: 'Tops',
    warmth: 'Warm',
    color: '#777776',
    style: 'sweater',
  },
  {
    id: 'sample-6',
    name: 'Everyday canvas tote',
    category: 'Accessories',
    warmth: 'Light',
    color: '#b7a58a',
    style: 'bag',
  },
  {
    id: 'sample-7',
    name: 'Sand chinos',
    category: 'Bottoms',
    warmth: 'Light',
    color: '#b9aa91',
    style: 'pants',
  },
  {
    id: 'sample-8',
    name: 'Rain shell',
    category: 'Outerwear',
    warmth: 'Light',
    color: '#656d74',
    style: 'jacket',
    waterproof: true,
  },
].map((item) => ({ ...item, sample: true }));

// Rank only the items passed in. No synthetic garments enter a personal outfit.
export function buildOutfit(items, weather, variation = 0) {
  const temperature = weather?.temperature ?? 18;
  const wet = /rain|drizzle|storm|snow/i.test(weather?.condition || '');
  const target =
    temperature < 12 ? 'Warm' : temperature < 22 ? 'Medium' : 'Light';
  const hasDress = items.some((item) => item.category === 'Dresses');
  const hasSeparates = ['Tops', 'Bottoms'].every((category) =>
    items.some((item) => item.category === category)
  );
  const useDress = hasDress && (!hasSeparates || variation % 2 === 1);
  const categories = useDress
    ? ['Dresses', 'Shoes']
    : ['Tops', 'Bottoms', 'Shoes'];
  if (temperature < 22 || wet) categories.push('Outerwear');
  if (items.some((item) => item.category === 'Accessories'))
    categories.push('Accessories');
  const selected = categories.flatMap((category) => {
    const candidates = items.filter((item) => item.category === category);
    const ranked = candidates
      .map((item) => ({
        item,
        score:
          3 -
          Math.abs(
            ['Light', 'Medium', 'Warm'].indexOf(item.warmth) -
              ['Light', 'Medium', 'Warm'].indexOf(target)
          ) +
          (wet && item.waterproof ? 5 : 0),
      }))
      .sort((a, b) => b.score - a.score);
    if (!ranked.length) return [];
    const best = ranked.filter((entry) => entry.score === ranked[0].score);
    return [best[variation % best.length].item];
  });
  const missing = categories.filter(
    (category) => !selected.some((item) => item.category === category)
  );
  const tips = [];
  if (temperature < 5)
    tips.push('It’s very cold. Choose insulated layers, a hat, and gloves.');
  else if (temperature < 15)
    tips.push('A warmer top and an extra layer will help with the chill.');
  else if (temperature < 22)
    tips.push('An easy extra layer for a cooler start to the day.');
  else tips.push('Keep it light and breathable for the warmer weather.');
  if (wet)
    tips.push(
      'Rain is possible. Bring an umbrella and choose water-resistant shoes.'
    );
  if (
    wet &&
    !selected.some((item) => item.category === 'Outerwear' && item.waterproof)
  )
    tips.push('You don’t have a water-resistant outer layer in this look.');
  if ((weather?.wind || 0) > 25)
    tips.push('It’s windy. A wind-blocking outer layer is a good idea.');
  return { items: selected, missing, tips };
}

export function readWardrobe() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('weatherwear-wardrobe', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('state');
    request.onerror = () =>
      reject(new Error('Browser storage is unavailable.'));
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction('state', 'readonly');
      const get = transaction.objectStore('state').get('wardrobe');
      get.onsuccess = () => resolve(get.result || { items: [], looks: [] });
      get.onerror = () => reject(get.error);
      transaction.oncomplete = () => db.close();
    };
  });
}

export function writeWardrobe(state) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('weatherwear-wardrobe', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('state');
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction('state', 'readwrite');
      transaction.objectStore('state').put(state, 'wardrobe');
      transaction.oncomplete = () => {
        db.close();
        resolve();
      };
      transaction.onerror = () => {
        db.close();
        reject(transaction.error);
      };
    };
  });
}

export function preparePhoto(file) {
  return new Promise((resolve, reject) => {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type))
      return reject(new Error('Choose a JPG, PNG, or WebP image.'));
    if (file.size > 8 * 1024 * 1024)
      return reject(new Error('Please choose an image smaller than 8 MB.'));
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      const scale = Math.min(1, 1000 / Math.max(image.width, image.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(image.width * scale));
      canvas.height = Math.max(1, Math.round(image.height * scale));
      canvas
        .getContext('2d')
        .drawImage(image, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/webp', 0.85));
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('This image could not be read. Please try another.'));
    };
    image.src = url;
  });
}
