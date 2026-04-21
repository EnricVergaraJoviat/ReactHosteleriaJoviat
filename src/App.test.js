import { act } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  createUserWithEmailAndPassword,
  deleteUser,
  getAuth,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore';
import App from './App';
import { copyPlacePhotoToStorage } from 'firebase/functions';
import { deleteObject, getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { deleteApp, initializeApp } from 'firebase/app';

jest.mock('./helpers/firebase', () => ({
  app: { options: { projectId: 'reacthosteleriajoviat' } },
  auth: {},
  db: {},
  functions: {},
  storage: {},
}));

jest.mock('firebase/auth', () => ({
  createUserWithEmailAndPassword: jest.fn(),
  deleteUser: jest.fn(),
  getAuth: jest.fn(),
  onAuthStateChanged: jest.fn(),
  sendPasswordResetEmail: jest.fn(),
  signInWithEmailAndPassword: jest.fn(),
  signOut: jest.fn(),
}));

jest.mock('firebase/firestore', () => ({
  addDoc: jest.fn(),
  collection: jest.fn(),
  deleteDoc: jest.fn(),
  doc: jest.fn(),
  getDocs: jest.fn(),
  serverTimestamp: jest.fn(),
  updateDoc: jest.fn(),
}));

jest.mock('firebase/functions', () => {
  const copyPlacePhotoToStorageMock = jest.fn();

  return {
    copyPlacePhotoToStorage: copyPlacePhotoToStorageMock,
    httpsCallable: jest.fn(() => copyPlacePhotoToStorageMock),
  };
});

jest.mock('firebase/storage', () => ({
  deleteObject: jest.fn(),
  getDownloadURL: jest.fn(),
  ref: jest.fn(),
  uploadBytes: jest.fn(),
}));

jest.mock('firebase/app', () => ({
  deleteApp: jest.fn(),
  initializeApp: jest.fn(),
}));

jest.mock('./assets/icons/add-restaurant.svg', () => {
  const React = require('react');
  return {
    __esModule: true,
    default: 'add-restaurant.svg',
    ReactComponent: (props) => React.createElement('svg', props),
  };
});

jest.mock('./assets/icons/login.svg', () => {
  const React = require('react');
  return {
    __esModule: true,
    default: 'login.svg',
    ReactComponent: (props) => React.createElement('svg', props),
  };
});

jest.mock('./assets/icons/logout.svg', () => {
  const React = require('react');
  return {
    __esModule: true,
    default: 'logout.svg',
    ReactComponent: (props) => React.createElement('svg', props),
  };
});

jest.mock('./assets/icons/restaurants.svg', () => {
  const React = require('react');
  return {
    __esModule: true,
    default: 'restaurants.svg',
    ReactComponent: (props) => React.createElement('svg', props),
  };
});

jest.mock('./assets/icons/search.svg', () => {
  const React = require('react');
  return {
    __esModule: true,
    default: 'search.svg',
    ReactComponent: (props) => React.createElement('svg', props),
  };
});

jest.mock('./assets/icons/student-restaurants.svg', () => {
  const React = require('react');
  return {
    __esModule: true,
    default: 'student-restaurants.svg',
    ReactComponent: (props) => React.createElement('svg', props),
  };
});

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

jest.mock('react-leaflet-markercluster', () => ({
  __esModule: true,
  default: ({ children }) => <div>{children}</div>,
}));

jest.mock('react-leaflet-markercluster/styles', () => ({}), { virtual: true });

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
  Object.defineProperty(URL, 'createObjectURL', {
    writable: true,
    value: jest.fn(),
  });
  Object.defineProperty(URL, 'revokeObjectURL', {
    writable: true,
    value: jest.fn(),
  });
  Object.defineProperty(global, 'fetch', {
    writable: true,
    value: jest.fn(),
  });
});

