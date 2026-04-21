import { fireEvent, render, screen } from '@testing-library/react';
import SmartImage from './SmartImage';

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

test('student fallback placeholder uses the chef icon asset', () => {
  render(
    <SmartImage
      src=""
      type="student"
      label="Cameron Brown1"
      alt="Cameron Brown1"
    />
  );

  const image = screen.getByAltText(/cameron brown1/i);
  const svgContent = decodeURIComponent(image.getAttribute('src').split(',')[1]);

  expect(image.getAttribute('src')).toMatch(/^data:image\/svg\+xml;charset=UTF-8,/);
  expect(svgContent).toMatch(/scale\(0\.58\)/i);
});
