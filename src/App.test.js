import { act } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import { addDoc, collection, doc, getDocs, serverTimestamp } from 'firebase/firestore';
import App from './App';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';

jest.mock('./helpers/firebase', () => ({
  auth: {},
  db: {},
  storage: {},
}));

jest.mock('firebase/auth', () => ({
  onAuthStateChanged: jest.fn(),
  signInWithEmailAndPassword: jest.fn(),
  signOut: jest.fn(),
}));

jest.mock('firebase/firestore', () => ({
  addDoc: jest.fn(),
  collection: jest.fn(),
  doc: jest.fn(),
  getDocs: jest.fn(),
  serverTimestamp: jest.fn(),
}));

jest.mock('firebase/storage', () => ({
  getDownloadURL: jest.fn(),
  ref: jest.fn(),
  uploadBytes: jest.fn(),
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
  onAuthStateChanged.mockImplementation((auth, callback) => {
    callback(null);
    return jest.fn();
  });
  signInWithEmailAndPassword.mockReset();
  signOut.mockReset();
  addDoc.mockReset();
  collection.mockImplementation((database, collectionName) => collectionName);
  doc.mockImplementation((database, collectionName, documentId) => ({
    id: documentId,
    path: `${collectionName}/${documentId}`,
  }));
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
          {
            id: 'restaurant-3',
            data: () => ({
              Name: 'Can Jubany',
              Location: '[41.818000, 2.282000]',
              Address: 'Calldetenes, Barcelona',
              Phone: '938898102',
              Email: 'info@canjubany.com',
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
  serverTimestamp.mockReturnValue('SERVER_TIMESTAMP');
  ref.mockImplementation((storageValue, path) => ({ storageValue, path }));
  uploadBytes.mockResolvedValue({});
  getDownloadURL.mockResolvedValue('https://storage.example/alumni/nova.jpg');
  addDoc.mockImplementation(async (collectionName) => {
    if (collectionName === 'Alumni') {
      return { id: 'student-new' };
    }

    return { id: `relation-${Math.random().toString(16).slice(2)}` };
  });
});

test('renders the Joviat home screen', () => {
  render(<App />);
  expect(screen.getByAltText(/logo joviat/i)).toBeInTheDocument();
  expect(screen.getByText(/visualitzar restaurants/i)).toBeInTheDocument();
  expect(screen.getByText(/visualitzar alumnes/i)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /^login$/i })).toBeInTheDocument();
  expect(
    screen.getByText(/pagina principal en construccio/i)
  ).toBeInTheDocument();
});

test('shows an error dialog when login fails', async () => {
  signInWithEmailAndPassword.mockRejectedValueOnce({ code: 'auth/wrong-password' });
  render(<App />);

  await act(async () => {
    await userEvent.click(screen.getByRole('button', { name: /^login$/i }));
  });

  await act(async () => {
    await userEvent.type(screen.getByLabelText(/email/i), 'prova@joviat.cat');
    await userEvent.type(screen.getByLabelText(/contrasenya/i), 'incorrecta');
    await userEvent.click(screen.getByRole('button', { name: /fer login/i }));
  });

  expect(await screen.findByRole('alertdialog')).toBeInTheDocument();
  expect(screen.getByText(/email o la contrasenya no son correctes/i)).toBeInTheDocument();
  expect(signInWithEmailAndPassword).toHaveBeenCalledWith({}, 'prova@joviat.cat', 'incorrecta');
});

test('switches from login to logout after a successful login', async () => {
  let authListener;
  onAuthStateChanged.mockImplementation((auth, callback) => {
    authListener = callback;
    callback(null);
    return jest.fn();
  });
  signInWithEmailAndPassword.mockImplementation(async () => {
    authListener({ email: 'prova@joviat.cat' });
  });
  signOut.mockImplementation(async () => {
    authListener(null);
  });

  render(<App />);

  await act(async () => {
    await userEvent.click(screen.getByRole('button', { name: /^login$/i }));
  });

  await act(async () => {
    await userEvent.type(screen.getByLabelText(/email/i), 'prova@joviat.cat');
    await userEvent.type(screen.getByLabelText(/contrasenya/i), '123456');
    await userEvent.click(screen.getByRole('button', { name: /fer login/i }));
  });

  expect(await screen.findByRole('heading', { name: /sessio iniciada/i })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /^logout$/i })).toBeInTheDocument();

  await act(async () => {
    await userEvent.click(screen.getByRole('button', { name: /^logout$/i }));
  });

  expect(
    await screen.findByRole('heading', { name: /vols fer logout\?/i })
  ).toBeInTheDocument();

  await act(async () => {
    await userEvent.click(screen.getByRole('button', { name: /confirmar logout/i }));
  });

  expect(signOut).toHaveBeenCalledWith({});
  expect(await screen.findByRole('button', { name: /^login$/i })).toBeInTheDocument();
});

