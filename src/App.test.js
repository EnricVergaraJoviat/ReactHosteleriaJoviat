import { act } from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  createUserWithEmailAndPassword,
  deleteUser,
  getAuth,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  updatePassword,
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
import {
  copyPlacePhotoToStorage,
  createStudentAccount,
  createUserRegistration,
  deleteStudentAccount,
  getPublicStudentRestaurantGraph,
  httpsCallable,
  resolveGoogleMapsShareLink,
  sendIncidentReportEmail,
  sendLoginPasswordResetEmail,
} from 'firebase/functions';
import { deleteObject, getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { deleteApp, initializeApp } from 'firebase/app';
import { auth } from './helpers/firebase';

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
  updatePassword: jest.fn(),
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
  const createStudentAccountMock = jest.fn();
  const createUserRegistrationMock = jest.fn();
  const deleteStudentAccountMock = jest.fn();
  const getPublicStudentRestaurantGraphMock = jest.fn();
  const resolveGoogleMapsShareLinkMock = jest.fn();
  const sendIncidentReportEmailMock = jest.fn();
  const sendLoginPasswordResetEmailMock = jest.fn();

  return {
    copyPlacePhotoToStorage: copyPlacePhotoToStorageMock,
    createStudentAccount: createStudentAccountMock,
    createUserRegistration: createUserRegistrationMock,
    deleteStudentAccount: deleteStudentAccountMock,
    getPublicStudentRestaurantGraph: getPublicStudentRestaurantGraphMock,
    resolveGoogleMapsShareLink: resolveGoogleMapsShareLinkMock,
    sendIncidentReportEmail: sendIncidentReportEmailMock,
    sendLoginPasswordResetEmail: sendLoginPasswordResetEmailMock,
    httpsCallable: jest.fn((firebaseFunctions, callableName) => {
      if (callableName === 'resolveGoogleMapsShareLink') {
        return resolveGoogleMapsShareLinkMock;
      }

      if (callableName === 'createStudentAccount') {
        return createStudentAccountMock;
      }

      if (callableName === 'createUserRegistration') {
        return createUserRegistrationMock;
      }

      if (callableName === 'deleteStudentAccount') {
        return deleteStudentAccountMock;
      }

      if (callableName === 'getPublicStudentRestaurantGraph') {
        return getPublicStudentRestaurantGraphMock;
      }

      if (callableName === 'sendPasswordResetEmail') {
        return sendLoginPasswordResetEmailMock;
      }

      if (callableName === 'sendIncidentReportEmail') {
        return sendIncidentReportEmailMock;
      }

      return copyPlacePhotoToStorageMock;
    }),
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

jest.mock('./assets/icons/settings.svg', () => {
  const React = require('react');
  return {
    __esModule: true,
    default: 'settings.svg',
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
  window.history.pushState({}, '', '/');
  initializeApp.mockReset();
  initializeApp.mockImplementation((options, name) => ({ options, name }));
  deleteApp.mockReset();
  deleteApp.mockResolvedValue();
  URL.createObjectURL.mockReset();
  URL.createObjectURL.mockImplementation((file) => `blob:${file.name}`);
  URL.revokeObjectURL.mockReset();
  createUserWithEmailAndPassword.mockReset();
  createUserWithEmailAndPassword.mockResolvedValue({ user: { uid: 'student-new' } });
  createStudentAccount.mockReset();
  createStudentAccount.mockResolvedValue({ data: { studentId: 'student-new', emailSent: true } });
  createUserRegistration.mockReset();
  createUserRegistration.mockResolvedValue({ data: { registrationId: 'registration-new' } });
  deleteStudentAccount.mockReset();
  deleteStudentAccount.mockResolvedValue({ data: { deleted: true } });
  getPublicStudentRestaurantGraph.mockReset();
  getPublicStudentRestaurantGraph.mockImplementation(async () => {
    const [studentsSnapshot, restaurantsSnapshot, relationsSnapshot] = await Promise.all([
      getDocs('Alumni'),
      getDocs('Restaurant'),
      getDocs('Rest-Alum'),
    ]);

    return {
      data: {
        students: studentsSnapshot.docs.map((entry) => {
          const privateFields = new Set([
            'Email',
            'Instagram',
            'LinkedIn',
            'Phone',
            'VisibleContactToAlumniNetwork',
            'createdAt',
            'updatedAt',
            'LegalTermsAcceptedAt',
            'Password',
          ]);
          const publicData = Object.fromEntries(
            Object.entries(entry.data()).filter(([key]) => !privateFields.has(key))
          );

          return {
            id: entry.id,
            ...publicData,
          };
        }),
        restaurants: restaurantsSnapshot.docs.map((entry) => ({
          id: entry.id,
          ...entry.data(),
        })),
        relations: relationsSnapshot.docs.map((entry) => ({
          id: entry.id,
          ...entry.data(),
        })),
      },
    };
  });
  sendIncidentReportEmail.mockReset();
  sendIncidentReportEmail.mockResolvedValue({ data: { emailSent: true } });
  sendLoginPasswordResetEmail.mockReset();
  sendLoginPasswordResetEmail.mockResolvedValue({ data: { emailSent: true } });
  httpsCallable.mockReset();
  httpsCallable.mockImplementation((firebaseFunctions, callableName) => {
    if (callableName === 'resolveGoogleMapsShareLink') {
      return resolveGoogleMapsShareLink;
    }

    if (callableName === 'createStudentAccount') {
      return createStudentAccount;
    }

    if (callableName === 'createUserRegistration') {
      return createUserRegistration;
    }

    if (callableName === 'deleteStudentAccount') {
      return deleteStudentAccount;
    }

    if (callableName === 'getPublicStudentRestaurantGraph') {
      return getPublicStudentRestaurantGraph;
    }

    if (callableName === 'sendPasswordResetEmail') {
      return sendLoginPasswordResetEmail;
    }

    if (callableName === 'sendIncidentReportEmail') {
      return sendIncidentReportEmail;
    }

    return copyPlacePhotoToStorage;
  });
  sendPasswordResetEmail.mockReset();
  sendPasswordResetEmail.mockResolvedValue();
  updatePassword.mockReset();
  updatePassword.mockResolvedValue();
  delete auth.currentUser;
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

    if (collectionName === 'UserRegistrations' || collectionName === 'RestaruantsRegistrations') {
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
            Bio: 'Cuinera creativa formada a la Joviat.',
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
  resolveGoogleMapsShareLink.mockReset();
  resolveGoogleMapsShareLink.mockResolvedValue({
    data: {
      googlePlaceId: 'place-can-jubany',
      name: 'Can Jubany',
      address: 'Ctra. de Sant Hilari, s/n, 08506 Calldetenes, Barcelona',
      phone: '+34 938 89 81 02',
      website: 'https://canjubany.com',
      googleMapsUrl: 'https://maps.google.com/?cid=can-jubany',
      photoUrl: '',
      googlePhotoName: 'places/place-can-jubany/photos/1',
      rating: '4.8',
      businessStatus: 'OPERATIONAL',
      latitude: 41.818,
      longitude: 2.282,
    },
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
  expect(screen.getByText(/cicle formatiu hoteleria/i)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /explorar establiments/i })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /explorar Alumni/i })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /registra't/i })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /^login$/i })).toBeInTheDocument();
  expect(
    screen.getByText(/descobreix fins on arriba la xarxa de la joviat/i)
  ).toBeInTheDocument();
});

test('opens the login screen from the login route', () => {
  window.history.pushState({}, '', '/login');

  render(<App />);

  expect(screen.getByRole('heading', { name: /iniciar sessió/i })).toBeInTheDocument();
  expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
});

test('opens the request access dialog from the home register button', async () => {
  render(<App />);

  await act(async () => {
    await userEvent.click(screen.getByRole('button', { name: /registra't/i }));
  });

  expect(await screen.findByRole('heading', { name: /sol·licitar accés/i })).toBeInTheDocument();
  expect(screen.getByLabelText(/nom i cognoms/i)).toBeInTheDocument();
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
  expect(screen.getByText(/email o la contrasenya no són correctes/i)).toBeInTheDocument();
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

  expect(await screen.findByRole('heading', { name: /sessió iniciada/i })).toBeInTheDocument();
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

  expect(await screen.findByRole('button', { name: /afegir establiment/i })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /afegir Alumni/i })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /gestionar altes/i })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /veure trello/i })).toHaveAttribute(
    'href',
    'https://trello.com/b/4CWtinBj/hosteleriajoviat'
  );

  await act(async () => {
    await userEvent.click(screen.getByRole('button', { name: /afegir establiment/i }));
  });

  expect(await screen.findByRole('heading', { name: /afegir establiment/i })).toBeInTheDocument();
});