beforeEach(() => {
  initializeApp.mockReset();
  initializeApp.mockImplementation((options, name) => ({ options, name }));
  deleteApp.mockReset();
  deleteApp.mockResolvedValue();
  URL.createObjectURL.mockReset();
  URL.createObjectURL.mockImplementation((file) => `blob:${file.name}`);
  URL.revokeObjectURL.mockReset();
  createUserWithEmailAndPassword.mockReset();
  createUserWithEmailAndPassword.mockResolvedValue({ user: { uid: 'student-new' } });
  sendPasswordResetEmail.mockReset();
  sendPasswordResetEmail.mockResolvedValue();
  deleteUser.mockReset();
  deleteUser.mockResolvedValue();
  getAuth.mockReset();
  getAuth.mockImplementation((appInstance) => ({ appInstance }));
  onAuthStateChanged.mockImplementation((auth, callback) => {
    callback(null);
    return jest.fn();
  });
  signInWithEmailAndPassword.mockReset();
  signInWithEmailAndPassword.mockImplementation(async (authValue) => {
    if (authValue?.appInstance) {
      return { user: { uid: 'student-1-auth' } };
    }

    return undefined;
  });
  signOut.mockReset();
  signOut.mockResolvedValue();
  addDoc.mockReset();
  updateDoc.mockReset();
  updateDoc.mockResolvedValue();
  deleteDoc.mockReset();
  deleteDoc.mockResolvedValue();
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

    if (collectionName === 'Administrator') {
      return {
        docs: [],
      };
    }

    if (collectionName === 'UserRegistrations') {
      return {
        docs: [],
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
            Password: 'aina-pass',
          }),
        },
        {
          id: 'student-2',
          data: () => ({
            Name: 'Marc Pujol',
            Email: 'marc@joviat.cat',
            Phone: '600456456',
            LinkedIn: 'https://linkedin.com/in/marc-pujol',
            Password: 'marc-pass',
          }),
        },
      ],
    };
  });
  serverTimestamp.mockReturnValue('SERVER_TIMESTAMP');
  ref.mockImplementation((storageValue, path) => ({ storageValue, path }));
  deleteObject.mockReset();
  deleteObject.mockResolvedValue();
  copyPlacePhotoToStorage.mockReset();
  copyPlacePhotoToStorage.mockResolvedValue({
    data: { photoUrl: 'https://storage.example/restaurantes/disfrutar.jpg' },
  });
  fetch.mockReset();
  fetch.mockResolvedValue({
    ok: true,
    blob: async () => new Blob(['restaurant-image'], { type: 'image/jpeg' }),
  });
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