test('shows administrator options when the logged user exists in Administrator', async () => {
  let authListener;
  onAuthStateChanged.mockImplementation((auth, callback) => {
    authListener = callback;
    callback(null);
    return jest.fn();
  });
  signInWithEmailAndPassword.mockImplementation(async () => {
    authListener({ email: 'evergara@joviat.cat' });
  });
  getDocs.mockImplementation(async (collectionName) => {
    if (collectionName === 'Administrator') {
      return {
        docs: [
          {
            id: 'admin-1',
            data: () => ({
              Email: 'evergara@joviat.cat',
            }),
          },
        ],
      };
    }

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
          {
            id: 'restaurant-3',
            data: () => ({
              Name: 'Can Jubany',
              Location: '[41.818000, 2.282000]',
              Address: 'Calldetenes, Barcelona',
              Phone: '938898102',
              Email: 'info@canjubany.com',
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

  render(<App />);

  await act(async () => {
    await userEvent.click(screen.getByRole('button', { name: /^login$/i }));
  });

  await act(async () => {
    await userEvent.type(screen.getByLabelText(/email/i), 'evergara@joviat.cat');
    await userEvent.type(screen.getByLabelText(/contrasenya/i), '123456');
    await userEvent.click(screen.getByRole('button', { name: /fer login/i }));
  });

  expect(await screen.findByRole('button', { name: /afegir restaurant/i })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /afegir alumne/i })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /gestionar altes/i })).toBeInTheDocument();

  await act(async () => {
    await userEvent.click(screen.getByRole('button', { name: /afegir restaurant/i }));
  });

  expect(await screen.findByRole('heading', { name: /afegir restaurant/i })).toBeInTheDocument();
});

test('does not show administrator options for a logged user outside Administrator', async () => {
  let authListener;
  onAuthStateChanged.mockImplementation((auth, callback) => {
    authListener = callback;
    callback(null);
    return jest.fn();
  });
  signInWithEmailAndPassword.mockImplementation(async () => {
    authListener({ email: 'usuari@joviat.cat' });
  });
  getDocs.mockImplementation(async (collectionName) => {
    if (collectionName === 'Administrator') {
      return {
        docs: [
          {
            id: 'admin-1',
            data: () => ({
              Email: 'evergara@joviat.cat',
            }),
          },
        ],
      };
    }

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
          {
            id: 'restaurant-3',
            data: () => ({
              Name: 'Can Jubany',
              Location: '[41.818000, 2.282000]',
              Address: 'Calldetenes, Barcelona',
              Phone: '938898102',
              Email: 'info@canjubany.com',
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

  render(<App />);

  await act(async () => {
    await userEvent.click(screen.getByRole('button', { name: /^login$/i }));
  });

  await act(async () => {
    await userEvent.type(screen.getByLabelText(/email/i), 'usuari@joviat.cat');
    await userEvent.type(screen.getByLabelText(/contrasenya/i), '123456');
    await userEvent.click(screen.getByRole('button', { name: /fer login/i }));
  });

  expect(await screen.findByRole('button', { name: /^logout$/i })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /afegir restaurant/i })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /afegir alumne/i })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /gestionar altes/i })).not.toBeInTheDocument();
});