test('allows a visitor to request access from the login dialog', async () => {
  render(<App />);

  await act(async () => {
    await userEvent.click(screen.getByRole('button', { name: /^login$/i }));
  });

  await act(async () => {
    await userEvent.click(screen.getByRole('button', { name: /sol·licita accés/i }));
  });

  expect(await screen.findByRole('heading', { name: /sol·licitar accés/i })).toBeInTheDocument();

  const emailInputs = screen.getAllByLabelText(/email/i);
  await act(async () => {
    await userEvent.type(emailInputs[emailInputs.length - 1], 'pepito@joviat.cat');
    await userEvent.type(screen.getByLabelText(/nom i cognoms/i), 'Pepito Perez');
    await userEvent.click(screen.getByLabelText(/accepto les condicions legals/i));
    await userEvent.click(screen.getByRole('button', { name: /sol·licitar accés/i }));
  });

  expect(createUserRegistration).toHaveBeenCalledWith({
    email: 'pepito@joviat.cat',
    name: 'Pepito Perez',
    hasAcceptedLegalTerms: true,
  });
  expect(
    await screen.findByText(/s'ha enviat la sol·licitud d'accés/i)
  ).toBeInTheDocument();
  expect(screen.queryByLabelText(/nom i cognoms/i)).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /sol·licitar accés/i })).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: /tancar/i })).toBeInTheDocument();
});

test('allows a visitor to request a password reset from the login dialog', async () => {
  render(<App />);

  await act(async () => {
    await userEvent.click(screen.getByRole('button', { name: /^login$/i }));
  });

  await act(async () => {
    await userEvent.click(screen.getByRole('button', { name: /recupera-la/i }));
  });

  expect(await screen.findByRole('heading', { name: /recuperar contrasenya/i })).toBeInTheDocument();

  const emailInputs = screen.getAllByLabelText(/email/i);
  await act(async () => {
    await userEvent.type(emailInputs[emailInputs.length - 1], 'Aina@Joviat.cat');
    await userEvent.click(screen.getByRole('button', { name: /enviar recuperació/i }));
  });

  await waitFor(() => {
    expect(sendLoginPasswordResetEmail).toHaveBeenCalledWith({ email: 'aina@joviat.cat' });
  });
  expect(
    await screen.findByText(/s'ha enviat el correu per recuperar la contrasenya/i)
  ).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /tancar/i })).toBeInTheDocument();
});

test('warns when password reset email does not exist', async () => {
  sendLoginPasswordResetEmail.mockRejectedValueOnce({ code: 'functions/not-found' });
  render(<App />);

  await act(async () => {
    await userEvent.click(screen.getByRole('button', { name: /^login$/i }));
  });

  await act(async () => {
    await userEvent.click(screen.getByRole('button', { name: /recupera-la/i }));
  });

  const emailInputs = screen.getAllByLabelText(/email/i);
  await act(async () => {
    await userEvent.type(emailInputs[emailInputs.length - 1], 'desconegut@joviat.cat');
    await userEvent.click(screen.getByRole('button', { name: /enviar recuperació/i }));
  });

  expect(
    await screen.findByText(/no existeix cap Alumni amb aquest email/i)
  ).toBeInTheDocument();
  await waitFor(() => {
    expect(sendLoginPasswordResetEmail).toHaveBeenCalledWith({ email: 'desconegut@joviat.cat' });
  });
  expect(screen.getByRole('button', { name: /tornar-ho a provar/i })).toBeInTheDocument();
});

test('warns when requesting access with an existing Alumni email', async () => {
  createUserRegistration.mockRejectedValueOnce({ code: 'functions/already-exists' });

  render(<App />);

  await act(async () => {
    await userEvent.click(screen.getByRole('button', { name: /^login$/i }));
  });

  await act(async () => {
    await userEvent.click(screen.getByRole('button', { name: /sol·licita accés/i }));
  });

  const emailInputs = screen.getAllByLabelText(/email/i);
  await act(async () => {
    await userEvent.type(emailInputs[emailInputs.length - 1], 'aina@joviat.cat');
    await userEvent.type(screen.getByLabelText(/nom i cognoms/i), 'Aina Serra');
    await userEvent.click(screen.getByLabelText(/accepto les condicions legals/i));
    await userEvent.click(screen.getByRole('button', { name: /sol·licitar accés/i }));
  });

  expect(addDoc).not.toHaveBeenCalled();
  expect(
    await screen.findByText(/aquest email ja existeix com a Alumni/i)
  ).toBeInTheDocument();
  expect(screen.queryByLabelText(/nom i cognoms/i)).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: /tancar/i })).toBeInTheDocument();
});

test('warns when requesting access with a pending registration email', async () => {
  createUserRegistration.mockRejectedValueOnce({ code: 'functions/failed-precondition' });

  render(<App />);

  await act(async () => {
    await userEvent.click(screen.getByRole('button', { name: /^login$/i }));
  });

  await act(async () => {
    await userEvent.click(screen.getByRole('button', { name: /sol·licita accés/i }));
  });

  const emailInputs = screen.getAllByLabelText(/email/i);
  await act(async () => {
    await userEvent.type(emailInputs[emailInputs.length - 1], 'pendent@joviat.cat');
    await userEvent.type(screen.getByLabelText(/nom i cognoms/i), 'Usuari Pendent');
    await userEvent.click(screen.getByLabelText(/accepto les condicions legals/i));
    await userEvent.click(screen.getByRole('button', { name: /sol·licitar accés/i }));
  });

  expect(addDoc).not.toHaveBeenCalled();
  expect(
    await screen.findByText(/aquest email ja té una sol·licitud pendent/i)
  ).toBeInTheDocument();
  expect(screen.queryByLabelText(/nom i cognoms/i)).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: /tancar/i })).toBeInTheDocument();
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
              LegalTermsAcceptedAt: {
                toMillis: () => 1719828000000,
              },
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
    await screen.findByText(/estàs segur que vols donar d'alta a pepito perez/i)
  ).toBeInTheDocument();

  let resolveCreateStudentAccount;
  createStudentAccount.mockImplementationOnce(() =>
    new Promise((resolve) => {
      resolveCreateStudentAccount = resolve;
    })
  );

  await act(async () => {
    await userEvent.click(screen.getByRole('button', { name: /^sí$/i }));
  });

  expect(screen.getByText(/processant aquesta acció/i)).toBeInTheDocument();

  expect(createStudentAccount).toHaveBeenCalledWith({
    studentData: {
      Name: 'Pepito Perez',
      Email: 'pepito@joviat.cat',
      LegalTermsAcceptedAtMillis: 1719828000000,
    },
    password: expect.stringMatching(/^[A-Za-z2-9]{12}$/),
    deleteRegistrationId: 'registration-1',
  });

  await act(async () => {
    resolveCreateStudentAccount({ data: { studentId: 'student-new', emailSent: true } });
  });

  expect(await screen.findByText(/s'ha donat d'alta pepito perez/i)).toBeInTheDocument();
});

