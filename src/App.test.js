import { act } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { collection, getDocs } from 'firebase/firestore';
import App from './App';

jest.mock('./helpers/firebase', () => ({
  db: {},
}));

jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  getDocs: jest.fn(),
}));

jest.mock('react-leaflet', () => ({
  MapContainer: ({ children, className }) => (
    <div className={className} data-testid="restaurants-map">
      {children}
    </div>
  ),
  TileLayer: () => null,
  Marker: ({ children }) => <div>{children}</div>,
  Popup: ({ children }) => <div>{children}</div>,
  useMap: () => ({
    fitBounds: jest.fn(),
    setView: jest.fn(),
  }),
}));

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

beforeEach(() => {
  collection.mockImplementation((database, collectionName) => collectionName);
  getDocs.mockImplementation(async (collectionName) => {
    if (collectionName === 'Restaurant') {
      return {
        docs: [
          {
            id: 'restaurant-1',
            data: () => ({
              Name: 'El Celler de Can Roca',
              Location: '[42.017344802603695 N, 2.804903293015759 E]',
            }),
          },
        ],
      };
    }

    return {
      docs: [
        {
          id: 'student-1',
          data: () => ({
            Name: 'Aina Serra',
            PhotoURL: 'https://i.pravatar.cc/320?img=12',
          }),
        },
      ],
    };
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

test('navigates to the students screen', async () => {
  render(<App />);
  await act(async () => {
    await userEvent.click(
      screen.getByRole('button', { name: /visualitzar alumnes/i })
    );
  });

  expect(
    await screen.findByRole('heading', { name: /llistat d'alumnes/i })
  ).toBeInTheDocument();
  expect(await screen.findByText(/aina serra/i)).toBeInTheDocument();
  expect(collection).toHaveBeenCalledWith({}, 'Alumni');
  expect(getDocs).toHaveBeenCalledWith('Alumni');
});

test('navigates to the restaurants screen and returns home from the logo', async () => {
  render(<App />);
  await act(async () => {
    await userEvent.click(
      screen.getByRole('button', { name: /visualitzar restaurants/i })
    );
  });

  expect(
    await screen.findByRole('heading', { name: /^restaurants$/i })
  ).toBeInTheDocument();
  expect(screen.getByTestId('restaurants-map')).toBeInTheDocument();
  expect((await screen.findAllByText(/el celler de can roca/i)).length).toBe(2);
  expect(collection).toHaveBeenCalledWith({}, 'Restaurant');
  expect(getDocs).toHaveBeenCalledWith('Restaurant');

  await act(async () => {
    await userEvent.click(
      screen.getByRole('button', { name: /tornar a la pagina principal/i })
    );
  });

  expect(
    await screen.findByText(/pagina principal en construccio/i)
  ).toBeInTheDocument();
});