test('allows an administrator to add a student with photo and restaurant links', async () => {
  let authListener;
  onAuthStateChanged.mockImplementation((auth, callback) => {
    authListener = callback;
    callback(null);
    return jest.fn();
  });
  signInWithEmailAndPassword.mockImplementation(async () => {
    authListener({ email: 'evergara@joviat.cat' });
  });
  getDocs.mockImplementation(async (collectionName) => {
    if (collectionName === 'Administrator') {
      return {
        docs: [
          {
            id: 'admin-1',
            data: () => ({
              Email: 'evergara@joviat.cat',
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
            }),
          },
          {
            id: 'restaurant-2',
            data: () => ({
              Name: 'Disfrutar',
            }),
          },
        ],
      };
    }

    if (collectionName === 'Rest-Alum') {
      return { docs: [] };
    }

    return { docs: [] };
  });

  render(<App />);

  await act(async () => {
    await userEvent.click(screen.getByRole('button', { name: /^login$/i }));
  });

  await act(async () => {
    await userEvent.type(screen.getByLabelText(/email/i), 'evergara@joviat.cat');
    await userEvent.type(screen.getByLabelText(/contrasenya/i), '123456');
    await userEvent.click(screen.getByRole('button', { name: /fer login/i }));
  });

  await act(async () => {
    await userEvent.click(screen.getByRole('button', { name: /afegir alumne/i }));
  });

  expect(await screen.findByRole('heading', { name: /afegir alumne/i })).toBeInTheDocument();

  await act(async () => {
    await userEvent.type(screen.getByLabelText(/nom complet/i), 'Clara Font');
    await userEvent.selectOptions(screen.getByLabelText(/estat de l'alumne/i), 'exalumne');
    await userEvent.type(screen.getByLabelText(/contrasenya/i), 'securepass');
    await userEvent.type(screen.getByLabelText(/correu electronic/i), 'clara@joviat.cat');
    await userEvent.type(screen.getByLabelText(/telefon de contacte/i), '600777888');
    await userEvent.type(screen.getByLabelText(/perfil linkedin/i), 'https://linkedin.com/in/clara-font');
    await userEvent.type(screen.getByLabelText(/filtrar restaurants pel nom/i), 'Disfru');
  });

  const photoInput = screen.getByLabelText(/^foto$/i);
  const file = new File(['image-content'], 'clara.png', { type: 'image/png' });

  await act(async () => {
    await userEvent.upload(photoInput, file);
  });

  await act(async () => {
    await userEvent.selectOptions(screen.getByLabelText(/^restaurant$/i), 'restaurant-2');
    await userEvent.type(screen.getByLabelText(/^rol$/i), 'Cap de sala');
    await userEvent.click(screen.getByLabelText(/està treballant actualment/i));
    const addRestaurantButtons = screen.getAllByRole('button', { name: /afegir restaurant/i });
    await userEvent.click(addRestaurantButtons[addRestaurantButtons.length - 1]);
    await userEvent.click(screen.getByRole('button', { name: /desar alumne/i }));
  });

  expect(ref).toHaveBeenCalledWith({}, expect.stringMatching(/^alumni\//));
  expect(uploadBytes).toHaveBeenCalledWith(
    expect.objectContaining({ path: expect.stringMatching(/^alumni\//) }),
    file
  );
  expect(getDownloadURL).toHaveBeenCalled();
  expect(addDoc).toHaveBeenCalledWith('Alumni', {
    Name: 'Clara Font',
    PhotoURL: 'https://storage.example/alumni/nova.jpg',
    Email: 'clara@joviat.cat',
    Phone: '600777888',
    LinkedIn: 'https://linkedin.com/in/clara-font',
    Password: 'securepass',
    isExAlumni: true,
    createdAt: 'SERVER_TIMESTAMP',
  });
  expect(addDoc).toHaveBeenCalledWith('Rest-Alum', {
    id_alumni: { id: 'student-new', path: 'Alumni/student-new' },
    id_restaurant: { id: 'restaurant-2', path: 'Restaurant/restaurant-2' },
    rol: 'Cap de sala',
    current_job: false,
    createdAt: 'SERVER_TIMESTAMP',
  });
  expect(await screen.findByText(/s'ha desat correctament/i)).toBeInTheDocument();
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
  expect(await screen.findByText(/0 alumni associats/i)).toBeInTheDocument();
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