test('asks for confirmation before canceling a pending registration', async () => {
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

  expect(await screen.findByText(/pepito perez/i)).toBeInTheDocument();

  await act(async () => {
    await userEvent.click(screen.getByRole('button', { name: /cancelar/i }));
  });

  expect(deleteDoc).not.toHaveBeenCalled();
  expect(
    await screen.findByText(/estàs segur que vols cancel·lar la petició d'alta de pepito perez/i)
  ).toBeInTheDocument();

  await act(async () => {
    await userEvent.click(screen.getByRole('button', { name: /cancel·lar petició/i }));
  });

  expect(deleteDoc).toHaveBeenCalledWith({
    id: 'registration-1',
    path: 'UserRegistrations/registration-1',
  });
  expect(
    await screen.findByText(/s'ha cancel·lat la sol·licitud de pepito perez/i)
  ).toBeInTheDocument();
});

test('allows an administrator to review and delete a pending establishment registration', async () => {
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
      return { docs: [] };
    }

    if (collectionName === 'RestaruantsRegistrations') {
      return {
        docs: [
          {
            id: 'restaurant-registration-1',
            data: () => ({
              Name: 'Aina Serra',
              Email: 'aina@joviat.cat',
              GoogleMapsShareUrl: 'https://maps.app.goo.gl/WB8f8HhEWVut69Uy7',
            }),
          },
        ],
      };
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

  await act(async () => {
    await userEvent.click(await screen.findByRole('button', { name: /visualitzar altes establiments/i }));
  });

  expect(await screen.findByText(/aina serra/i)).toBeInTheDocument();
  expect(screen.getByText(/maps.app.goo.gl/i)).toBeInTheDocument();

  await act(async () => {
    await userEvent.click(screen.getByRole('button', { name: /veure petició|ver petición|view request/i }));
  });

  expect(await screen.findByText(/can jubany/i)).toBeInTheDocument();
  expect(resolveGoogleMapsShareLink).toHaveBeenCalledWith({
    url: 'https://maps.app.goo.gl/WB8f8HhEWVut69Uy7',
  });

  await act(async () => {
    await userEvent.click(screen.getByRole('button', { name: /cancel·lar petició/i }));
  });

  expect(deleteDoc).toHaveBeenCalledWith({
    id: 'restaurant-registration-1',
    path: 'RestaruantsRegistrations/restaurant-registration-1',
  });
  expect(await screen.findByText(/s'ha eliminat la petici/i)).toBeInTheDocument();
});

test('warns when accepting a registration whose Alumni email already exists', async () => {
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

    if (collectionName === 'Alumni') {
      return {
        docs: [
          {
            id: 'student-existing',
            data: () => ({
              Email: 'pepito@joviat.cat',
              Name: 'Pepito Perez',
            }),
          },
        ],
      };
    }

    if (collectionName === 'Rest-Alum' || collectionName === 'Restaurant') {
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

  await act(async () => {
    await userEvent.click(await screen.findByRole('button', { name: /acceptar/i }));
  });

  await act(async () => {
    await userEvent.click(await screen.findByRole('button', { name: /^sí$/i }));
  });

  expect(createStudentAccount).not.toHaveBeenCalled();
  expect(addDoc).not.toHaveBeenCalledWith('Alumni', expect.anything());
  expect(await screen.findByText(/aquest usuari ja estava creat/i)).toBeInTheDocument();
  expect(screen.queryByText(/estàs segur que vols donar d'alta/i)).not.toBeInTheDocument();
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
  expect(screen.queryByRole('button', { name: /afegir establiment/i })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /afegir Alumni/i })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /gestionar altes/i })).not.toBeInTheDocument();
  expect(screen.queryByRole('link', { name: /veure trello/i })).not.toBeInTheDocument();
});

test('allows a logged user to report an incident by email', async () => {
  let authListener;
  onAuthStateChanged.mockImplementation((authValue, callback) => {
    authListener = callback;
    callback(null);
    return jest.fn();
  });
  signInWithEmailAndPassword.mockImplementation(async () => {
    const user = { email: 'aina@joviat.cat', uid: 'auth-student-1' };
    auth.currentUser = user;
    authListener(user);
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
    await userEvent.click(await screen.findByRole('button', { name: /reportar incidència/i }));
  });

  expect(await screen.findByRole('dialog', { name: /reportar incidència/i })).toBeInTheDocument();

  await act(async () => {
    await userEvent.type(
      screen.getByLabelText(/^incidència$/i),
      'No puc vincular el meu establiment.'
    );
    await userEvent.click(screen.getByRole('button', { name: /^enviar$/i }));
  });

  expect(sendIncidentReportEmail).toHaveBeenCalledWith({
    alumniName: 'Aina Serra',
    incident: 'No puc vincular el meu establiment.',
  });
  expect(await screen.findByText(/la incidència s'ha enviat correctament/i)).toBeInTheDocument();
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
    await userEvent.click(screen.getByRole('button', { name: /afegir Alumni/i }));
  });

  expect(await screen.findByRole('heading', { name: /afegir Alumni/i })).toBeInTheDocument();

  await act(async () => {
    await userEvent.type(screen.getByLabelText(/nom complet/i), 'Clara Font');
    await userEvent.click(screen.getByRole('button', { name: /selecciona els estudis/i }));
    await userEvent.click(screen.getByLabelText(/CFGM Cuina i gastronomia/i));
    await userEvent.type(screen.getByLabelText(/contrasenya/i), 'securepass');
    await userEvent.type(screen.getByLabelText(/correu electrònic/i), 'clara@joviat.cat');
    await userEvent.type(screen.getByLabelText(/^bio$/i), 'Alumni amb passió per la sala.');
    await userEvent.type(screen.getByLabelText(/telèfon de contacte/i), '600777888');
    await userEvent.type(screen.getByLabelText(/perfil linkedin/i), 'https://linkedin.com/in/clara-font');
    await userEvent.selectOptions(screen.getByLabelText(/any de promoció/i), 'currently-studying');
  });

  await act(async () => {
    const addRestaurantButtons = screen.getAllByRole('button', { name: /afegir establiment/i });
    await userEvent.click(addRestaurantButtons[addRestaurantButtons.length - 1]);
    await userEvent.type(screen.getByLabelText(/filtrar establiments pel nom/i), 'Disfru');
    await userEvent.selectOptions(screen.getByLabelText(/^selecciona un establiment$/i), 'restaurant-2');
    await userEvent.click(screen.getByRole('button', { name: /continuar/i }));
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
    await userEvent.click(screen.getByLabelText(/^professional de sala$/i));
    await userEvent.click(screen.getByLabelText(/està treballant actualment/i));
    const confirmAddRestaurantButtons = screen.getAllByRole('button', { name: /afegir establiment/i });
    await userEvent.click(confirmAddRestaurantButtons[confirmAddRestaurantButtons.length - 1]);
    await userEvent.click(screen.getByRole('button', { name: /desar Alumni/i }));
  });

  expect(ref).toHaveBeenCalledWith({}, expect.stringMatching(/^alumni\//));
  expect(uploadBytes).toHaveBeenCalledWith(
    expect.objectContaining({ path: expect.stringMatching(/^alumni\//) }),
    file
  );
  expect(getDownloadURL).toHaveBeenCalled();
  expect(createStudentAccount).toHaveBeenCalledWith({
    studentData: {
      Name: 'Clara Font i Soler',
      PhotoURL: 'https://storage.example/alumni/nova.jpg',
      Email: 'clara@joviat.cat',
      Bio: 'Alumni amb passió per la sala.',
      Phone: '600777888',
      LinkedIn: 'https://linkedin.com/in/clara-font',
      Instagram: '',
      VisibleContactToAlumniNetwork: true,
      PromotionYear: 'currently-studying',
      JoviatStudies: ['cfgm-cuina-gastronomia-serveis-restauracio'],
    },
    password: 'securepass',
  });
  expect(addDoc).toHaveBeenCalledWith('Rest-Alum', {
    id_alumni: { id: 'student-new', path: 'Alumni/student-new' },
    id_restaurant: { id: 'restaurant-2', path: 'Restaurant/restaurant-2' },
    rol: ['diningRoom'],
    current_job: false,
    createdAt: 'SERVER_TIMESTAMP',
  });
  expect(await screen.findByText(/s'ha desat correctament/i)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /^logout$/i })).toBeInTheDocument();
});

test('shows a specific message when creating a student with an existing email', async () => {
  let authListener;
  onAuthStateChanged.mockImplementation((auth, callback) => {
    authListener = callback;
    callback(null);
    return jest.fn();
  });
  signInWithEmailAndPassword.mockImplementation(async () => {
    authListener({ email: 'evergara@joviat.cat' });
  });
  createStudentAccount.mockRejectedValue({ code: 'functions/already-exists' });
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
      return { docs: [] };
    }

    if (collectionName === 'Alumni' || collectionName === 'Rest-Alum') {
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
    await userEvent.click(await screen.findByRole('button', { name: /afegir Alumni/i }));
  });

  await act(async () => {
    await userEvent.type(screen.getByLabelText(/nom complet/i), 'Aina Serra');
    await userEvent.click(screen.getByRole('button', { name: /selecciona els estudis/i }));
    await userEvent.click(screen.getByLabelText(/CFGM Cuina i gastronomia/i));
    await userEvent.type(screen.getByLabelText(/contrasenya/i), 'securepass');
    await userEvent.type(screen.getByLabelText(/correu electrònic/i), 'aina@joviat.cat');
    await userEvent.click(screen.getByRole('button', { name: /desar Alumni/i }));
  });

  expect(await screen.findByText(/ja hi ha un usuari a la base de dades amb aquest email/i))
    .toBeInTheDocument();
  expect(screen.queryByText(/no s'ha pogut desar l'Alumni/i)).not.toBeInTheDocument();
});

test('navigates to the students screen', async () => {
  render(<App />);
  await act(async () => {
    await userEvent.click(
      screen.getByRole('button', { name: /^Alumni$/i })
    );
  });

  expect(
    await screen.findByRole('heading', { name: /llistat d'Alumni/i })
  ).toBeInTheDocument();
  expect(await screen.findByText(/aina serra/i)).toBeInTheDocument();
  expect((await screen.findAllByText(/1 establiment associat/i)).length).toBe(2);
  expect(getPublicStudentRestaurantGraph).toHaveBeenCalledWith();
});

test('filters students by name and clears the search', async () => {
  render(<App />);
  await act(async () => {
    await userEvent.click(
      screen.getByRole('button', { name: /^Alumni$/i })
    );
  });

  const searchInput = await screen.findByLabelText(/cercar Alumni/i);

  await act(async () => {
    await userEvent.type(searchInput, 'aina');
  });

  expect(screen.getByText(/aina serra/i)).toBeInTheDocument();
  expect(screen.queryByText(/marc pujol/i)).not.toBeInTheDocument();

  await act(async () => {
    await userEvent.click(
      screen.getByRole('button', { name: /esborrar cerca d'Alumni/i })
    );
  });

  expect(searchInput).toHaveValue('');
  expect(screen.getByText(/marc pujol/i)).toBeInTheDocument();
});

test('filters students by professional profile and lets you select or clear all professional profiles', async () => {
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
              rol: 'owner',
            }),
          },
          {
            id: 'relation-2',
            data: () => ({
              id_alumni: { id: 'student-2', path: 'Alumni/student-2' },
              id_restaurant: { id: 'restaurant-2', path: 'Restaurant/restaurant-2' },
              current_job: false,
              rol: 'teacher',
            }),
          },
        ],
      };
    }

    if (collectionName === 'Restaurant') {
      return {
        docs: [
          { id: 'restaurant-1', data: () => ({ Name: 'El Celler de Can Roca' }) },
          { id: 'restaurant-2', data: () => ({ Name: 'Disfrutar' }) },
        ],
      };
    }

    if (collectionName === 'Administrator' || collectionName === 'UserRegistrations' || collectionName === 'RestaruantsRegistrations') {
      return { docs: [] };
    }

    return {
      docs: [
        { id: 'student-1', data: () => ({ Name: 'Aina Serra', Email: 'aina@joviat.cat' }) },
        { id: 'student-2', data: () => ({ Name: 'Marc Pujol', Email: 'marc@joviat.cat' }) },
      ],
    };
  });

  render(<App />);

  await act(async () => {
    await userEvent.click(
      screen.getByRole('button', { name: /^Alumni$/i })
    );
  });

  await screen.findByText(/aina serra/i);

  await act(async () => {
    await userEvent.click(screen.getByRole('button', { name: /^perfil professional$/i }));
  });

  await act(async () => {
    await userEvent.click(screen.getByLabelText(/propietari\/a/i));
  });

  expect(screen.getByText(/aina serra/i)).toBeInTheDocument();
  expect(screen.queryByText(/marc pujol/i)).not.toBeInTheDocument();

  await act(async () => {
    await userEvent.click(screen.getByRole('button', { name: /treure tots els perfils professionals/i }));
  });

  expect(screen.getByText(/aina serra/i)).toBeInTheDocument();
  expect(screen.getByText(/marc pujol/i)).toBeInTheDocument();

  await act(async () => {
    await userEvent.click(screen.getByRole('button', { name: /seleccionar tots els perfils professionals/i }));
  });

  expect(screen.getByLabelText(/comercial/i)).toBeChecked();
  expect(screen.getByLabelText(/docència/i)).toBeChecked();
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
            Name: `Alumni ${index + 1}`,
            Email: `Alumni${index + 1}@joviat.cat`,
          }),
        })),
      };
    }

    return { docs: [] };
  });

  render(<App />);

  await act(async () => {
    await userEvent.click(
      screen.getByRole('button', { name: /^Alumni$/i })
    );
  });

  const searchInput = await screen.findByLabelText(/cercar Alumni/i);
  const pagination = screen.getByRole('navigation', {
    name: /paginació d'Alumni (superior|list\.topPagination)/i,
  });
  const bottomPagination = screen.getByRole('navigation', {
    name: /paginació d'Alumni (inferior|list\.bottomPagination)/i,
  });

  expect(searchInput.compareDocumentPosition(pagination) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  expect(within(pagination).getByText(/1 a 8 de 10 Alumni/i)).toBeInTheDocument();
  expect(within(bottomPagination).getByText(/1 a 8 de 10 Alumni/i)).toBeInTheDocument();
  expect(screen.getByText(/^Alumni 1$/i)).toBeInTheDocument();
  expect(screen.getByText(/^Alumni 8$/i)).toBeInTheDocument();
  expect(screen.queryByText(/^Alumni 9$/i)).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: /anar a la pàgina 1 superior/i })).toHaveAttribute('aria-current', 'page');

  await act(async () => {
    await userEvent.click(screen.getByRole('button', { name: /pàgina següent superior/i }));
  });

  expect(await screen.findByText(/9 a 10 de 10 Alumni/i)).toBeInTheDocument();
  expect(screen.getByText(/^Alumni 9$/i)).toBeInTheDocument();
  expect(screen.getByText(/^Alumni 10$/i)).toBeInTheDocument();
  expect(screen.queryByText(/^Alumni 1$/i)).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: /anar a la pàgina 2 superior/i })).toHaveAttribute('aria-current', 'page');
});

