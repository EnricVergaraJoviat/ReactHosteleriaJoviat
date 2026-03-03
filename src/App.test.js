import { render, screen } from '@testing-library/react';
import App from './App';

beforeAll(() => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query) => ({
      matches: query === '(min-width: 961px)',
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }),
  });
});

test('renders the Joviat home screen', () => {
  render(<App />);
  expect(screen.getByAltText(/logo joviat/i)).toBeInTheDocument();
  expect(screen.getByText(/visualitzar restaurants/i)).toBeInTheDocument();
  expect(screen.getByText(/visualitzar alumnes/i)).toBeInTheDocument();
  expect(
    screen.getByText(/pagina principal en construccio/i)
  ).toBeInTheDocument();
});
