import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import SmartImage from './SmartImage';
import alumniFallbackImage from '../../assets/images/Alumni.png';

test('falls back to a generated placeholder when the remote image fails', () => {
  render(
    <SmartImage
      src="https://lh3.googleusercontent.com/example"
      type="restaurant"
      label="Restaurant Prova"
      alt="Restaurant Prova"
    />
  );

  const image = screen.getByAltText(/restaurant prova/i);

  expect(image).toHaveAttribute('src', 'https://lh3.googleusercontent.com/example');
  expect(image).toHaveAttribute('referrerpolicy', 'no-referrer');

  fireEvent.error(image);

  expect(image.getAttribute('src')).toMatch(/^data:image\/svg\+xml;charset=UTF-8,/);
});

test('student fallback placeholder uses the Alumni image asset', () => {
  const { container } = render(
    <SmartImage
      src=""
      type="student"
      label="Cameron Brown1"
      alt="Cameron Brown1"
    />
  );

  const image = screen.getByAltText(/cameron brown1/i);

  expect(image).toHaveAttribute('src', alumniFallbackImage);
  expect(container.querySelector('.smart-image__loader')).not.toBeInTheDocument();
});

test('hides the loader when the browser already has the image loaded', async () => {
  const completeDescriptor = Object.getOwnPropertyDescriptor(
    HTMLImageElement.prototype,
    'complete'
  );
  const naturalWidthDescriptor = Object.getOwnPropertyDescriptor(
    HTMLImageElement.prototype,
    'naturalWidth'
  );

  Object.defineProperty(HTMLImageElement.prototype, 'complete', {
    configurable: true,
    get: () => true,
  });
  Object.defineProperty(HTMLImageElement.prototype, 'naturalWidth', {
    configurable: true,
    get: () => 320,
  });

  const { container } = render(
    <SmartImage
      src="https://images.example/Alumni.jpg"
      type="student"
      label="Aina Serra"
      alt="Aina Serra"
    />
  );

  await waitFor(() => {
    expect(container.querySelector('.smart-image__loader')).not.toBeInTheDocument();
  });

  if (completeDescriptor) {
    Object.defineProperty(HTMLImageElement.prototype, 'complete', completeDescriptor);
  }

  if (naturalWidthDescriptor) {
    Object.defineProperty(HTMLImageElement.prototype, 'naturalWidth', naturalWidthDescriptor);
  }
});