test('opens the student detail card from the students list', async () => {
  render(<App />);

  await act(async () => {
    await userEvent.click(
      screen.getByRole('button', { name: /^Alumni$/i })
    );
  });

  await act(async () => {
    await userEvent.click(
      await screen.findByRole('button', { name: /obrir fitxa de aina serra/i })
    );
  });

  expect(await screen.findByRole('heading', { name: /aina serra/i })).toBeInTheDocument();
  expect(screen.getByText(/fitxa d'Alumni/i)).toBeInTheDocument();
  expect(screen.getByText(/cuinera creativa formada a la joviat/i)).toBeInTheDocument();
  expect(screen.queryByRole('heading', { name: /^contacte$/i })).not.toBeInTheDocument();
  expect(screen.queryByText(/aina@joviat.cat/i)).not.toBeInTheDocument();
  expect(screen.queryByText(/600123123/i)).not.toBeInTheDocument();
  expect(screen.queryByText(/linkedin.com\/in\/aina-serra/i)).not.toBeInTheDocument();
  expect(screen.getByText(/^girona$/i)).toBeInTheDocument();
  expect(screen.queryByText(/carrer de can sunyer/i)).not.toBeInTheDocument();
  expect(screen.getByText(/^treballa actualment$/i)).toBeInTheDocument();
});

test('returns to the students list when using browser back from a student detail', async () => {
  render(<App />);

  await act(async () => {
    await userEvent.click(
      screen.getByRole('button', { name: /^Alumni$/i })
    );
  });

  await act(async () => {
    await userEvent.click(
      await screen.findByRole('button', { name: /obrir fitxa de aina serra/i })
    );
  });

  expect(await screen.findByRole('heading', { name: /aina serra/i })).toBeInTheDocument();

  await act(async () => {
    window.history.back();
  });

  expect(
    await screen.findByRole('heading', { name: /llistat d'Alumni/i })
  ).toBeInTheDocument();
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
            Bio: 'Cuinera creativa formada a la Joviat.',
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
    await userEvent.click(screen.getByRole('button', { name: /^Alumni$/i }));
  });

  await act(async () => {
    await userEvent.click(
      await screen.findByRole('button', { name: /obrir fitxa de aina serra/i })
    );
  });

  expect(await screen.findByRole('heading', { name: /aina serra/i })).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: /^contacte$/i })).toBeInTheDocument();
  expect(screen.getAllByText(/aina@joviat.cat/i).length).toBeGreaterThanOrEqual(1);
  expect(screen.getByText(/600123123/i)).toBeInTheDocument();
  expect(screen.queryByText(/linkedin.com\/in\/aina-serra/i)).not.toBeInTheDocument();
  expect(screen.getByRole('link', { name: /url/i })).toHaveAttribute(
    'href',
    'https://linkedin.com/in/aina-serra'
  );
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
    await userEvent.click(screen.getByRole('button', { name: /^Alumni$/i }));
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
            Bio: 'Cuinera creativa formada a la Joviat.',
            Phone: '600123123',
            LinkedIn: 'linkedin.com/in/aina-serra',
            Password: 'aina-pass',
            JoviatStudies: ['cfgm-cuina-gastronomia-serveis-restauracio'],
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
    await userEvent.click(screen.getByRole('button', { name: /^Alumni$/i }));
  });

  await act(async () => {
    await userEvent.click(
      await screen.findByRole('button', { name: /obrir fitxa de aina serra/i })
    );
  });

  expect(await screen.findByRole('button', { name: /^editar$/i })).toBeInTheDocument();
  expect(screen.getByText(/CFGM Cuina i gastronomia/i)).toBeInTheDocument();
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
            Bio: 'Cuinera creativa formada a la Joviat.',
            Phone: '600123123',
            LinkedIn: 'linkedin.com/in/aina-serra',
            Password: 'aina-pass',
            JoviatStudies: ['cfgm-cuina-gastronomia-serveis-restauracio'],
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
    await userEvent.click(screen.getByRole('button', { name: /^Alumni$/i }));
  });

  await act(async () => {
    await userEvent.click(
      await screen.findByRole('button', { name: /obrir fitxa de aina serra/i })
    );
  });

  await act(async () => {
    await userEvent.click(await screen.findByRole('button', { name: /^editar$/i }));
  });

  expect(await screen.findByRole('heading', { name: /editar Alumni/i })).toBeInTheDocument();
  expect(screen.getByLabelText(/nom complet/i)).toHaveValue('Aina Serra');
  expect(screen.getByLabelText(/^bio$/i)).toHaveValue('Cuinera creativa formada a la Joviat.');
  expect(screen.getByLabelText(/correu electrònic/i)).toHaveValue('aina@joviat.cat');
  expect(screen.getByLabelText(/telèfon de contacte/i)).toHaveValue('600123123');
  expect(screen.getByLabelText(/perfil linkedin/i)).toHaveValue('linkedin.com/in/aina-serra');
  expect(screen.queryByLabelText(/contrasenya/i)).not.toBeInTheDocument();
  expect(screen.getByAltText(/aina serra/i)).toHaveAttribute('src', 'https://i.pravatar.cc/320?img=12');
  expect(screen.getByRole('button', { name: /^editar$/i })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /^eliminar$/i })).toBeInTheDocument();

  await act(async () => {
    await userEvent.clear(screen.getByLabelText(/nom complet/i));
    await userEvent.type(screen.getByLabelText(/nom complet/i), 'Aina Serra Rovira');
    await userEvent.clear(screen.getByLabelText(/^bio$/i));
    await userEvent.type(screen.getByLabelText(/^bio$/i), 'Cap de cuina amb experiència internacional.');
    await userEvent.clear(screen.getByLabelText(/telèfon de contacte/i));
    await userEvent.type(screen.getByLabelText(/telèfon de contacte/i), '699111222');
  });

  await act(async () => {
    const addRestaurantButtons = screen.getAllByRole('button', { name: /afegir establiment/i });
    await userEvent.click(addRestaurantButtons[addRestaurantButtons.length - 1]);
    await userEvent.clear(screen.getByLabelText(/filtrar establiments pel nom/i));
    await userEvent.type(screen.getByLabelText(/filtrar establiments pel nom/i), 'Disfr');
    await userEvent.selectOptions(screen.getByLabelText(/^selecciona un establiment$/i), 'restaurant-2');
    await userEvent.click(screen.getByRole('button', { name: /continuar/i }));
    await userEvent.click(screen.getByLabelText(/^professional de sala$/i));
    const confirmAddRestaurantButtons = screen.getAllByRole('button', { name: /afegir establiment/i });
    await userEvent.click(confirmAddRestaurantButtons[confirmAddRestaurantButtons.length - 1]);
    await userEvent.click(screen.getByRole('button', { name: /desar canvis/i }));
    expect(screen.getByRole('heading', { name: /vols desar els canvis/i })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /sí, desar els canvis/i }));
  });

  expect(updateDoc).toHaveBeenCalledWith(
    { id: 'student-1', path: 'Alumni/student-1' },
    {
      Name: 'Aina Serra Rovira',
      PhotoURL: 'https://i.pravatar.cc/320?img=12',
      Email: 'aina@joviat.cat',
      Bio: 'Cap de cuina amb experiència internacional.',
      Phone: '699111222',
      LinkedIn: 'linkedin.com/in/aina-serra',
      Instagram: '',
      VisibleContactToAlumniNetwork: true,
      PromotionYear: '',
      JoviatStudies: ['cfgm-cuina-gastronomia-serveis-restauracio'],
      updatedAt: 'SERVER_TIMESTAMP',
    }
  );
  expect(deleteDoc).toHaveBeenCalledWith({ id: 'relation-1', path: 'Rest-Alum/relation-1' });
  expect(addDoc).toHaveBeenCalledWith('Rest-Alum', {
    id_alumni: { id: 'student-1', path: 'Alumni/student-1' },
    id_restaurant: { id: 'restaurant-2', path: 'Restaurant/restaurant-2' },
    rol: ['diningRoom'],
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
            JoviatStudies: ['cfgm-cuina-gastronomia-serveis-restauracio'],
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
    await userEvent.click(screen.getByRole('button', { name: /^Alumni$/i }));
  });

  await act(async () => {
    await userEvent.click(
      await screen.findByRole('button', { name: /obrir fitxa de aina serra/i })
    );
  });

  await act(async () => {
    await userEvent.click(await screen.findByRole('button', { name: /^editar$/i }));
  });

  expect(await screen.findByRole('button', { name: /recuperar contrasenya/i })).toBeInTheDocument();

  await act(async () => {
    await userEvent.click(screen.getByRole('button', { name: /recuperar contrasenya/i }));
  });

  expect(sendPasswordResetEmail).toHaveBeenCalledWith({}, 'aina@joviat.cat');
  expect(await screen.findByText(/s'ha enviat el correu per recuperar la contrasenya/i)).toBeInTheDocument();
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
            JoviatStudies: ['cfgm-cuina-gastronomia-serveis-restauracio'],
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
    await userEvent.click(screen.getByRole('button', { name: /^Alumni$/i }));
  });

  await act(async () => {
    await userEvent.click(
      await screen.findByRole('button', { name: /obrir fitxa de aina serra/i })
    );
  });

  await act(async () => {
    await userEvent.click(await screen.findByRole('button', { name: /^editar$/i }));
  });

  expect(await screen.findByRole('heading', { name: /editar Alumni/i })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /recuperar contrasenya/i })).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: /modificar password/i })).toBeInTheDocument();
});

