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
    if (collectionName === 'Rest-Alum') {
      return {
      docs: [
        {
          id: 'relation-1',
          data: () => ({
              id_alumni: { id: 'student-1', path: 'Alumni/student-1' },
              id_restaurant: { id: 'restaurant-1', path: 'Restaurant/restaurant-1' },
              current_job: true,
              rol: 'Cap de partida',
            }),
          },
          {
            id: 'relation-2',
            data: () => ({
              id_alumni: { id: 'student-2', path: 'Alumni/student-2' },
              id_restaurant: { id: 'restaurant-2', path: 'Restaurant/restaurant-2' },
              current_job: false,
              rol: 'Auxiliar de cuina',
            }),
          },
        ],
      };
    }

    if (collectionName === 'Restaurant') {
      return {
        docs: [
          {
            id: 'restaurant-1',
            data: () => ({
              Name: 'El Celler de Can Roca',
              Location: '[42.017344802603695 N, 2.804903293015759 E]',
              Address: 'Carrer de Can Sunyer, 48, Girona',
              Phone: '972222157',
              Email: 'info@celler.com',
            }),
          },
          {
            id: 'restaurant-2',
            data: () => ({
              Name: 'Disfrutar',
              Location: '[41.390000, 2.150000]',
              Address: 'Carrer de Villarroel, 163, Barcelona',
              Phone: '931348689',
              Email: 'hola@disfrutar.com',
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
            Email: 'aina@joviat.cat',
            Phone: '600123123',
            LinkedIn: 'linkedin.com/in/aina-serra',
          }),
        },
        {
          id: 'student-2',
          data: () => ({
            Name: 'Marc Pujol',
            Email: 'marc@joviat.cat',
            Phone: '600456456',
            LinkedIn: 'https://linkedin.com/in/marc-pujol',
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
  expect((await screen.findAllByText(/1 restaurant associat/i)).length).toBe(2);
  expect(collection).toHaveBeenCalledWith({}, 'Alumni');
  expect(collection).toHaveBeenCalledWith({}, 'Rest-Alum');
  expect(getDocs).toHaveBeenCalledWith('Alumni');
  expect(getDocs).toHaveBeenCalledWith('Rest-Alum');
});

test('filters students by name and clears the search', async () => {
  render(<App />);
  await act(async () => {
    await userEvent.click(
      screen.getByRole('button', { name: /visualitzar alumnes/i })
    );
  });

  const searchInput = await screen.findByLabelText(/cercar alumne/i);

  await act(async () => {
    await userEvent.type(searchInput, 'aina');
  });

  expect(screen.getByText(/aina serra/i)).toBeInTheDocument();
  expect(screen.queryByText(/marc pujol/i)).not.toBeInTheDocument();

  await act(async () => {
    await userEvent.click(
      screen.getByRole('button', { name: /esborrar cerca d'alumnes/i })
    );
  });

  expect(searchInput).toHaveValue('');
  expect(screen.getByText(/marc pujol/i)).toBeInTheDocument();
});

test('opens the student detail card from the students list', async () => {
  render(<App />);

  await act(async () => {
    await userEvent.click(
      screen.getByRole('button', { name: /visualitzar alumnes/i })
    );
  });

  await act(async () => {
    await userEvent.click(
      await screen.findByRole('button', { name: /obrir fitxa de aina serra/i })
    );
  });

  expect(await screen.findByRole('heading', { name: /aina serra/i })).toBeInTheDocument();
  expect(screen.getByText(/aina@joviat.cat/i)).toBeInTheDocument();
  expect(screen.getByText(/600123123/i)).toBeInTheDocument();
  expect(screen.getByText(/linkedin.com\/in\/aina-serra/i)).toBeInTheDocument();
  expect(screen.getByText(/carrer de can sunyer, 48, girona/i)).toBeInTheDocument();
  expect(screen.getByText(/^actualment$/i)).toBeInTheDocument();
});

test('opens the restaurant detail card from the restaurants list', async () => {
  render(<App />);

  await act(async () => {
    await userEvent.click(
      screen.getByRole('button', { name: /visualitzar restaurants/i })
    );
  });

  await act(async () => {
    await userEvent.click(
      await screen.findByRole('button', { name: /obrir fitxa de el celler de can roca/i })
    );
  });

  expect(
    await screen.findByRole('heading', { name: /el celler de can roca/i })
  ).toBeInTheDocument();
  expect(screen.getByText(/carrer de can sunyer, 48, girona/i)).toBeInTheDocument();
  expect(screen.getByText(/972222157/i)).toBeInTheDocument();
  expect(screen.getByText(/info@celler.com/i)).toBeInTheDocument();
  expect(screen.getByText(/cap de partida/i)).toBeInTheDocument();
  expect(screen.getByText(/^actualment$/i)).toBeInTheDocument();
});

test('opens the restaurant detail card from the student detail', async () => {
  render(<App />);

  await act(async () => {
    await userEvent.click(
      screen.getByRole('button', { name: /visualitzar alumnes/i })
    );
  });

  await act(async () => {
    await userEvent.click(
      await screen.findByRole('button', { name: /obrir fitxa de aina serra/i })
    );
  });

  await act(async () => {
    await userEvent.click(
      await screen.findByRole('button', { name: /obrir fitxa de el celler de can roca/i })
    );
  });

  expect(
    await screen.findByRole('heading', { name: /el celler de can roca/i })
  ).toBeInTheDocument();

  await act(async () => {
    await userEvent.click(screen.getByRole('button', { name: /^tornar$/i }));
  });

  expect(await screen.findByRole('heading', { name: /aina serra/i })).toBeInTheDocument();
});

test('opens the student detail card from the restaurant detail', async () => {
  render(<App />);

  await act(async () => {
    await userEvent.click(
      screen.getByRole('button', { name: /visualitzar restaurants/i })
    );
  });

  await act(async () => {
    await userEvent.click(
      await screen.findByRole('button', { name: /obrir fitxa de el celler de can roca/i })
    );
  });

  await act(async () => {
    await userEvent.click(
      await screen.findByRole('button', { name: /obrir fitxa de aina serra/i })
    );
  });

  expect(await screen.findByRole('heading', { name: /aina serra/i })).toBeInTheDocument();
  expect(screen.getByText(/aina@joviat.cat/i)).toBeInTheDocument();

  await act(async () => {
    await userEvent.click(screen.getByRole('button', { name: /tornar al llistat/i }));
  });

  expect(
    await screen.findByRole('heading', { name: /el celler de can roca/i })
  ).toBeInTheDocument();
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
  expect((await screen.findAllByText(/1 alumni associat/i)).length).toBe(2);
  expect(collection).toHaveBeenCalledWith({}, 'Restaurant');
  expect(collection).toHaveBeenCalledWith({}, 'Rest-Alum');
  expect(getDocs).toHaveBeenCalledWith('Restaurant');
  expect(getDocs).toHaveBeenCalledWith('Rest-Alum');

  await act(async () => {
    await userEvent.click(
      screen.getByRole('button', { name: /tornar a la pagina principal/i })
    );
  });

  expect(
    await screen.findByText(/pagina principal en construccio/i)
  ).toBeInTheDocument();
});

test('filters restaurants by name and clears the search', async () => {
  render(<App />);
  await act(async () => {
    await userEvent.click(
      screen.getByRole('button', { name: /visualitzar restaurants/i })
    );
  });

  const searchInput = await screen.findByLabelText(/cercar restaurant/i);

  await act(async () => {
    await userEvent.type(searchInput, 'disfr');
  });

  expect(screen.getAllByText(/disfrutar/i).length).toBeGreaterThan(0);
  expect(screen.queryByText(/el celler de can roca/i)).not.toBeInTheDocument();

  await act(async () => {
    await userEvent.click(
      screen.getByRole('button', { name: /esborrar cerca de restaurants/i })
    );
  });

  expect(searchInput).toHaveValue('');
  expect(screen.getAllByText(/el celler de can roca/i).length).toBeGreaterThan(0);
});
