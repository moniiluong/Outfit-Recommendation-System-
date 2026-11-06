import { buildOutfit, preparePhoto, SAMPLE_ITEMS } from './wardrobe';

it('only recommends clothing supplied by the user and reports incomplete categories', () => {
  const personal = [
    { id: 'my-tee', name: 'My tee', category: 'Tops', warmth: 'Light' },
  ];
  const result = buildOutfit(personal, { temperature: 25, condition: 'Clear' });
  expect(result.items).toEqual(personal);
  expect(result.missing).toEqual(['Bottoms', 'Shoes']);
});

it('prioritizes warm layers in cold weather', () => {
  const result = buildOutfit(SAMPLE_ITEMS, {
    temperature: 4,
    condition: 'Clouds',
  });
  expect(result.items.find((item) => item.category === 'Tops').warmth).toBe(
    'Warm'
  );
  expect(result.items.some((item) => item.category === 'Outerwear')).toBe(true);
  expect(result.tips.join(' ')).toMatch(/insulated/);
});

it('adds a water-resistant outer layer for rain even when warm', () => {
  const result = buildOutfit(SAMPLE_ITEMS, {
    temperature: 26,
    condition: 'Rain',
  });
  expect(
    result.items.find((item) => item.category === 'Outerwear').waterproof
  ).toBe(true);
  expect(result.tips.join(' ')).toMatch(/umbrella/);
});

it('omits outerwear in hot dry weather and flags missing rain protection', () => {
  expect(
    buildOutfit(SAMPLE_ITEMS, {
      temperature: 28,
      condition: 'Clear',
    }).items.some((item) => item.category === 'Outerwear')
  ).toBe(false);
  const result = buildOutfit(
    SAMPLE_ITEMS.filter((item) => !item.waterproof),
    { temperature: 18, condition: 'Rain' }
  );
  expect(result.tips.join(' ')).toMatch(/don’t have a water-resistant/);
});

it('rotates equally appropriate clothes without inventing missing items', () => {
  const personal = [
    { id: 'a', category: 'Tops', warmth: 'Light' },
    { id: 'b', category: 'Tops', warmth: 'Light' },
  ];
  expect(buildOutfit(personal, { temperature: 25 }, 0).items[0].id).toBe('a');
  expect(buildOutfit(personal, { temperature: 25 }, 1).items[0].id).toBe('b');
  expect(buildOutfit([], { temperature: 18 }).items).toEqual([]);
});

it('rejects unsuitable and oversized photos before decoding', async () => {
  await expect(
    preparePhoto(new File(['hello'], 'file.txt', { type: 'text/plain' }))
  ).rejects.toThrow('JPG');
  await expect(
    preparePhoto({ type: 'image/png', size: 9 * 1024 * 1024 })
  ).rejects.toThrow('8 MB');
});

it('prefers the closest available warmth when the ideal layer is missing', () => {
  const items = [
    { id: 'thin', category: 'Tops', warmth: 'Light' },
    { id: 'thicker', category: 'Tops', warmth: 'Medium' },
  ];
  expect(buildOutfit(items, { temperature: 3 }).items[0].id).toBe('thicker');
});

it('uses a dress as a complete base outfit and still includes shoes and required layers', () => {
  const dress = { id: 'dress', category: 'Dresses', warmth: 'Light' };
  const shoes = { id: 'shoes', category: 'Shoes', warmth: 'Light' };
  const result = buildOutfit([dress, shoes], {
    temperature: 25,
    condition: 'Clear',
  });
  expect(result.items).toEqual([dress, shoes]);
  expect(result.missing).toEqual([]);
  expect(buildOutfit([dress], { temperature: 10 }).missing).toEqual([
    'Shoes',
    'Outerwear',
  ]);
});

it('can rotate between a dress and available separates', () => {
  const items = [
    { id: 'top', category: 'Tops', warmth: 'Light' },
    { id: 'bottoms', category: 'Bottoms', warmth: 'Light' },
    { id: 'dress', category: 'Dresses', warmth: 'Light' },
  ];
  expect(
    buildOutfit(items, { temperature: 25 }, 0).items.map((i) => i.id)
  ).toEqual(['top', 'bottoms']);
  expect(
    buildOutfit(items, { temperature: 25 }, 1).items.map((i) => i.id)
  ).toEqual(['dress']);
});