test('allows a visitor to request access from the login dialog', async () => {
  render(<App />);

  await act(async () => {
    await userEvent.click(screen.getByRole('button', { name: /^login$/i }));
  });

  await act(async () => {
    await userEvent.click(screen.getByRole('button', { name: /solicita acceso/i }));
  });

  expect(await screen.findByRole('heading', { name: /solicitar acceso/i })).toBeInTheDocument();

  const emailInputs = screen.getAllByLabelText(/email/i);
  await act(async () => {
    await userEvent.type(emailInputs[emailInputs.length - 1], 'pepito@joviat.cat');
    await userEvent.type(screen.getByLabelText(/nombre y apellidos/i), 'Pepito Perez');
    await userEvent.click(screen.getByRole('button', { name: /solicitar acceso/i }));
  });

  expect(addDoc).toHaveBeenCalledWith('UserRegistrations', {
    Email: 'pepito@joviat.cat',
    Name: 'Pepito Perez',
    createdAt: 'SERVER_TIMESTAMP',
  });
  expect(
    await screen.findByText(/hem registrat la teva sol.licitud d'acces/i)
  ).toBeInTheDocument();
});

test('allows an administrator to accept a pending registration', async () => {
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

    if (collectionName === 'UserRegistrations') {
      return {
        docs: [
          {
            id: 'registration-1',
            data: () => ({
              Email: 'pepito@joviat.cat',
              Name: 'Pepito Perez',
            }),
          },
        ],
      };
    }

    if (collectionName === 'Rest-Alum') {
      return { docs: [] };
    }

    if (collectionName === 'Restaurant') {
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
    await userEvent.click(screen.getByRole('button', { name: /gestionar altes/i }));
  });

  expect(await screen.findByRole('heading', { name: /gestionar altes/i })).toBeInTheDocument();
  expect(screen.getByText(/pepito perez/i)).toBeInTheDocument();
  expect(screen.getByText(/pepito@joviat.cat/i)).toBeInTheDocument();

  await act(async () => {
    await userEvent.click(screen.getByRole('button', { name: /acceptar/i }));
  });

  expect(
    await screen.findByText(/estas segur que vols donar d'alta a pepito perez/i)
  ).toBeInTheDocument();

  await act(async () => {
    await userEvent.click(screen.getByRole('button', { name: /^si$/i }));
  });

  expect(createUserWithEmailAndPassword).toHaveBeenCalledWith(
    expect.objectContaining({ appInstance: expect.any(Object) }),
    'pepito@joviat.cat',
    '1234'
  );
  expect(addDoc).toHaveBeenCalledWith('Alumni', {
    Name: 'Pepito Perez',
    Email: 'pepito@joviat.cat',
    Password: '1234',
    isExAlumni: false,
    createdAt: 'SERVER_TIMESTAMP',
  });
  expect(deleteDoc).toHaveBeenCalledWith({
    id: 'registration-1',
    path: 'UserRegistrations/registration-1',
  });
  expect(await screen.findByText(/s'ha donat d'alta pepito perez/i)).toBeInTheDocument();
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

  const previewImage = screen.getByAltText(/clara font/i);
  expect(previewImage).toHaveAttribute('src', 'blob:clara.png');

  await act(async () => {
    await userEvent.type(screen.getByLabelText(/nom complet/i), ' i Soler');
  });

  expect(screen.getByAltText(/clara font i soler/i)).toHaveAttribute('src', 'blob:clara.png');
  expect(URL.revokeObjectURL).not.toHaveBeenCalledWith('blob:clara.png');

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
  expect(initializeApp).toHaveBeenCalled();
  expect(getAuth).toHaveBeenCalled();
  expect(createUserWithEmailAndPassword).toHaveBeenCalledWith(
    { appInstance: expect.objectContaining({ name: expect.stringMatching(/^student-create-clara@joviat\.cat-/) }) },
    'clara@joviat.cat',
    'securepass'
  );
  expect(signOut).toHaveBeenCalledWith(
    { appInstance: expect.objectContaining({ name: expect.stringMatching(/^student-create-clara@joviat\.cat-/) }) }
  );
  expect(deleteApp).toHaveBeenCalled();
  expect(addDoc).toHaveBeenCalledWith('Alumni', {
    Name: 'Clara Font i Soler',
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
  expect(screen.getByRole('button', { name: /^logout$/i })).toBeInTheDocument();
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

test('paginates the students list in groups of 8 below the search field', async () => {
  getDocs.mockImplementation(async (collectionName) => {
    if (collectionName === 'Restaurant' || collectionName === 'Rest-Alum' || collectionName === 'Administrator' || collectionName === 'UserRegistrations') {
      return { docs: [] };
    }

    if (collectionName === 'Alumni') {
      return {
        docs: Array.from({ length: 10 }, (_, index) => ({
          id: `student-${index + 1}`,
          data: () => ({
            Name: `Alumne ${index + 1}`,
            Email: `alumne${index + 1}@joviat.cat`,
          }),
        })),
      };
    }

    return { docs: [] };
  });

  render(<App />);

  await act(async () => {
    await userEvent.click(
      screen.getByRole('button', { name: /visualitzar alumnes/i })
    );
  });

  const searchInput = await screen.findByLabelText(/cercar alumne/i);
  const pagination = screen.getByRole('navigation', { name: /paginacio d'alumnes/i });

  expect(searchInput.compareDocumentPosition(pagination) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  expect(screen.getByText(/1 a 8 de 10 alumnes/i)).toBeInTheDocument();
  expect(screen.getByText(/^alumne 1$/i)).toBeInTheDocument();
  expect(screen.getByText(/^alumne 8$/i)).toBeInTheDocument();
  expect(screen.queryByText(/^alumne 9$/i)).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: /anar a la pagina 1/i })).toHaveAttribute('aria-current', 'page');

  await act(async () => {
    await userEvent.click(screen.getByRole('button', { name: /pagina seguent/i }));
  });

  expect(await screen.findByText(/9 a 10 de 10 alumnes/i)).toBeInTheDocument();
  expect(screen.getByText(/^alumne 9$/i)).toBeInTheDocument();
  expect(screen.getByText(/^alumne 10$/i)).toBeInTheDocument();
  expect(screen.queryByText(/^alumne 1$/i)).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: /anar a la pagina 2/i })).toHaveAttribute('aria-current', 'page');
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
  expect(screen.getByText(/^alumne$/i)).toBeInTheDocument();
  expect(screen.queryByRole('heading', { name: /^contacte$/i })).not.toBeInTheDocument();
  expect(screen.queryByText(/aina@joviat.cat/i)).not.toBeInTheDocument();
  expect(screen.queryByText(/600123123/i)).not.toBeInTheDocument();
  expect(screen.queryByText(/linkedin.com\/in\/aina-serra/i)).not.toBeInTheDocument();
  expect(screen.getByText(/carrer de can sunyer, 48, girona/i)).toBeInTheDocument();
  expect(screen.getByText(/^actualment$/i)).toBeInTheDocument();
});

test('shows the contact section in the student detail when the user is logged in', async () => {
  let authListener;
  onAuthStateChanged.mockImplementation((auth, callback) => {
    authListener = callback;
    callback(null);
    return jest.fn();
  });
  signInWithEmailAndPassword.mockImplementation(async () => {
    authListener({ email: 'aina@joviat.cat' });
  });
  getDocs.mockImplementation(async (collectionName) => {
    if (collectionName === 'Administrator') {
      return { docs: [] };
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
            Password: 'aina-pass',
          }),
        },
        {
          id: 'student-2',
          data: () => ({
            Name: 'Marc Pujol',
            Email: 'marc@joviat.cat',
            Phone: '600456456',
            LinkedIn: 'https://linkedin.com/in/marc-pujol',
            Password: 'marc-pass',
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
    await userEvent.type(screen.getByLabelText(/email/i), 'aina@joviat.cat');
    await userEvent.type(screen.getByLabelText(/contrasenya/i), '123456');
    await userEvent.click(screen.getByRole('button', { name: /fer login/i }));
  });

  expect(await screen.findByRole('button', { name: /^logout$/i })).toBeInTheDocument();

  await act(async () => {
    await userEvent.click(screen.getByRole('button', { name: /visualitzar alumnes/i }));
  });

  await act(async () => {
    await userEvent.click(
      await screen.findByRole('button', { name: /obrir fitxa de aina serra/i })
    );
  });

  expect(await screen.findByRole('heading', { name: /aina serra/i })).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: /^contacte$/i })).toBeInTheDocument();
  expect(screen.getByText(/aina@joviat.cat/i)).toBeInTheDocument();
  expect(screen.getByText(/600123123/i)).toBeInTheDocument();
  expect(screen.getByText(/linkedin.com\/in\/aina-serra/i)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /^editar$/i })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /^eliminar$/i })).not.toBeInTheDocument();
});

