import React from 'react';
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import '@testing-library/jest-dom';
import UploadModal from './UploadModal';
import { preparePhoto } from '../data/wardrobe';
import apiService from '../services/apiService';

jest.mock('../data/wardrobe', () => ({
  ...jest.requireActual('../data/wardrobe'),
  preparePhoto: jest.fn(),
}));
jest.mock('../services/apiService', () => ({ prepareGarment: jest.fn() }));

const original = 'data:image/webp;base64,original';
const cleaned = 'data:image/png;base64,cleaned';
const result = {
  image: cleaned,
  width: 100,
  height: 150,
  method: 'plain background cleanup',
};
const button = (name) => screen.getByRole('button', { name, hidden: true });
function upload(name = 'shirt.png') {
  fireEvent.change(screen.getByLabelText('Clothing photo'), {
    target: { files: [new File(['photo'], name, { type: 'image/png' })] },
  });
}
async function ready() {
  await waitFor(() => expect(button('Add clothing')).toBeEnabled());
}

beforeEach(() => {
  jest.resetAllMocks();
  HTMLDialogElement.prototype.showModal = jest.fn();
  preparePhoto.mockResolvedValue(original);
  apiService.prepareGarment.mockResolvedValue(result);
  Object.defineProperty(window, 'crypto', {
    configurable: true,
    value: { randomUUID: () => 'test-uuid' },
  });
});

it('automatically cleans a new upload and saves its transparent cutout', async () => {
  const save = jest.fn().mockResolvedValue();
  render(<UploadModal onSave={save} onClose={() => {}} />);
  upload();
  await waitFor(() =>
    expect(apiService.prepareGarment).toHaveBeenCalledWith(
      {
        image: original,
        remove_background: true,
        tolerance: 24,
        outline: [],
      },
      expect.any(AbortSignal)
    )
  );
  await ready();
  expect(screen.getByAltText(/Your clothing preview/)).toHaveAttribute(
    'src',
    cleaned
  );
  fireEvent.click(button('Add clothing'));
  await waitFor(() =>
    expect(save).toHaveBeenCalledWith(
      expect.objectContaining({ image: cleaned })
    )
  );
});

it('lets the user keep the original after comparing versions', async () => {
  const save = jest.fn().mockResolvedValue();
  render(<UploadModal onSave={save} onClose={() => {}} />);
  upload();
  await waitFor(() => expect(button('Original photo')).toBeEnabled());
  fireEvent.click(button('Original photo'));
  expect(screen.getByAltText(/Your clothing preview/)).toHaveAttribute(
    'src',
    original
  );
  fireEvent.click(button('Add clothing'));
  await waitFor(() =>
    expect(save).toHaveBeenCalledWith(
      expect.objectContaining({ image: original })
    )
  );
});

it('keeps original uploads usable when the cleanup server is unavailable', async () => {
  apiService.prepareGarment.mockRejectedValue(
    new Error('The cleanup server is unavailable.')
  );
  const save = jest.fn().mockResolvedValue();
  render(<UploadModal onSave={save} onClose={() => {}} />);
  upload();
  await screen.findByText('The cleanup server is unavailable.');
  await ready();
  fireEvent.click(button('Add clothing'));
  await waitFor(() =>
    expect(save).toHaveBeenCalledWith(
      expect.objectContaining({ image: original })
    )
  );
});

it('requires edited outlines to be applied and never submits the form from cleanup controls', async () => {
  const save = jest.fn();
  render(<UploadModal onSave={save} onClose={() => {}} />);
  upload();
  await waitFor(() => expect(button('Original photo')).toBeEnabled());
  fireEvent.click(screen.getByText('Refine outline'));
  fireEvent.click(screen.getByLabelText('Trace garment outline'));
  expect(button('Apply cleanup')).toBeDisabled();
  expect(button('Add clothing')).toBeDisabled();
  const photo = screen.getByAltText('Trace around your clothing').parentElement;
  photo.getBoundingClientRect = () => ({
    left: 0,
    top: 0,
    width: 100,
    height: 100,
  });
  for (const [x, y] of [
    [10, 10],
    [90, 10],
    [50, 90],
  ])
    fireEvent.click(photo, { clientX: x, clientY: y });
  fireEvent.click(button('Apply cleanup'));
  await ready();
  expect(apiService.prepareGarment).toHaveBeenLastCalledWith(
    expect.objectContaining({
      outline: [
        { x: 0.1, y: 0.1 },
        { x: 0.9, y: 0.1 },
        { x: 0.5, y: 0.9 },
      ],
    }),
    expect.any(AbortSignal)
  );
  expect(save).not.toHaveBeenCalled();
  fireEvent.click(button('Undo point'));
  expect(button('Add clothing')).toBeDisabled();
  fireEvent.click(button('Original photo'));
  expect(button('Add clothing')).toBeEnabled();
});

it('ignores an old cleanup response after a replacement upload', async () => {
  let finishFirst;
  apiService.prepareGarment.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        finishFirst = resolve;
      })
  );
  const save = jest.fn().mockResolvedValue();
  render(<UploadModal onSave={save} onClose={() => {}} />);
  upload();
  await waitFor(() =>
    expect(apiService.prepareGarment).toHaveBeenCalledTimes(1)
  );
  const firstSignal = apiService.prepareGarment.mock.calls[0][1];
  preparePhoto.mockResolvedValue('data:image/webp;base64,replacement');
  upload('replacement.png');
  await waitFor(() =>
    expect(apiService.prepareGarment).toHaveBeenCalledTimes(2)
  );
  await ready();
  expect(firstSignal.aborted).toBe(true);
  await act(async () =>
    finishFirst({ ...result, image: 'data:image/png;base64,stale' })
  );
  expect(screen.getByAltText(/Your clothing preview/)).toHaveAttribute(
    'src',
    cleaned
  );
  fireEvent.click(button('Add clothing'));
  await waitFor(() =>
    expect(save).toHaveBeenCalledWith(
      expect.objectContaining({ image: cleaned })
    )
  );
});

it('cancels cleanup when the upload dialog is unmounted', async () => {
  apiService.prepareGarment.mockImplementation(
    (_payload, signal) =>
      new Promise((_resolve, reject) => {
        signal.addEventListener('abort', () =>
          reject(Object.assign(new Error('Aborted'), { name: 'AbortError' }))
        );
      })
  );
  const { unmount } = render(
    <UploadModal onSave={() => {}} onClose={() => {}} />
  );
  upload();
  await waitFor(() =>
    expect(apiService.prepareGarment).toHaveBeenCalledTimes(1)
  );
  const signal = apiService.prepareGarment.mock.calls[0][1];
  await act(async () => unmount());
  expect(signal.aborted).toBe(true);
});