test('opens the logged student edit form from the header avatar', async () => {
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
            JoviatStudies: ['cfgm-cuina-gastronomia-serveis-restauracio'],
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

  expect(await screen.findByRole('button', { name: /obrir la meva fitxa/i })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /editar perfil/i })).toBeInTheDocument();

  await act(async () => {
    await userEvent.click(screen.getByRole('button', { name: /obrir la meva fitxa/i }));
  });

  expect(await screen.findByRole('heading', { name: /editar Alumni/i })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /editar perfil/i })).toHaveClass('sidebar__link--active');
  expect(screen.getByRole('button', { name: /^Alumni$/i })).not.toHaveClass('sidebar__link--active');
  expect(screen.getByRole('button', { name: /^establiments$/i })).not.toHaveClass('sidebar__link--active');
  expect(screen.getByLabelText(/nom complet/i)).toHaveValue('Aina Serra');
  expect(screen.getByLabelText(/correu electrònic/i)).toHaveValue('aina@joviat.cat');
  expect(screen.getByAltText(/aina serra/i)).toHaveAttribute(
    'src',
    'https://i.pravatar.cc/320?img=12'
  );
  expect(screen.queryByRole('button', { name: /recuperar contrasenya/i })).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: /modificar password/i })).toBeInTheDocument();

  await act(async () => {
    await userEvent.click(screen.getByRole('button', { name: /donar d'alta establiment/i }));
  });

  await act(async () => {
    await userEvent.type(
      screen.getByLabelText(/enllaç de google maps/i),
      'https://maps.app.goo.gl/la-fonda'
    );
    await userEvent.click(screen.getByRole('button', { name: /enviar petici/i }));
  });

  expect(resolveGoogleMapsShareLink).toHaveBeenCalledWith({
    url: 'https://maps.app.goo.gl/la-fonda',
  });
  expect(addDoc).toHaveBeenCalledWith('RestaruantsRegistrations', {
    Name: 'Aina Serra',
    Email: 'aina@joviat.cat',
    Description: '',
    GoogleMapsShareUrl: 'https://maps.app.goo.gl/la-fonda',
    id_alumni: { id: 'student-1', path: 'Alumni/student-1' },
    createdAt: 'SERVER_TIMESTAMP',
  });
  expect(
    await screen.findByRole('dialog', { name: /petició enviada/i })
  ).toBeInTheDocument();
  expect(
    screen.getByText(/rebràs un correu electrònic/i)
  ).toBeInTheDocument();

  await act(async () => {
    await userEvent.click(screen.getByRole('button', { name: /acceptar/i }));
  });

  expect(
    screen.queryByRole('dialog', { name: /petició enviada/i })
  ).not.toBeInTheDocument();
});

test('warns a logged student when requested restaurant already exists', async () => {
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
      return { docs: [] };
    }

    if (collectionName === 'Restaurant') {
      return {
        docs: [
          {
            id: 'restaurant-1',
            data: () => ({
              Name: 'Can Jubany',
              Address: 'Ctra. de Sant Hilari, s/n, 08506 Calldetenes, Barcelona',
              GooglePlaceId: 'place-can-jubany',
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
            JoviatStudies: ['cfgm-cuina-gastronomia-serveis-restauracio'],
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
    await userEvent.click(await screen.findByRole('button', { name: /obrir la meva fitxa/i }));
  });

  await act(async () => {
    await userEvent.click(screen.getByRole('button', { name: /donar d'alta establiment/i }));
  });

  await act(async () => {
    await userEvent.type(
      screen.getByLabelText(/enllaç de google maps/i),
      'https://maps.app.goo.gl/can-jubany'
    );
    await userEvent.click(screen.getByRole('button', { name: /enviar petici/i }));
  });

  expect(resolveGoogleMapsShareLink).toHaveBeenCalledWith({
    url: 'https://maps.app.goo.gl/can-jubany',
  });
  expect(addDoc).not.toHaveBeenCalledWith(
    'RestaruantsRegistrations',
    expect.any(Object)
  );
  expect(
    await screen.findByText(/aquest establiment ja existeix a la base de dades com a can jubany/i)
  ).toBeInTheDocument();
  expect(
    screen.queryByRole('dialog', { name: /petició enviada/i })
  ).not.toBeInTheDocument();
});

test('allows a logged student to change their password from editar perfil', async () => {
  let authListener;
  onAuthStateChanged.mockImplementation((authValue, callback) => {
    authListener = callback;
    callback(null);
    return jest.fn();
  });
  signInWithEmailAndPassword.mockImplementation(async () => {
    const user = { email: 'aina@joviat.cat', uid: 'auth-student-1' };
    auth.currentUser = user;
    authListener(user);
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
    await userEvent.click((await screen.findAllByRole('button', { name: /editar perfil/i }))[0]);
  });

  await act(async () => {
    await userEvent.type(screen.getByLabelText(/^nou password$/i), 'noupass123');
    await userEvent.type(screen.getByLabelText(/^repetir password$/i), 'noupass123');
    await userEvent.click(screen.getByRole('button', { name: /modificar password/i }));
  });

  expect(updatePassword).toHaveBeenCalledWith(
    { email: 'aina@joviat.cat', uid: 'auth-student-1' },
    'noupass123'
  );
  expect(updateDoc).toHaveBeenCalledWith(
    { id: 'student-1', path: 'Alumni/student-1' },
    {
      updatedAt: 'SERVER_TIMESTAMP',
    }
  );
  expect(await screen.findByText(/password modificat correctament/i)).toBeInTheDocument();
});

test('does not change the student password when both password fields do not match', async () => {
  let authListener;
  onAuthStateChanged.mockImplementation((authValue, callback) => {
    authListener = callback;
    callback(null);
    return jest.fn();
  });
  signInWithEmailAndPassword.mockImplementation(async () => {
    const user = { email: 'aina@joviat.cat', uid: 'auth-student-1' };
    auth.currentUser = user;
    authListener(user);
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
    await userEvent.click((await screen.findAllByRole('button', { name: /editar perfil/i }))[0]);
  });

  const passwordInput = screen.getByLabelText(/^nou password$/i);

  await act(async () => {
    await userEvent.type(passwordInput, 'noupass123');
    await userEvent.type(screen.getByLabelText(/^repetir password$/i), 'diferent123');
    await userEvent.click(screen.getByRole('button', { name: /modificar password/i }));
  });

  expect(updatePassword).not.toHaveBeenCalled();
  expect(screen.getByText(/els passwords no coincideixen/i)).toBeInTheDocument();

  await act(async () => {
    await userEvent.click(screen.getByRole('button', { name: /^mostrar password$/i }));
  });

  expect(passwordInput).toHaveAttribute('type', 'text');
});

test('allows a logged student to delete their own profile from editar perfil', async () => {
  let authListener;
  onAuthStateChanged.mockImplementation((authValue, callback) => {
    authListener = callback;
    callback(null);
    return jest.fn();
  });
  signInWithEmailAndPassword.mockImplementation(async () => {
    const user = { email: 'aina@joviat.cat', uid: 'auth-student-1' };
    auth.currentUser = user;
    authListener(user);
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
    await userEvent.click((await screen.findAllByRole('button', { name: /editar perfil/i }))[0]);
  });

  await act(async () => {
    await userEvent.click(await screen.findByRole('button', { name: /donar-me de baixa/i }));
  });

  expect(await screen.findByRole('alertdialog')).toBeInTheDocument();
  expect(screen.getByText(/s'eliminarà la foto de l'Alumni/i)).toBeInTheDocument();

  await act(async () => {
    await userEvent.click(screen.getByRole('button', { name: /confirmar eliminació/i }));
  });

  expect(deleteStudentAccount).toHaveBeenCalledWith({ studentId: 'student-1' });
  expect(signOut).toHaveBeenCalledWith(auth);
  expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  expect(await screen.findByRole('button', { name: /^login$/i })).toBeInTheDocument();
  expect(screen.getByText(/cicle formatiu hoteleria/i)).toBeInTheDocument();
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
    await userEvent.click(screen.getByRole('button', { name: /^Alumni$/i }));
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
  expect(screen.getByText(/s'eliminarà la foto de l'Alumni/i)).toBeInTheDocument();

  await act(async () => {
    await userEvent.click(screen.getByRole('button', { name: /confirmar eliminació/i }));
  });

  expect(deleteStudentAccount).toHaveBeenCalledWith({ studentId: 'student-1' });
  expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  expect(await screen.findByRole('heading', { name: /llistat d'Alumni/i })).toBeInTheDocument();
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
      screen.getByRole('button', { name: /^establiments$/i })
    );
  });

  await act(async () => {
    await userEvent.click(
      (await screen.findAllByRole('button', { name: /obrir fitxa de el celler de can roca/i }))[0]
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
  expect(screen.getByText(/^treballa actualment$/i)).toBeInTheDocument();
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
    await userEvent.click(screen.getByRole('button', { name: /^establiments$/i }));
  });

  await act(async () => {
    await userEvent.click(
      (await screen.findAllByRole('button', { name: /obrir fitxa de el celler de can roca/i }))[0]
    );
  });

  await act(async () => {
    await userEvent.click(await screen.findByRole('button', { name: /^eliminar$/i }));
  });

  expect(await screen.findByRole('alertdialog')).toBeInTheDocument();
  expect(screen.getByText(/rest-alum/i)).toBeInTheDocument();

  await act(async () => {
    await userEvent.click(screen.getByRole('button', { name: /confirmar eliminació/i }));
  });

  expect(deleteDoc).toHaveBeenCalledWith({ id: 'relation-1', path: 'Rest-Alum/relation-1' });
  expect(deleteDoc).toHaveBeenCalledWith({ id: 'relation-2', path: 'Rest-Alum/relation-2' });
  expect(deleteDoc).toHaveBeenCalledWith({ id: 'restaurant-1', path: 'Restaurant/restaurant-1' });
  expect(await screen.findByRole('heading', { name: /llistat d'establiments/i })).toBeInTheDocument();
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
    await userEvent.click(screen.getByRole('button', { name: /^establiments$/i }));
  });

  await act(async () => {
    await userEvent.click(
      (await screen.findAllByRole('button', { name: /obrir fitxa de el celler de can roca/i }))[0]
    );
  });

  await act(async () => {
    await userEvent.click(await screen.findByRole('button', { name: /^editar$/i }));
  });

  expect(await screen.findByRole('heading', { name: /editar establiment/i })).toBeInTheDocument();
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
    await userEvent.click(screen.getByRole('button', { name: /afegir establiment/i }));
  });

  expect(await screen.findByRole('heading', { name: /afegir establiment/i })).toBeInTheDocument();

  await act(async () => {
    await userEvent.type(screen.getByLabelText(/^nom$/i), 'Disfrutar');
    await userEvent.type(screen.getByLabelText(/adreca/i), 'Carrer de Villarroel, 163, Barcelona');
    await userEvent.type(screen.getByLabelText(/foto url/i), 'https://places.example/disfrutar.jpg');
    await userEvent.type(screen.getByLabelText(/google place id/i), 'place-disfrutar');
    await userEvent.click(screen.getByRole('button', { name: /desar establiment/i }));
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
  expect(await screen.findByRole('alertdialog')).toBeInTheDocument();
  expect(screen.getByText(/vols anar a la fitxa de disfrutar/i)).toBeInTheDocument();
  expect(screen.queryByRole('heading', { name: /^disfrutar$/i })).not.toBeInTheDocument();

  await act(async () => {
    await userEvent.click(screen.getByRole('button', { name: /nou establiment/i }));
  });

  expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  expect(screen.getByLabelText(/^nom$/i)).toHaveValue('');
  expect(screen.getByLabelText(/foto url/i)).toHaveValue('');
});

test('opens the restaurant detail card from the student detail', async () => {
  render(<App />);

  await act(async () => {
    await userEvent.click(
      screen.getByRole('button', { name: /^Alumni$/i })
    );
  });

  await act(async () => {
    await userEvent.click(
      await screen.findByRole('button', { name: /obrir fitxa de aina serra/i })
    );
  });

  await act(async () => {
    await userEvent.click(
      (await screen.findAllByRole('button', { name: /obrir fitxa de el celler de can roca/i }))[0]
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
      screen.getByRole('button', { name: /^establiments$/i })
    );
  });

  await act(async () => {
    await userEvent.click(
      (await screen.findAllByRole('button', { name: /obrir fitxa de el celler de can roca/i }))[0]
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
      screen.getByRole('button', { name: /^establiments$/i })
    );
  });

  expect(
    await screen.findByRole('heading', { name: /llistat d'establiments/i })
  ).toBeInTheDocument();
  expect(screen.getByTestId('restaurants-map')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /veure mapa/i })).toHaveAttribute('aria-pressed', 'true');
  expect(
    screen.queryByRole('navigation', { name: /paginació d'establiments/i })
  ).not.toBeInTheDocument();
  expect(getPublicStudentRestaurantGraph).toHaveBeenCalledWith();

  await act(async () => {
    await userEvent.click(
      screen.getByRole('button', { name: /tornar a la pàgina principal/i })
    );
  });

  expect(
    await screen.findByText(/descobreix fins on arriba la xarxa de la joviat/i)
  ).toBeInTheDocument();
});

test('shows the restaurant card on restaurant map pins and opens the detail from there', async () => {
  render(<App />);

  await act(async () => {
    await userEvent.click(
      screen.getByRole('button', { name: /^establiments$/i })
    );
  });

  expect((await screen.findAllByText(/el celler de can roca/i)).length).toBeGreaterThan(0);
  expect(screen.getAllByText(/carrer de can sunyer/i).length).toBeGreaterThan(0);
  expect(screen.getAllByText(/1 Alumni associat/i).length).toBeGreaterThan(0);
  expect(screen.getAllByRole('button', { name: /obrir fitxa de .* des del mapa/i }).length).toBeGreaterThan(0);

  await act(async () => {
    await userEvent.click(
      screen.getAllByRole('button', { name: /obrir fitxa de .* des del mapa/i })[0]
    );
  });

  expect(
    await screen.findByRole('heading', { name: /el celler de can roca/i })
  ).toBeInTheDocument();
});

test('filters restaurants by name and clears the search', async () => {
  render(<App />);
  await act(async () => {
    await userEvent.click(
      screen.getByRole('button', { name: /^establiments$/i })
    );
  });

  const searchInput = await screen.findByLabelText(/cercar establiments/i);

  await act(async () => {
    await userEvent.type(searchInput, 'disfr');
  });

  expect(screen.getAllByText(/disfrutar/i).length).toBeGreaterThan(0);
  expect(screen.queryByText(/el celler de can roca/i)).not.toBeInTheDocument();

  await act(async () => {
    await userEvent.click(
      screen.getByRole('button', { name: /esborrar cerca d'establiments/i })
    );
  });

  expect(searchInput).toHaveValue('');
  expect(screen.getAllByText(/el celler de can roca/i).length).toBeGreaterThan(0);
});

test('builds restaurant city filters from the city after the postal code', async () => {
  getDocs.mockImplementation(async (collectionName) => {
    if (collectionName === 'Restaurant') {
      return {
        docs: [
          {
            id: 'restaurant-1',
            data: () => ({
              Name: 'La Taula de Vic',
              Address: 'Carrer Major, 12, 08500 Vic, Barcelona, Spain',
            }),
          },
          {
            id: 'restaurant-2',
            data: () => ({
              Name: 'Mar de Sitges',
              Address: 'Passeig Maritim, 20, 08870 Sitges, Barcelona, Spain',
            }),
          },
        ],
      };
    }

    if (
      collectionName === 'Alumni'
      || collectionName === 'Rest-Alum'
      || collectionName === 'Administrator'
      || collectionName === 'UserRegistrations'
      || collectionName === 'RestaruantsRegistrations'
    ) {
      return { docs: [] };
    }

    return { docs: [] };
  });

  render(<App />);

  await act(async () => {
    await userEvent.click(
      screen.getByRole('button', { name: /^establiments$/i })
    );
  });

  await act(async () => {
    await userEvent.click(screen.getByRole('button', { name: /veure llistat/i }));
  });

  const cityFilter = await screen.findByRole('button', { name: /ciutat/i });

  await act(async () => {
    await userEvent.click(cityFilter);
  });

  expect(screen.getByLabelText(/^vic$/i)).toBeInTheDocument();
  expect(screen.getByLabelText(/^sitges$/i)).toBeInTheDocument();
  expect(screen.queryByLabelText(/^barcelona$/i)).not.toBeInTheDocument();

  await act(async () => {
    await userEvent.click(screen.getByLabelText(/^vic$/i));
  });

  expect(screen.getAllByText(/la taula de vic/i).length).toBeGreaterThan(0);
  expect(screen.queryByText(/mar de sitges/i)).not.toBeInTheDocument();
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
      screen.getByRole('button', { name: /^establiments$/i })
    );
  });

  await act(async () => {
    await userEvent.click(screen.getByRole('button', { name: /veure llistat/i }));
  });

  const searchInput = await screen.findByLabelText(/cercar establiment/i);
  const pagination = screen.getByRole('navigation', {
    name: /paginació d'establiments (superior|list\.topPagination)/i,
  });
  const bottomPagination = screen.getByRole('navigation', {
    name: /paginació d'establiments (inferior|list\.bottomPagination)/i,
  });

  expect(searchInput.compareDocumentPosition(pagination) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  expect(within(pagination).getByText(/1 a 8 de 10 establiments/i)).toBeInTheDocument();
  expect(within(bottomPagination).getByText(/1 a 8 de 10 establiments/i)).toBeInTheDocument();
  expect(screen.getByText(/^restaurant 1$/i)).toBeInTheDocument();
  expect(screen.getByText(/^restaurant 8$/i)).toBeInTheDocument();
  expect(screen.queryByText(/^restaurant 9$/i)).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: /anar a la pàgina 1 superior/i })).toHaveAttribute('aria-current', 'page');

  await act(async () => {
    await userEvent.click(screen.getByRole('button', { name: /pàgina següent superior/i }));
  });

  expect(await screen.findByText(/9 a 10 de 10 establiments/i)).toBeInTheDocument();
  expect(screen.getByText(/^restaurant 9$/i)).toBeInTheDocument();
  expect(screen.getByText(/^restaurant 10$/i)).toBeInTheDocument();
  expect(screen.queryByText(/^restaurant 1$/i)).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: /anar a la pàgina 2 superior/i })).toHaveAttribute('aria-current', 'page');
});