test('does not show edit or delete actions on another student detail for non administrators', async () => {
  let authListener;
  onAuthStateChanged.mockImplementation((auth, callback) => {
    authListener = callback;
    callback(null);
    return jest.fn();
  });
  signInWithEmailAndPassword.mockImplementation(async () => {
    authListener({ email: 'aina@joviat.cat' });
  });
  getDocs.mockImplementation(async (collectionName) => {
    if (collectionName === 'Administrator') {
      return { docs: [] };
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
            Password: 'aina-pass',
          }),
        },
        {
          id: 'student-2',
          data: () => ({
            Name: 'Marc Pujol',
            Email: 'marc@joviat.cat',
            Phone: '600456456',
            LinkedIn: 'https://linkedin.com/in/marc-pujol',
            Password: 'marc-pass',
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
    await userEvent.type(screen.getByLabelText(/email/i), 'aina@joviat.cat');
    await userEvent.type(screen.getByLabelText(/contrasenya/i), '123456');
    await userEvent.click(screen.getByRole('button', { name: /fer login/i }));
  });

  await act(async () => {
    await userEvent.click(screen.getByRole('button', { name: /visualitzar alumnes/i }));
  });

  await act(async () => {
    await userEvent.click(
      await screen.findByRole('button', { name: /obrir fitxa de marc pujol/i })
    );
  });

  expect(await screen.findByRole('heading', { name: /marc pujol/i })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /^editar$/i })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /^eliminar$/i })).not.toBeInTheDocument();
});

test('shows edit and delete actions on the student detail for administrators', async () => {
  let authListener;
  onAuthStateChanged.mockImplementation((auth, callback) => {
    authListener = callback;
    callback(null);
    return jest.fn();
  });
  signInWithEmailAndPassword.mockImplementation(async (authValue) => {
    if (authValue?.appInstance) {
      return { user: { uid: 'student-1-auth' } };
    }

    authListener({ email: 'evergara@joviat.cat' });
    return { user: { uid: 'admin-1' } };
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
              Address: 'Carrer de Can Sunyer, 48, Girona',
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
            Password: 'aina-pass',
            isExAlumni: true,
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

  await act(async () => {
    await userEvent.click(screen.getByRole('button', { name: /visualitzar alumnes/i }));
  });

  await act(async () => {
    await userEvent.click(
      await screen.findByRole('button', { name: /obrir fitxa de aina serra/i })
    );
  });

  expect(await screen.findByRole('button', { name: /^editar$/i })).toBeInTheDocument();
  expect(screen.getByText(/^exalumne$/i)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /^eliminar$/i })).toBeInTheDocument();
});

