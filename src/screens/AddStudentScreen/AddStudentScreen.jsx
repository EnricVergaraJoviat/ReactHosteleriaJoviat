import { useEffect, useMemo, useRef, useState } from 'react';
import {
  addDoc,
  collection,
  doc,
  getDocs,
  serverTimestamp,
} from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { db, storage } from '../../helpers/firebase';
import { getFallbackImage } from '../../helpers/imageFallbacks';
import './AddStudentScreen.css';

function normalizeFileName(fileName) {
  return fileName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9.-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();
}

function AddStudentScreen() {
  const [formData, setFormData] = useState({
    name: '',
    status: 'alumne',
    email: '',
    phone: '',
    linkedIn: '',
    password: '',
  });
  const [photoFile, setPhotoFile] = useState(null);
  const [photoName, setPhotoName] = useState('');
  const fallbackPreview = useMemo(
    () => getFallbackImage('student', formData.name),
    [formData.name]
  );
  const previewUrlRef = useRef(fallbackPreview);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState(fallbackPreview);
  const hasObjectUrl = typeof URL?.createObjectURL === 'function';
  const [restaurants, setRestaurants] = useState([]);
  const [restaurantSearch, setRestaurantSearch] = useState('');
  const [restaurantLinks, setRestaurantLinks] = useState([]);
  const [isLoadingRestaurants, setIsLoadingRestaurants] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [restaurantError, setRestaurantError] = useState('');
  const [newRestaurant, setNewRestaurant] = useState({
    restaurantId: '',
    role: '',
    currentJob: true,
  });

  useEffect(() => {
    let isMounted = true;

    async function loadRestaurants() {
      try {
        const snapshot = await getDocs(collection(db, 'Restaurant'));
        const items = snapshot.docs.map((entry) => ({
          id: entry.id,
          ...entry.data(),
        }));

        if (isMounted) {
          setRestaurants(items);
          setErrorMessage('');
        }
      } catch (error) {
        if (isMounted) {
          setErrorMessage('No s\'ha pogut carregar el llistat de restaurants.');
        }
      } finally {
        if (isMounted) {
          setIsLoadingRestaurants(false);
        }
      }
    }

    loadRestaurants();

    return () => {
      isMounted = false;
    };
  }, []);

  const filteredRestaurants = useMemo(() => {
    const normalizedSearch = restaurantSearch.trim().toLowerCase();

    if (!normalizedSearch) {
      return restaurants;
    }

    return restaurants.filter((restaurant) =>
      (restaurant.Name ?? '').toLowerCase().includes(normalizedSearch)
    );
  }, [restaurantSearch, restaurants]);

  function handleFormChange(event) {
    const { name, value } = event.target;
    setFormData((current) => ({
      ...current,
      [name]: value,
    }));
  }

  function updatePreview(file) {
    if (
      hasObjectUrl &&
      previewUrlRef.current &&
      previewUrlRef.current.startsWith('blob:')
    ) {
      URL.revokeObjectURL(previewUrlRef.current);
    }

    const nextUrl = file && hasObjectUrl
      ? URL.createObjectURL(file)
      : fallbackPreview;
    previewUrlRef.current = nextUrl;
    setPhotoPreviewUrl(nextUrl);
  }

  function handlePhotoChange(event) {
    const file = event.target.files?.[0] ?? null;
    setPhotoFile(file);
    setPhotoName(file?.name ?? '');
    updatePreview(file);
  }

  useEffect(() => {
    if (!photoFile) {
      updatePreview(null);
    }

    return () => {
      if (
        hasObjectUrl &&
        previewUrlRef.current &&
        previewUrlRef.current.startsWith('blob:')
      ) {
        URL.revokeObjectURL(previewUrlRef.current);
      }
    };
  }, [fallbackPreview, photoFile]);

  function handleNewRestaurantChange(field, value) {
    setRestaurantError('');
    setNewRestaurant((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function handleAddRestaurant() {
    setRestaurantError('');

    if (!newRestaurant.restaurantId.trim()) {
      setRestaurantError('Selecciona un restaurant.');
      return;
    }

    if (restaurantLinks.some((entry) => entry.restaurantId === newRestaurant.restaurantId)) {
      setRestaurantError('Aquest restaurant ja està afegit.');
      return;
    }

    setRestaurantLinks((current) => [
      ...current,
      {
        restaurantId: newRestaurant.restaurantId,
        role: newRestaurant.role.trim(),
        currentJob: newRestaurant.currentJob,
      },
    ]);

    setNewRestaurant({
      restaurantId: '',
      role: '',
      currentJob: true,
    });
  }

  function handleRemoveRestaurant(restaurantId) {
    setRestaurantLinks((current) =>
      current.filter((entry) => entry.restaurantId !== restaurantId)
    );
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!formData.name.trim()) {
      setErrorMessage('El nom de l\'alumne es obligatori.');
      return;
    }

    if (!formData.password.trim()) {
      setErrorMessage('La contrassenya es obligatoria.');
      return;
    }

    if (!photoFile) {
      setErrorMessage('Has de seleccionar una foto de l\'alumne.');
      return;
    }

    const completedLinks = restaurantLinks.map((entry) => ({
      ...entry,
      role: entry.role.trim(),
    }));

    const seenRestaurantIds = new Set();
    for (const entry of completedLinks) {
      if (entry.restaurantId && seenRestaurantIds.has(entry.restaurantId)) {
        setErrorMessage('No pots repetir el mateix restaurant mes d\'una vegada.');
        return;
      }

      if (entry.restaurantId) {
        seenRestaurantIds.add(entry.restaurantId);
      }
    }

    setIsSubmitting(true);

    try {
      const safeFileName = normalizeFileName(photoFile.name || 'photo');
      const storagePath = `alumni/${Date.now()}-${safeFileName}`;
      const storageReference = ref(storage, storagePath);

      await uploadBytes(storageReference, photoFile);
      const photoUrl = await getDownloadURL(storageReference);

      const studentReference = await addDoc(collection(db, 'Alumni'), {
        Name: formData.name.trim(),
        PhotoURL: photoUrl,
        Email: formData.email.trim(),
        Phone: formData.phone.trim(),
        LinkedIn: formData.linkedIn.trim(),
        Password: formData.password.trim(),
        isExAlumni: formData.status === 'exalumne',
        createdAt: serverTimestamp(),
      });

      await Promise.all(
        completedLinks.map((entry) =>
          addDoc(collection(db, 'Rest-Alum'), {
            id_alumni: doc(db, 'Alumni', studentReference.id),
            id_restaurant: doc(db, 'Restaurant', entry.restaurantId),
            rol: entry.role,
            current_job: entry.currentJob,
            createdAt: serverTimestamp(),
          })
        )
      );

      setFormData({
        name: '',
        status: 'alumne',
        email: '',
        phone: '',
        linkedIn: '',
        password: '',
      });
      setPhotoFile(null);
      setPhotoName('');
      setRestaurantLinks([]);
      setRestaurantSearch('');
      setNewRestaurant({
        restaurantId: '',
        role: '',
        currentJob: true,
      });
      setRestaurantError('');
      setSuccessMessage('L\'alumne s\'ha desat correctament.');
    } catch (error) {
      setErrorMessage('No s\'ha pogut desar l\'alumne. Torna-ho a provar.');
    } finally {
      setIsSubmitting(false);
    }
  }

  const restaurantListContent = restaurantLinks.length
    ? restaurantLinks.map((entry) => {
        const restaurant = restaurants.find((item) => item.id === entry.restaurantId);
        const restaurantName = restaurant?.Name ?? 'Restaurant';

        return (
          <article
            className="add-student-form__restaurant-entry"
            key={entry.restaurantId}
          >
            <div className="add-student-form__restaurant-entry-heading">
              <h3>{restaurantName}</h3>
              <button
                className="add-student-form__remove-button"
                type="button"
                onClick={() => handleRemoveRestaurant(entry.restaurantId)}
              >
                Eliminar
              </button>
            </div>
            <p className="add-student-form__restaurant-entry-role">
              {entry.role || 'Rol no disponible'}
            </p>
            <span
              className={`add-student-form__restaurant-entry-badge ${
                entry.currentJob
                  ? 'add-student-form__restaurant-entry-badge--active'
                  : 'add-student-form__restaurant-entry-badge--previous'
              }`}
            >
              {entry.currentJob ? 'Actualment' : 'Anteriorment'}
            </span>
          </article>
        );
      })
    : (
      <p className="add-student-form__status add-student-form__status--empty">
        Encara no s&apos;han afegit restaurants.
      </p>
    );

  return (
    <section className="add-student-screen">
      <div className="add-student-screen__intro">
        <p className="add-student-screen__eyebrow">Administracio</p>
        <h1>Afegir Alumne</h1>
        <p className="add-student-screen__description">
          Els camps marcats amb <span className="add-student-form__required">*</span> són obligatoris. Dona
          d&apos;alta un alumne nou, desa la seva foto a storage i relaciona&apos;l amb tants restaurants com calgui.
        </p>
      </div>

      <form className="add-student-form" onSubmit={handleSubmit}>
        <div className="add-student-form__top">
          <section className="add-student-form__card add-student-form__card--aside">
            <label className="add-student-form__upload" htmlFor="student-photo">
              <div className="add-student-form__upload-preview-wrapper">
                <img
                  src={photoPreviewUrl}
                  alt={formData.name || 'Foto de l\'alumne'}
                  className="add-student-form__upload-preview"
                />
              </div>
              <span className="add-student-form__upload-label">Pujar foto</span>
              <span className="add-student-form__upload-name">
                {photoName || 'Puja una imatge'}
              </span>
            </label>
            <input
              id="student-photo"
              className="add-student-form__file-input"
              aria-label="Foto"
              name="photo"
              type="file"
              accept="image/*"
              onChange={handlePhotoChange}
            />

            <label className="add-student-form__field" htmlFor="student-status">
              <span>Estat de l&apos;alumne</span>
              <select
                id="student-status"
                name="status"
                value={formData.status}
                onChange={handleFormChange}
              >
                <option value="alumne">Alumne</option>
                <option value="exalumne">Exalumne</option>
              </select>
            </label>
          </section>

          <section className="add-student-form__card add-student-form__card--main">
            <p className="add-student-form__section-title">Informacio primaria</p>

            <div className="add-student-form__grid">
              <label
                className="add-student-form__field add-student-form__field--full"
                htmlFor="student-name"
              >
                <span>
                  Nom complet <span className="add-student-form__required">*</span>
                </span>
                <input
                  id="student-name"
                  name="name"
                  type="text"
                  value={formData.name}
                  placeholder="Ex. Marc Ribas i Soler"
                  onChange={handleFormChange}
                />
              </label>

              <label className="add-student-form__field" htmlFor="student-password">
                <span>
                  Contrasenya <span className="add-student-form__required">*</span>
                </span>
                <input
                  id="student-password"
                  name="password"
                  type="password"
                  value={formData.password}
                  placeholder="********"
                  onChange={handleFormChange}
                />
              </label>

              <label className="add-student-form__field" htmlFor="student-email">
                <span>Correu electronic</span>
                <input
                  id="student-email"
                  name="email"
                  type="email"
                  value={formData.email}
                  placeholder="marc.ribas@exemple.cat"
                  onChange={handleFormChange}
                />
              </label>

              <label className="add-student-form__field" htmlFor="student-phone">
                <span>Telefon de contacte</span>
                <input
                  id="student-phone"
                  name="phone"
                  type="tel"
                  value={formData.phone}
                  placeholder="+34 600 000 000"
                  onChange={handleFormChange}
                />
              </label>

              <label
                className="add-student-form__field add-student-form__field--full"
                htmlFor="student-linkedin"
              >
                <span>Perfil LinkedIn</span>
                <input
                  id="student-linkedin"
                  name="linkedIn"
                  type="url"
                  value={formData.linkedIn}
                  placeholder="linkedin.com/in/usuari"
                  onChange={handleFormChange}
                />
              </label>
            </div>
          </section>
        </div>

        <section className="add-student-form__panel add-student-form__card">
          <div className="add-student-form__panel-heading">
            <div>
              <p className="add-student-form__section-title">Trajectoria professional</p>
              <h2>Restaurants</h2>
            </div>
          </div>

          {isLoadingRestaurants ? (
            <p className="add-student-form__status" role="status">
              Carregant restaurants...
            </p>
          ) : restaurantListContent}

          <div className="add-student-form__restaurant-add">
            <div className="add-student-form__restaurant-add-row">
              <label className="add-student-form__field" htmlFor="restaurant-select">
                <span>Restaurant</span>
                <select
                  id="restaurant-select"
                  value={newRestaurant.restaurantId}
                  onChange={(event) =>
                    handleNewRestaurantChange('restaurantId', event.target.value)
                  }
                >
                  <option value="">Selecciona un restaurant</option>
                  {filteredRestaurants.map((restaurant) => (
                    <option key={restaurant.id} value={restaurant.id}>
                      {restaurant.Name ?? 'Sense nom'}
                    </option>
                  ))}
                </select>
              </label>

              <label className="add-student-form__field" htmlFor="restaurant-filter">
                <span>Filtrar restaurants pel nom</span>
                <input
                  id="restaurant-filter"
                  type="text"
                  value={restaurantSearch}
                  placeholder="Escriu el nom del restaurant"
                  onChange={(event) => setRestaurantSearch(event.target.value)}
                />
              </label>
            </div>

            <div className="add-student-form__restaurant-add-row add-student-form__restaurant-add-row--actions">
              <div className="add-student-form__restaurant-add-column">
                <label className="add-student-form__field" htmlFor="restaurant-role">
                  <span>Rol</span>
                  <input
                    id="restaurant-role"
                    type="text"
                    value={newRestaurant.role}
                    placeholder="Cap de sala, cuina, practiques..."
                    onChange={(event) =>
                      handleNewRestaurantChange('role', event.target.value)
                    }
                  />
                </label>
                <label className="add-student-form__checkbox add-student-form__checkbox--inline">
                  <input
                    checked={newRestaurant.currentJob}
                    type="checkbox"
                    onChange={(event) =>
                      handleNewRestaurantChange('currentJob', event.target.checked)
                    }
                  />
                  Està treballant actualment en aquest restaurant
                </label>
              </div>
              <button
                className="add-student-form__add-button"
                type="button"
                onClick={handleAddRestaurant}
              >
                Afegir restaurant
              </button>
            </div>

            {restaurantError ? (
              <p
                className="add-student-form__feedback add-student-form__feedback--error"
                role="alert"
              >
                {restaurantError}
              </p>
            ) : null}
          </div>
        </section>

        {errorMessage ? (
          <p className="add-student-form__feedback add-student-form__feedback--error" role="alert">
            {errorMessage}
          </p>
        ) : null}

        {successMessage ? (
          <p
            className="add-student-form__feedback add-student-form__feedback--success"
            role="status"
          >
            {successMessage}
          </p>
        ) : null}

        <div className="add-student-form__actions">
          <button className="add-student-form__submit" type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Desant...' : 'Desar alumne'}
          </button>
        </div>
      </form>
    </section>
  );
}

export default AddStudentScreen;