test('reuses the add student form in edit mode for administrators', async () => {
  let authListener;
  onAuthStateChanged.mockImplementation((auth, callback) => {
    authListener = callback;
    callback(null);
    return jest.fn();
  });
  signInWithEmailAndPassword.mockImplementation(async () => {
    authListener({ email: 'evergara@joviat.cat' });
    return { user: { uid: 'admin-1' } };
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
            Password: 'aina-pass',
            isExAlumni: false,
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

  await act(async () => {
    await userEvent.click(screen.getByRole('button', { name: /visualitzar alumnes/i }));
  });

  await act(async () => {
    await userEvent.click(
      await screen.findByRole('button', { name: /obrir fitxa de aina serra/i })
    );
  });

  await act(async () => {
    await userEvent.click(await screen.findByRole('button', { name: /^editar$/i }));
  });

  expect(await screen.findByRole('heading', { name: /editar alumne/i })).toBeInTheDocument();
  expect(screen.getByLabelText(/nom complet/i)).toHaveValue('Aina Serra');
  expect(screen.getByLabelText(/correu electronic/i)).toHaveValue('aina@joviat.cat');
  expect(screen.getByLabelText(/telefon de contacte/i)).toHaveValue('600123123');
  expect(screen.getByLabelText(/perfil linkedin/i)).toHaveValue('linkedin.com/in/aina-serra');
  expect(screen.queryByLabelText(/contrasenya/i)).not.toBeInTheDocument();
  expect(screen.getByAltText(/aina serra/i)).toHaveAttribute('src', 'https://i.pravatar.cc/320?img=12');
  expect(screen.queryByRole('button', { name: /^eliminar$/i })).not.toBeInTheDocument();

  await act(async () => {
    await userEvent.clear(screen.getByLabelText(/nom complet/i));
    await userEvent.type(screen.getByLabelText(/nom complet/i), 'Aina Serra Rovira');
    await userEvent.clear(screen.getByLabelText(/telefon de contacte/i));
    await userEvent.type(screen.getByLabelText(/telefon de contacte/i), '699111222');
    await userEvent.clear(screen.getByLabelText(/filtrar restaurants pel nom/i));
    await userEvent.type(screen.getByLabelText(/filtrar restaurants pel nom/i), 'Disfr');
    await userEvent.selectOptions(screen.getByLabelText(/^restaurant$/i), 'restaurant-2');
    await userEvent.type(screen.getByLabelText(/^rol$/i), 'Cap de sala');
    const addRestaurantButtons = screen.getAllByRole('button', { name: /afegir restaurant/i });
    await userEvent.click(addRestaurantButtons[addRestaurantButtons.length - 1]);
    await userEvent.click(screen.getByRole('button', { name: /desar canvis/i }));
  });

  expect(updateDoc).toHaveBeenCalledWith(
    { id: 'student-1', path: 'Alumni/student-1' },
    {
      Name: 'Aina Serra Rovira',
      PhotoURL: 'https://i.pravatar.cc/320?img=12',
      Email: 'aina@joviat.cat',
      Phone: '699111222',
      LinkedIn: 'linkedin.com/in/aina-serra',
      isExAlumni: false,
      updatedAt: 'SERVER_TIMESTAMP',
    }
  );
  expect(deleteDoc).toHaveBeenCalledWith({ id: 'relation-1', path: 'Rest-Alum/relation-1' });
  expect(addDoc).toHaveBeenCalledWith('Rest-Alum', {
    id_alumni: { id: 'student-1', path: 'Alumni/student-1' },
    id_restaurant: { id: 'restaurant-2', path: 'Restaurant/restaurant-2' },
    rol: 'Cap de sala',
    current_job: true,
    createdAt: 'SERVER_TIMESTAMP',
  });
});

test('shows the password recovery button only for administrators in edit mode', async () => {
  let authListener;
  onAuthStateChanged.mockImplementation((auth, callback) => {
    authListener = callback;
    callback(null);
    return jest.fn();
  });
  signInWithEmailAndPassword.mockImplementation(async () => {
    authListener({ email: 'evergara@joviat.cat' });
    return { user: { uid: 'admin-1' } };
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
            isExAlumni: false,
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

  await act(async () => {
    await userEvent.click(screen.getByRole('button', { name: /visualitzar alumnes/i }));
  });

  await act(async () => {
    await userEvent.click(
      await screen.findByRole('button', { name: /obrir fitxa de aina serra/i })
    );
  });

  await act(async () => {
    await userEvent.click(await screen.findByRole('button', { name: /^editar$/i }));
  });

  expect(await screen.findByRole('button', { name: /recuperar contrassenya/i })).toBeInTheDocument();

  await act(async () => {
    await userEvent.click(screen.getByRole('button', { name: /recuperar contrassenya/i }));
  });

  expect(sendPasswordResetEmail).toHaveBeenCalledWith({}, 'aina@joviat.cat');
  expect(await screen.findByText(/s'ha enviat el correu per recuperar la contrassenya/i)).toBeInTheDocument();
});

test('does not show the password recovery button for a non administrator editing their own profile', async () => {
  let authListener;
  onAuthStateChanged.mockImplementation((auth, callback) => {
    authListener = callback;
    callback(null);
    return jest.fn();
  });
  signInWithEmailAndPassword.mockImplementation(async () => {
    authListener({ email: 'aina@joviat.cat' });
  });
  getDocs.mockImplementation(async (collectionName) => {
    if (collectionName === 'Administrator') {
      return { docs: [] };
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
            isExAlumni: false,
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
    await userEvent.type(screen.getByLabelText(/email/i), 'aina@joviat.cat');
    await userEvent.type(screen.getByLabelText(/contrasenya/i), '123456');
    await userEvent.click(screen.getByRole('button', { name: /fer login/i }));
  });

  await act(async () => {
    await userEvent.click(screen.getByRole('button', { name: /visualitzar alumnes/i }));
  });

  await act(async () => {
    await userEvent.click(
      await screen.findByRole('button', { name: /obrir fitxa de aina serra/i })
    );
  });

  await act(async () => {
    await userEvent.click(await screen.findByRole('button', { name: /^editar$/i }));
  });

  expect(await screen.findByRole('heading', { name: /editar alumne/i })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /recuperar contrassenya/i })).not.toBeInTheDocument();
});

test('shows editar perfil in the menu for a logged student and opens their own edit form', async () => {
  let authListener;
  onAuthStateChanged.mockImplementation((auth, callback) => {
    authListener = callback;
    callback(null);
    return jest.fn();
  });
  signInWithEmailAndPassword.mockImplementation(async () => {
    authListener({ email: 'aina@joviat.cat' });
  });
  getDocs.mockImplementation(async (collectionName) => {
    if (collectionName === 'Administrator') {
      return { docs: [] };
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
            isExAlumni: false,
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
    await userEvent.type(screen.getByLabelText(/email/i), 'aina@joviat.cat');
    await userEvent.type(screen.getByLabelText(/contrasenya/i), '123456');
    await userEvent.click(screen.getByRole('button', { name: /fer login/i }));
  });

  expect(await screen.findByRole('button', { name: /editar perfil/i })).toBeInTheDocument();

  await act(async () => {
    await userEvent.click(screen.getByRole('button', { name: /editar perfil/i }));
  });

  expect(await screen.findByRole('heading', { name: /editar alumne/i })).toBeInTheDocument();
  expect(screen.getByLabelText(/nom complet/i)).toHaveValue('Aina Serra');
  expect(screen.getByLabelText(/correu electronic/i)).toHaveValue('aina@joviat.cat');
  expect(screen.queryByRole('button', { name: /recuperar contrassenya/i })).not.toBeInTheDocument();
});

test('allows an administrator to delete a student from detail view without leaving the admin session', async () => {
  let authListener;
  onAuthStateChanged.mockImplementation((auth, callback) => {
    authListener = callback;
    callback(null);
    return jest.fn();
  });
  signInWithEmailAndPassword.mockImplementation(async (authValue, email) => {
    if (authValue?.appInstance) {
      return { user: { uid: 'student-1-auth', email } };
    }

    authListener({ email: 'evergara@joviat.cat' });
    return { user: { uid: 'admin-1', email: 'evergara@joviat.cat' } };
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
              id_alumni: { id: 'student-1', path: 'Alumni/student-1' },
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
              Address: 'Carrer de Can Sunyer, 48, Girona',
            }),
          },
          {
            id: 'restaurant-2',
            data: () => ({
              Name: 'Disfrutar',
              Address: 'Carrer de Villarroel, 163, Barcelona',
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
            PhotoURL: 'https://storage.example/alumni/aina.jpg',
            Email: 'aina@joviat.cat',
            Phone: '600123123',
            LinkedIn: 'linkedin.com/in/aina-serra',
            Password: 'aina-pass',
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

  expect(await screen.findByRole('button', { name: /^logout$/i })).toBeInTheDocument();

  await act(async () => {
    await userEvent.click(screen.getByRole('button', { name: /visualitzar alumnes/i }));
  });

  await act(async () => {
    await userEvent.click(
      await screen.findByRole('button', { name: /obrir fitxa de aina serra/i })
    );
  });

  await act(async () => {
    await userEvent.click(await screen.findByRole('button', { name: /^eliminar$/i }));
  });

  expect(await screen.findByRole('alertdialog')).toBeInTheDocument();
  expect(screen.getByText(/s'eliminara la foto de l'alumne/i)).toBeInTheDocument();

  await act(async () => {
    await userEvent.click(screen.getByRole('button', { name: /confirmar eliminacio/i }));
  });

  expect(initializeApp).toHaveBeenCalled();
  expect(getAuth).toHaveBeenCalled();
  expect(signInWithEmailAndPassword).toHaveBeenCalledWith(
    { appInstance: expect.objectContaining({ name: expect.stringMatching(/^student-delete-student-1-/) }) },
    'aina@joviat.cat',
    'aina-pass'
  );
  expect(deleteObject).toHaveBeenCalledWith(
    expect.objectContaining({ path: 'https://storage.example/alumni/aina.jpg' })
  );
  expect(deleteDoc).toHaveBeenCalledWith({ id: 'relation-1', path: 'Rest-Alum/relation-1' });
  expect(deleteDoc).toHaveBeenCalledWith({ id: 'relation-2', path: 'Rest-Alum/relation-2' });
  expect(deleteDoc).toHaveBeenCalledWith({ id: 'student-1', path: 'Alumni/student-1' });
  expect(deleteUser).toHaveBeenCalledWith({ uid: 'student-1-auth', email: 'aina@joviat.cat' });
  expect(deleteApp).toHaveBeenCalled();
  expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  expect(await screen.findByRole('heading', { name: /llistat d'alumnes/i })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /^logout$/i })).toBeInTheDocument();
});

test('opens the restaurant detail card from the restaurants list', async () => {
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
              Website: 'https://celler.com',
              GoogleMapsURL: 'https://maps.google.com/celler',
              PhotoURL: 'https://images.example/celler.jpg',
              Rating: '4.9',
              BusinessStatus: 'OPERATIONAL',
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
          }),
        },
      ],
    };
  });

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
  expect(screen.getByRole('link', { name: /visitar web/i })).toHaveAttribute(
    'href',
    'https://celler.com'
  );
  expect(screen.getByRole('link', { name: /obrir fitxa a google maps/i })).toHaveAttribute(
    'href',
    'https://maps.google.com/celler'
  );
  expect(screen.getByLabelText(/rating 4.9 de 5/i)).toBeInTheDocument();
  expect(screen.getByText(/operatiu/i)).toBeInTheDocument();
  expect(screen.getByText(/cap de partida/i)).toBeInTheDocument();
  expect(screen.getByText(/treballa actualment en aquest restaurant/i)).toBeInTheDocument();
});

test('allows an administrator to delete a restaurant from its detail card', async () => {
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
              id_restaurant: { id: 'restaurant-1', path: 'Restaurant/restaurant-1' },
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
        ],
      };
    }

    return {
      docs: [
        {
          id: 'student-1',
          data: () => ({
            Name: 'Aina Serra',
          }),
        },
        {
          id: 'student-2',
          data: () => ({
            Name: 'Marc Pujol',
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

  await act(async () => {
    await userEvent.click(screen.getByRole('button', { name: /visualitzar restaurants/i }));
  });

  await act(async () => {
    await userEvent.click(
      await screen.findByRole('button', { name: /obrir fitxa de el celler de can roca/i })
    );
  });

  await act(async () => {
    await userEvent.click(await screen.findByRole('button', { name: /^eliminar$/i }));
  });

  expect(await screen.findByRole('alertdialog')).toBeInTheDocument();
  expect(screen.getByText(/rest-alum/i)).toBeInTheDocument();

  await act(async () => {
    await userEvent.click(screen.getByRole('button', { name: /confirmar eliminacio/i }));
  });

  expect(deleteDoc).toHaveBeenCalledWith({ id: 'relation-1', path: 'Rest-Alum/relation-1' });
  expect(deleteDoc).toHaveBeenCalledWith({ id: 'relation-2', path: 'Rest-Alum/relation-2' });
  expect(deleteDoc).toHaveBeenCalledWith({ id: 'restaurant-1', path: 'Restaurant/restaurant-1' });
  expect(await screen.findByRole('heading', { name: /^restaurants$/i })).toBeInTheDocument();
});

test('allows an administrator to edit a restaurant from its detail card using the same form', async () => {
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
              Website: 'https://celler.com',
              GoogleMapsURL: 'https://maps.google.com/celler',
              PhotoURL: 'https://images.example/celler.jpg',
              Rating: '4.9',
              BusinessStatus: 'OPERATIONAL',
              GooglePlaceId: 'place-1',
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

  await act(async () => {
    await userEvent.click(screen.getByRole('button', { name: /visualitzar restaurants/i }));
  });

  await act(async () => {
    await userEvent.click(
      await screen.findByRole('button', { name: /obrir fitxa de el celler de can roca/i })
    );
  });

  await act(async () => {
    await userEvent.click(await screen.findByRole('button', { name: /^editar$/i }));
  });

  expect(await screen.findByRole('heading', { name: /editar restaurant/i })).toBeInTheDocument();
  expect(screen.getByDisplayValue('El Celler de Can Roca')).toBeInTheDocument();

  await act(async () => {
    await userEvent.clear(screen.getByLabelText(/^nom$/i));
    await userEvent.type(screen.getByLabelText(/^nom$/i), 'El Celler Renovat');
    await userEvent.click(screen.getByRole('button', { name: /desar canvis/i }));
  });

  expect(updateDoc).toHaveBeenCalledWith(
    { id: 'restaurant-1', path: 'Restaurant/restaurant-1' },
    expect.objectContaining({
      Name: 'El Celler Renovat',
      updatedAt: 'SERVER_TIMESTAMP',
    })
  );
});

test('copies a new Google Places restaurant photo before saving it', async () => {
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

    if (collectionName === 'Rest-Alum' || collectionName === 'Restaurant') {
      return { docs: [] };
    }

    return {
      docs: [
        {
          id: 'student-1',
          data: () => ({
            Name: 'Aina Serra',
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

  await act(async () => {
    await userEvent.click(screen.getByRole('button', { name: /afegir restaurant/i }));
  });

  expect(await screen.findByRole('heading', { name: /afegir restaurant/i })).toBeInTheDocument();

  await act(async () => {
    await userEvent.type(screen.getByLabelText(/^nom$/i), 'Disfrutar');
    await userEvent.type(screen.getByLabelText(/adreca/i), 'Carrer de Villarroel, 163, Barcelona');
    await userEvent.type(screen.getByLabelText(/foto url/i), 'https://places.example/disfrutar.jpg');
    await userEvent.type(screen.getByLabelText(/google place id/i), 'place-disfrutar');
    await userEvent.click(screen.getByRole('button', { name: /desar restaurant/i }));
  });

  expect(copyPlacePhotoToStorage).toHaveBeenCalledWith({
    photoName: '',
    restaurantName: 'Disfrutar',
    googlePlaceId: 'place-disfrutar',
  });
  expect(addDoc).toHaveBeenCalledWith('Restaurant', expect.objectContaining({
    Name: 'Disfrutar',
    PhotoURL: 'https://storage.example/restaurantes/disfrutar.jpg',
    GooglePlaceId: 'place-disfrutar',
    createdAt: 'SERVER_TIMESTAMP',
  }));
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
  expect(screen.queryByRole('heading', { name: /^contacte$/i })).not.toBeInTheDocument();
  expect(screen.queryByText(/aina@joviat.cat/i)).not.toBeInTheDocument();

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
  expect((await screen.findAllByText(/el celler de can roca/i)).length).toBeGreaterThanOrEqual(2);
  expect((await screen.findAllByText(/1 alumni associat/i)).length).toBeGreaterThanOrEqual(2);
  expect((await screen.findAllByText(/0 alumni associats/i)).length).toBeGreaterThanOrEqual(1);
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

test('shows a richer popup card on restaurant map pins and opens the detail from there', async () => {
  render(<App />);

  await act(async () => {
    await userEvent.click(
      screen.getByRole('button', { name: /visualitzar restaurants/i })
    );
  });

  expect((await screen.findAllByText(/alumnes associats/i)).length).toBeGreaterThan(0);
  expect(screen.getAllByText(/el celler de can roca/i).length).toBeGreaterThan(0);
  expect(screen.getAllByText(/1 alumni associat/i).length).toBeGreaterThan(0);
  expect(screen.getAllByRole('button', { name: /veure detall/i }).length).toBeGreaterThan(0);

  await act(async () => {
    await userEvent.click(screen.getAllByRole('button', { name: /veure detall/i })[0]);
  });

  expect(
    await screen.findByRole('heading', { name: /el celler de can roca/i })
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

test('paginates the restaurants list in groups of 8 below the search field', async () => {
  getDocs.mockImplementation(async (collectionName) => {
    if (collectionName === 'Administrator' || collectionName === 'UserRegistrations') {
      return { docs: [] };
    }

    if (collectionName === 'Restaurant') {
      return {
        docs: Array.from({ length: 10 }, (_, index) => ({
          id: `restaurant-${index + 1}`,
          data: () => ({
            Name: `Restaurant ${index + 1}`,
          }),
        })),
      };
    }

    if (collectionName === 'Alumni' || collectionName === 'Rest-Alum') {
      return { docs: [] };
    }

    return { docs: [] };
  });

  render(<App />);

  await act(async () => {
    await userEvent.click(
      screen.getByRole('button', { name: /visualitzar restaurants/i })
    );
  });

  const searchInput = await screen.findByLabelText(/cercar restaurant/i);
  const pagination = screen.getByRole('navigation', { name: /paginacio de restaurants/i });

  expect(searchInput.compareDocumentPosition(pagination) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  expect(screen.getByText(/1 a 8 de 10 restaurants/i)).toBeInTheDocument();
  expect(screen.getByText(/^restaurant 1$/i)).toBeInTheDocument();
  expect(screen.getByText(/^restaurant 8$/i)).toBeInTheDocument();
  expect(screen.queryByText(/^restaurant 9$/i)).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: /anar a la pagina 1/i })).toHaveAttribute('aria-current', 'page');

  await act(async () => {
    await userEvent.click(screen.getByRole('button', { name: /pagina seguent/i }));
  });

  expect(await screen.findByText(/9 a 10 de 10 restaurants/i)).toBeInTheDocument();
  expect(screen.getByText(/^restaurant 9$/i)).toBeInTheDocument();
  expect(screen.getByText(/^restaurant 10$/i)).toBeInTheDocument();
  expect(screen.queryByText(/^restaurant 1$/i)).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: /anar a la pagina 2/i })).toHaveAttribute('aria-current', 'page');
});
