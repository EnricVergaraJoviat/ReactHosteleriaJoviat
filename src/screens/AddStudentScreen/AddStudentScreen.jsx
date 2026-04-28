import { useEffect, useMemo, useRef, useState } from 'react';
import { deleteApp, initializeApp } from 'firebase/app';
import {
  createUserWithEmailAndPassword,
  getAuth,
  sendPasswordResetEmail,
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
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { app, auth, db, storage } from '../../helpers/firebase';
import { getFallbackImage } from '../../helpers/imageFallbacks';
import {
  CURRENTLY_STUDYING_PROMOTION_VALUE,
  createPromotionYears,
  normalizePromotionYearValue,
} from '../../helpers/promotionYears';
import {
  getRestaurantRoleOptions,
  normalizeRestaurantRole,
  translateRestaurantRole,
} from '../../helpers/restaurantRoles';
import googleMapsShareExampleImage from '../../assets/images/google-maps-share-example.png';
import { useI18n } from '../../i18n/I18nContext';
import './AddStudentScreen.css';

const RESTAURANT_REGISTRATIONS_COLLECTION = 'RestaruantsRegistrations';

function normalizeFileName(fileName) {
  return fileName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9.-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();
}

function isValidGoogleMapsUrl(value) {
  try {
    const parsedUrl = new URL(value);
    const hostname = parsedUrl.hostname.toLowerCase();

    return (
      parsedUrl.protocol === 'https:'
      && (
        hostname === 'maps.app.goo.gl'
        || hostname === 'goo.gl'
        || hostname === 'google.com'
        || hostname === 'www.google.com'
        || hostname.endsWith('.google.com')
      )
    );
  } catch (error) {
    return false;
  }
}

async function createStudentAuthUser(email, password) {
  const secondaryApp = initializeApp(
    app.options,
    `student-create-${email}-${Date.now()}`
  );
  const secondaryAuth = getAuth(secondaryApp);

  try {
    return await createUserWithEmailAndPassword(secondaryAuth, email, password);
  } finally {
    try {
      await signOut(secondaryAuth);
    } catch (error) {}

    await deleteApp(secondaryApp);
  }
}

function PasswordVisibilityIcon({ isVisible }) {
  if (isVisible) {
    return (
      <svg viewBox="0 0 24 24" focusable="false">
        <path
          d="M3.5 3.5 20.5 20.5M10.6 10.6A2 2 0 0 0 13.4 13.4M8.2 5.3A9.8 9.8 0 0 1 12 4.5c5.2 0 8.8 4.7 9.7 6a2.3 2.3 0 0 1 0 3 14.8 14.8 0 0 1-2.6 2.9M15.8 18.7a10 10 0 0 1-3.8.8c-5.2 0-8.8-4.7-9.7-6a2.3 2.3 0 0 1 0-3 15.7 15.7 0 0 1 3.1-3.3"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" focusable="false">
      <path
        d="M2.3 10.5c.9-1.3 4.5-6 9.7-6s8.8 4.7 9.7 6a2.3 2.3 0 0 1 0 3c-.9 1.3-4.5 6-9.7 6s-8.8-4.7-9.7-6a2.3 2.3 0 0 1 0-3Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M12 15.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function FieldIcon({ name }) {
  const iconPaths = {
    status: 'M12 3.5 19 7v5.2c0 4.4-3 7.4-7 8.3-4-0.9-7-3.9-7-8.3V7l7-3.5ZM9.2 12.1l1.8 1.8 3.9-4',
    user: 'M12 12.2a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM4.7 20.2c1-3.2 3.7-5.2 7.3-5.2s6.3 2 7.3 5.2',
    email: 'M4.5 6.5h15v11h-15v-11ZM5 7l7 6 7-6',
    lock: 'M7.5 10V7.8a4.5 4.5 0 0 1 9 0V10M6.3 10h11.4v9.5H6.3V10ZM12 14v2',
    phone: 'M7.1 4.6 9.4 4l1.2 4-1.6.9a10.6 10.6 0 0 0 5.1 5.1l.9-1.6 4 1.2-.6 2.3c-.2.7-.9 1.2-1.6 1.1A14.5 14.5 0 0 1 6 6.2c-.1-.7.4-1.4 1.1-1.6Z',
    linkedin: 'M5 9.5v9M5 6.2v.1M9.5 18.5v-9M9.5 13.3c.4-2.2 1.8-3.9 4-3.9 2.7 0 4 1.8 4 4.7v4.4',
    instagram: 'M8 4.5h8A3.5 3.5 0 0 1 19.5 8v8a3.5 3.5 0 0 1-3.5 3.5H8A3.5 3.5 0 0 1 4.5 16V8A3.5 3.5 0 0 1 8 4.5Zm8 2.2h0M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z',
  };

  return (
    <svg className="add-student-form__label-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        d={iconPaths[name]}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SaveIcon() {
  return (
    <svg className="add-student-form__button-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        d="M5 4.5h11l3 3v12H5v-15ZM8 4.5v5h7v-5M8 19.5v-6h8v6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function AddStudentScreen({
  mode = 'create',
  student = null,
  onSaved,
  isAdministrator = false,
  canChangePassword = false,
}) {
  const { t } = useI18n();
  const isEditMode = mode === 'edit' && Boolean(student?.id);
  const [formData, setFormData] = useState({
    name: '',
    status: 'alumne',
    email: '',
    phone: '',
    linkedIn: '',
    instagram: '',
    visibleContactToAlumniNetwork: true,
    promotionYear: '',
    password: '',
  });
  const [photoFile, setPhotoFile] = useState(null);
  const [photoName, setPhotoName] = useState('');
  const fallbackPreview = useMemo(
    () => getFallbackImage('student', formData.name),
    [formData.name]
  );
  const existingPhotoPreview = student?.PhotoURL ?? '';
  const previewUrlRef = useRef(fallbackPreview);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState(fallbackPreview);
  const hasObjectUrl = typeof URL?.createObjectURL === 'function';
  const [restaurants, setRestaurants] = useState([]);
  const [restaurantSearch, setRestaurantSearch] = useState('');
  const [restaurantLinks, setRestaurantLinks] = useState([]);
  const [isLoadingRestaurants, setIsLoadingRestaurants] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [passwordMessage, setPasswordMessage] = useState('');
  const [passwordErrorMessage, setPasswordErrorMessage] = useState('');
  const [passwordFormData, setPasswordFormData] = useState({
    password: '',
    passwordConfirmation: '',
  });
  const [visiblePasswordFields, setVisiblePasswordFields] = useState({
    password: false,
    passwordConfirmation: false,
  });
  const [restaurantError, setRestaurantError] = useState('');
  const [restaurantRequestMapsUrl, setRestaurantRequestMapsUrl] = useState('');
  const [restaurantRequestError, setRestaurantRequestError] = useState('');
  const [restaurantRequestMessage, setRestaurantRequestMessage] = useState('');
  const [isRestaurantRequestDialogOpen, setIsRestaurantRequestDialogOpen] = useState(false);
  const [isSubmittingRestaurantRequest, setIsSubmittingRestaurantRequest] = useState(false);
  const [newRestaurant, setNewRestaurant] = useState({
    restaurantId: '',
    role: '',
    currentJob: true,
  });
  const promotionYears = useMemo(createPromotionYears, []);
  const restaurantRoleOptions = useMemo(() => getRestaurantRoleOptions(t), [t]);

  useEffect(() => {
    if (!isEditMode || !student) {
      return;
    }

    setFormData({
      name: student.Name ?? '',
      status: student.isExAlumni ? 'exalumne' : 'alumne',
      email: student.Email ?? student.email ?? '',
      phone: student.Phone ?? student.phone ?? '',
      linkedIn: student.LinkedIn ?? student.linkedIn ?? '',
      instagram: student.Instagram ?? student.instagram ?? '',
      visibleContactToAlumniNetwork: student.VisibleContactToAlumniNetwork ?? true,
      promotionYear: student.PromotionYear ? String(student.PromotionYear) : '',
      password: '',
    });
    setPhotoFile(null);
    setPhotoName('');
    setPhotoPreviewUrl(student.PhotoURL || getFallbackImage('student', student.Name));
    previewUrlRef.current = student.PhotoURL || getFallbackImage('student', student.Name);
    setRestaurantLinks(
      (student.linkedRestaurants ?? []).map((entry) => ({
        restaurantId: entry.id,
        role: normalizeRestaurantRole(entry.role),
        currentJob: Boolean(entry.currentJob),
        relationId: entry.relationId ?? '',
      }))
    );
    setRestaurantSearch('');
    setRestaurantError('');
    setRestaurantRequestMapsUrl('');
    setRestaurantRequestError('');
    setRestaurantRequestMessage('');
    setIsRestaurantRequestDialogOpen(false);
    setErrorMessage('');
    setSuccessMessage('');
    setPasswordMessage('');
    setPasswordErrorMessage('');
    setPasswordFormData({
      password: '',
      passwordConfirmation: '',
    });
    setVisiblePasswordFields({
      password: false,
      passwordConfirmation: false,
    });
    setNewRestaurant({
      restaurantId: '',
      role: '',
      currentJob: true,
    });
  }, [isEditMode, student]);

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
          setErrorMessage(t('forms.loadRestaurantListError'));
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
  }, [t]);

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
    const { name, type, value, checked } = event.target;
    setFormData((current) => ({
      ...current,
      [name]: type === 'checkbox' ? checked : value,
    }));
  }

  function handlePasswordFormChange(event) {
    const { name, value } = event.target;
    setPasswordErrorMessage('');
    setPasswordMessage('');
    setPasswordFormData((current) => ({
      ...current,
      [name]: value,
    }));
  }

  function togglePasswordVisibility(field) {
    setVisiblePasswordFields((current) => ({
      ...current,
      [field]: !current[field],
    }));
  }

  function updatePreview(file, defaultPreview = fallbackPreview) {
    if (
      hasObjectUrl &&
      previewUrlRef.current &&
      previewUrlRef.current.startsWith('blob:')
    ) {
      URL.revokeObjectURL(previewUrlRef.current);
    }

    const nextUrl = file && hasObjectUrl
      ? URL.createObjectURL(file)
      : defaultPreview;
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
      updatePreview(null, isEditMode && existingPhotoPreview ? existingPhotoPreview : fallbackPreview);
    }
  }, [existingPhotoPreview, fallbackPreview, isEditMode, photoFile]);

  useEffect(() => () => {
    if (
      hasObjectUrl &&
      previewUrlRef.current &&
      previewUrlRef.current.startsWith('blob:')
    ) {
      URL.revokeObjectURL(previewUrlRef.current);
    }
  }, [hasObjectUrl]);

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
      setRestaurantError(t('forms.selectRestaurantError'));
      return;
    }

    if (restaurantLinks.some((entry) => entry.restaurantId === newRestaurant.restaurantId)) {
      setRestaurantError(t('forms.restaurantAlreadyAdded'));
      return;
    }

    setRestaurantLinks((current) => [
      ...current,
      {
        restaurantId: newRestaurant.restaurantId,
        role: normalizeRestaurantRole(newRestaurant.role),
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

  function handleOpenRestaurantRequestDialog() {
    setRestaurantRequestMapsUrl('');
    setRestaurantRequestError('');
    setRestaurantRequestMessage('');
    setIsRestaurantRequestDialogOpen(true);
  }

  async function handleSubmitRestaurantRequest() {
    const trimmedMapsUrl = restaurantRequestMapsUrl.trim();
    const trimmedName = formData.name.trim() || student?.Name || t('registrations.userNoName');
    const trimmedEmail = formData.email.trim() || student?.Email || student?.email || '';

    setRestaurantRequestError('');
    setRestaurantRequestMessage('');

    if (!trimmedMapsUrl) {
      setRestaurantRequestError(t('forms.restaurantRequestDescriptionRequired'));
      return;
    }

    if (!isValidGoogleMapsUrl(trimmedMapsUrl)) {
      setRestaurantRequestError(t('forms.restaurantRequestLinkInvalid'));
      return;
    }

    setIsSubmittingRestaurantRequest(true);

    try {
      await addDoc(collection(db, RESTAURANT_REGISTRATIONS_COLLECTION), {
        Name: trimmedName,
        Email: trimmedEmail,
        Description: '',
        GoogleMapsShareUrl: trimmedMapsUrl,
        id_alumni: student?.id ? doc(db, 'Alumni', student.id) : null,
        createdAt: serverTimestamp(),
      });

      setRestaurantRequestMapsUrl('');
      setIsRestaurantRequestDialogOpen(false);
      setRestaurantRequestMessage(t('forms.restaurantRequestSent'));
    } catch (error) {
      setRestaurantRequestError(t('forms.restaurantRequestError'));
    } finally {
      setIsSubmittingRestaurantRequest(false);
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    const trimmedName = formData.name.trim();
    const trimmedPassword = formData.password.trim();
    const trimmedEmail = formData.email.trim();

    if (!isEditMode && !trimmedPassword) {
      setErrorMessage(t('forms.passwordRequired'));
      return;
    }

    if (!trimmedEmail) {
      setErrorMessage(t('forms.emailRequired'));
      return;
    }

    const completedLinks = restaurantLinks.map((entry) => ({
      ...entry,
      role: normalizeRestaurantRole(entry.role),
    }));

    const seenRestaurantIds = new Set();
    for (const entry of completedLinks) {
      if (entry.restaurantId && seenRestaurantIds.has(entry.restaurantId)) {
        setErrorMessage(t('forms.duplicateRestaurant'));
        return;
      }

      if (entry.restaurantId) {
        seenRestaurantIds.add(entry.restaurantId);
      }
    }

    setIsSubmitting(true);

    try {
      let photoUrl = student?.PhotoURL ?? '';

      if (photoFile) {
        const safeFileName = normalizeFileName(photoFile.name || 'photo');
        const storagePath = `alumni/${Date.now()}-${safeFileName}`;
        const storageReference = ref(storage, storagePath);

        await uploadBytes(storageReference, photoFile);
        photoUrl = await getDownloadURL(storageReference);
      }

      if (isEditMode && student?.id) {
        const studentReference = doc(db, 'Alumni', student.id);

        await updateDoc(studentReference, {
          Name: trimmedName,
          PhotoURL: photoUrl,
          Email: trimmedEmail,
          Phone: formData.phone.trim(),
          LinkedIn: formData.linkedIn.trim(),
          Instagram: formData.instagram.trim(),
          VisibleContactToAlumniNetwork: Boolean(formData.visibleContactToAlumniNetwork),
          PromotionYear: normalizePromotionYearValue(formData.promotionYear),
          isExAlumni: formData.status === 'exalumne',
          updatedAt: serverTimestamp(),
        });

        const relationsSnapshot = await getDocs(collection(db, 'Rest-Alum'));
        const relationDeletes = relationsSnapshot.docs
          .filter((entry) => {
            const data = entry.data();
            return data?.id_alumni?.id === student.id || data?.id_alumni?.path === `Alumni/${student.id}`;
          })
          .map((entry) => deleteDoc(doc(db, 'Rest-Alum', entry.id)));

        await Promise.all(relationDeletes);

        await Promise.all(
          completedLinks.map((entry) =>
            addDoc(collection(db, 'Rest-Alum'), {
              id_alumni: studentReference,
              id_restaurant: doc(db, 'Restaurant', entry.restaurantId),
              rol: entry.role,
              current_job: entry.currentJob,
              createdAt: serverTimestamp(),
            })
          )
        );

        setSuccessMessage(t('forms.studentUpdated'));
        onSaved?.(student.id);
      } else {
        await createStudentAuthUser(trimmedEmail, trimmedPassword);

        const studentReference = await addDoc(collection(db, 'Alumni'), {
          Name: trimmedName,
          PhotoURL: photoUrl,
          Email: trimmedEmail,
          Phone: formData.phone.trim(),
          LinkedIn: formData.linkedIn.trim(),
          Instagram: formData.instagram.trim(),
          VisibleContactToAlumniNetwork: Boolean(formData.visibleContactToAlumniNetwork),
          PromotionYear: normalizePromotionYearValue(formData.promotionYear),
          Password: trimmedPassword,
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
          instagram: '',
          visibleContactToAlumniNetwork: true,
          promotionYear: '',
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
        setSuccessMessage(t('forms.studentSaved'));
      }
    } catch (error) {
      if (error?.code === 'auth/email-already-in-use') {
        setErrorMessage(t('forms.emailAlreadyInUse'));
        return;
      }
      if (error?.code === 'auth/invalid-email') {
        setErrorMessage(t('forms.invalidEmail'));
        return;
      }
      if (error?.code === 'auth/weak-password') {
        setErrorMessage(t('forms.weakPassword'));
        return;
      }
      setErrorMessage(t('forms.studentSaveError'));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handlePasswordReset() {
    const trimmedEmail = formData.email.trim();
    setErrorMessage('');
    setSuccessMessage('');

    if (!trimmedEmail) {
      setErrorMessage(t('forms.passwordResetMissingEmail'));
      return;
    }

    setIsResettingPassword(true);

    try {
      await sendPasswordResetEmail(auth, trimmedEmail);
      setSuccessMessage(t('forms.passwordResetSent'));
    } catch (error) {
      if (error?.code === 'auth/invalid-email') {
        setErrorMessage(t('forms.invalidEmail'));
      } else if (error?.code === 'auth/user-not-found') {
        setErrorMessage(t('forms.authUserNotFound'));
      } else {
        setErrorMessage(t('forms.passwordResetError'));
      }
    } finally {
      setIsResettingPassword(false);
    }
  }

  async function handleChangeOwnPassword() {
    const trimmedPassword = passwordFormData.password.trim();
    const trimmedPasswordConfirmation = passwordFormData.passwordConfirmation.trim();
    setPasswordErrorMessage('');
    setPasswordMessage('');

    if (!trimmedPassword || !trimmedPasswordConfirmation) {
      setPasswordErrorMessage(t('forms.enterPasswordTwice'));
      return;
    }

    if (trimmedPassword.length < 6) {
      setPasswordErrorMessage(t('forms.passwordTooShort'));
      return;
    }

    if (trimmedPassword !== trimmedPasswordConfirmation) {
      setPasswordErrorMessage(t('forms.passwordMismatch'));
      return;
    }

    if (!auth.currentUser) {
      setPasswordErrorMessage(t('forms.loginRequiredForPassword'));
      return;
    }

    setIsChangingPassword(true);

    try {
      await updatePassword(auth.currentUser, trimmedPassword);

      if (student?.id) {
        await updateDoc(doc(db, 'Alumni', student.id), {
          Password: trimmedPassword,
          updatedAt: serverTimestamp(),
        });
      }

      setPasswordFormData({
        password: '',
        passwordConfirmation: '',
      });
      setVisiblePasswordFields({
        password: false,
        passwordConfirmation: false,
      });
      setPasswordMessage(t('forms.passwordChanged'));
    } catch (error) {
      if (error?.code === 'auth/requires-recent-login') {
        setPasswordErrorMessage(t('forms.recentLoginRequired'));
      } else if (error?.code === 'auth/weak-password') {
        setPasswordErrorMessage(t('forms.passwordTooShort'));
      } else {
        setPasswordErrorMessage(t('forms.passwordChangeError'));
      }
    } finally {
      setIsChangingPassword(false);
    }
  }

  const pageTitle = isEditMode ? t('forms.editStudent') : t('forms.addStudent');
  const pageDescription = isEditMode
    ? t('forms.studentEditDescription')
    : t('forms.studentCreateDescription');
  const submitLabel = isEditMode ? t('common.saveChanges') : t('forms.saveStudent');

  const restaurantListContent = restaurantLinks.length
    ? restaurantLinks.map((entry) => {
        const restaurant = restaurants.find((item) => item.id === entry.restaurantId);
        const restaurantName = restaurant?.Name ?? t('common.restaurant');

        return (
          <article
            className="add-student-form__restaurant-entry"
            key={entry.restaurantId}
          >
            <div className="add-student-form__restaurant-entry-heading">
              <h3>{restaurantName}</h3>
              {!isEditMode ? (
                <button
                  className="add-student-form__remove-button"
                  type="button"
                  onClick={() => handleRemoveRestaurant(entry.restaurantId)}
                >
                  {t('common.delete')}
                </button>
              ) : null}
            </div>
            <p className="add-student-form__restaurant-entry-role">
              {entry.role ? translateRestaurantRole(entry.role, t) : t('common.roleUnavailable')}
            </p>
            <span
              className={`add-student-form__restaurant-entry-badge ${
                entry.currentJob
                  ? 'add-student-form__restaurant-entry-badge--active'
                  : 'add-student-form__restaurant-entry-badge--previous'
              }`}
            >
              {entry.currentJob ? t('common.currently') : t('common.previously')}
            </span>
          </article>
        );
      })
    : (
      <p className="add-student-form__status add-student-form__status--empty">
        {t('forms.noRestaurantsAdded')}
      </p>
    );

  return (
    <section className="add-student-screen">
      <div className="add-student-screen__intro">
        <p className="add-student-screen__eyebrow">{t('common.administration')}</p>
        <h1>{pageTitle}</h1>
        <p className="add-student-screen__description">
          {pageDescription}
        </p>
      </div>

      <form className="add-student-form" onSubmit={handleSubmit}>
        <div className="add-student-form__top">
          <section className="add-student-form__card add-student-form__card--aside">
            <label className="add-student-form__upload" htmlFor="student-photo">
              <div className="add-student-form__upload-preview-wrapper">
                <img
                  src={photoPreviewUrl}
                  alt={formData.name || t('forms.photo')}
                  className="add-student-form__upload-preview"
                />
              </div>
              <span className="add-student-form__upload-label">{t('forms.uploadPhoto')}</span>
              <span className="add-student-form__upload-name">
                {photoName || t('forms.uploadImage')}
              </span>
            </label>
            <input
              id="student-photo"
              className="add-student-form__file-input"
              aria-label={t('forms.photo')}
              name="photo"
              type="file"
              accept="image/*"
              onChange={handlePhotoChange}
            />

            <label className="add-student-form__checkbox" htmlFor="student-visible-contact">
              <input
                id="student-visible-contact"
                name="visibleContactToAlumniNetwork"
                type="checkbox"
                checked={formData.visibleContactToAlumniNetwork}
                onChange={handleFormChange}
              />
              <span>
                {t('forms.visibleContactToAlumniNetwork')}
              </span>
            </label>

            <label className="add-student-form__field" htmlFor="student-status">
              <span className="add-student-form__label">
                <FieldIcon name="status" />
                {t('forms.studentStatus')}
              </span>
              <select
                id="student-status"
                name="status"
                value={formData.status}
                onChange={handleFormChange}
              >
                <option value="alumne">{t('common.student')}</option>
                <option value="exalumne">{t('common.exStudent')}</option>
              </select>
            </label>
          </section>

          <section className="add-student-form__card add-student-form__card--main">
            <p className="add-student-form__section-title">{t('forms.primaryInfo')}</p>

            <div className="add-student-form__grid">
              <label
                className="add-student-form__field add-student-form__field--full"
                htmlFor="student-name"
              >
                <span className="add-student-form__label">
                  <FieldIcon name="user" />
                  {t('forms.fullName')}
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

              <label className="add-student-form__field" htmlFor="student-email">
                <span className="add-student-form__label">
                  <FieldIcon name="email" />
                  {t('common.email')} <span className="add-student-form__required">*</span>
                </span>
                <input
                  id="student-email"
                  autoComplete="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  placeholder="marc.ribas@exemple.cat"
                  onChange={handleFormChange}
                />
              </label>

              {!isEditMode ? (
                <label className="add-student-form__field" htmlFor="student-password">
                  <span className="add-student-form__label">
                    <FieldIcon name="lock" />
                    {t('auth.password')} <span className="add-student-form__required">*</span>
                  </span>
                  <input
                    id="student-password"
                    autoComplete="new-password"
                    name="password"
                    type="password"
                    value={formData.password}
                    placeholder="********"
                    onChange={handleFormChange}
                  />
                </label>
              ) : null}

              <label className="add-student-form__field" htmlFor="student-phone">
                <span className="add-student-form__label">
                  <FieldIcon name="phone" />
                  {t('forms.contactPhone')}
                </span>
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
                <span className="add-student-form__label">
                  <FieldIcon name="linkedin" />
                  {t('forms.linkedinProfile')}
                </span>
                <input
                  id="student-linkedin"
                  name="linkedIn"
                  type="url"
                  value={formData.linkedIn}
                  placeholder="linkedin.com/in/usuari"
                  onChange={handleFormChange}
                />
              </label>

              <label
                className="add-student-form__field add-student-form__field--full"
                htmlFor="student-instagram"
              >
                <span className="add-student-form__label">
                  <FieldIcon name="instagram" />
                  {t('forms.instagramProfile')}
                </span>
                <input
                  id="student-instagram"
                  name="instagram"
                  type="text"
                  value={formData.instagram}
                  placeholder="@usuari o instagram.com/usuari"
                  onChange={handleFormChange}
                />
              </label>

              <label className="add-student-form__field" htmlFor="student-promotion-year">
                <span className="add-student-form__label">
                  <FieldIcon name="status" />
                  {t('forms.promotionYear')}
                </span>
                <select
                  id="student-promotion-year"
                  name="promotionYear"
                  value={formData.promotionYear}
                  onChange={handleFormChange}
                >
                  <option value="">{t('filters.anyYear')}</option>
                  <option value={CURRENTLY_STUDYING_PROMOTION_VALUE}>
                    {t('students.currentlyStudying')}
                  </option>
                  {promotionYears.map((year) => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </label>
            </div>
          </section>
        </div>

        {isEditMode && canChangePassword ? (
          <section className="add-student-form__panel add-student-form__card add-student-form__password-panel">
            <div className="add-student-form__panel-heading">
              <div>
                <p className="add-student-form__section-title">{t('forms.changePassword')}</p>
              </div>
            </div>
            <div className="add-student-form__password-grid">
              <label className="add-student-form__field" htmlFor="student-new-password">
                <span className="add-student-form__label">
                  <FieldIcon name="lock" />
                  {t('forms.newPassword')}
                </span>
                <div className="add-student-form__password-input-wrap">
                  <input
                    id="student-new-password"
                    autoComplete="new-password"
                    name="password"
                    type={visiblePasswordFields.password ? 'text' : 'password'}
                    value={passwordFormData.password}
                    placeholder={t('forms.minPassword')}
                    onChange={handlePasswordFormChange}
                  />
                  <button
                    className="add-student-form__password-toggle"
                    type="button"
                    aria-label={visiblePasswordFields.password ? t('forms.hidePassword') : t('forms.showPassword')}
                    onClick={() => togglePasswordVisibility('password')}
                  >
                    <PasswordVisibilityIcon isVisible={visiblePasswordFields.password} />
                  </button>
                </div>
              </label>
              <label className="add-student-form__field" htmlFor="student-new-password-confirmation">
                <span className="add-student-form__label">
                  <FieldIcon name="lock" />
                  {t('forms.repeatPassword')}
                </span>
                <div className="add-student-form__password-input-wrap">
                  <input
                    id="student-new-password-confirmation"
                    autoComplete="new-password"
                    name="passwordConfirmation"
                    type={visiblePasswordFields.passwordConfirmation ? 'text' : 'password'}
                    value={passwordFormData.passwordConfirmation}
                    placeholder={t('forms.repeatPasswordPlaceholder')}
                    onChange={handlePasswordFormChange}
                  />
                  <button
                    className="add-student-form__password-toggle"
                    type="button"
                    aria-label={visiblePasswordFields.passwordConfirmation ? t('forms.hideRepeatPassword') : t('forms.showRepeatPassword')}
                    onClick={() => togglePasswordVisibility('passwordConfirmation')}
                  >
                    <PasswordVisibilityIcon isVisible={visiblePasswordFields.passwordConfirmation} />
                  </button>
                </div>
              </label>
              <button
                className="add-student-form__password-action"
                type="button"
                onClick={handleChangeOwnPassword}
                disabled={isChangingPassword || isSubmitting}
              >
                {isChangingPassword ? t('forms.saving') : t('forms.changePassword')}
              </button>
            </div>
            {passwordErrorMessage ? (
              <p className="add-student-form__feedback add-student-form__feedback--error" role="alert">
                {passwordErrorMessage}
              </p>
            ) : null}
            {passwordMessage ? (
              <p className="add-student-form__feedback add-student-form__feedback--success" role="status">
                {passwordMessage}
              </p>
            ) : null}
          </section>
        ) : null}

        <section className="add-student-form__panel add-student-form__card">
          <div className="add-student-form__panel-heading">
            <div>
              <p className="add-student-form__section-title">{t('forms.professionalPath')}</p>
              <h2>{t('common.restaurants')}</h2>
            </div>
          </div>

          {isLoadingRestaurants ? (
            <p className="add-student-form__status" role="status">
              {t('forms.loadingRestaurants')}
            </p>
          ) : restaurantListContent}

          <div className="add-student-form__restaurant-add">
            <div className="add-student-form__restaurant-add-row">
              <label className="add-student-form__field" htmlFor="restaurant-select">
                <span>{t('common.restaurant')}</span>
                <select
                  id="restaurant-select"
                  value={newRestaurant.restaurantId}
                  onChange={(event) =>
                    handleNewRestaurantChange('restaurantId', event.target.value)
                  }
                >
                  <option value="">{t('forms.selectRestaurant')}</option>
                  {filteredRestaurants.map((restaurant) => (
                    <option key={restaurant.id} value={restaurant.id}>
                      {restaurant.Name ?? t('common.noName')}
                    </option>
                  ))}
                </select>
              </label>

              <label className="add-student-form__field" htmlFor="restaurant-filter">
                <span>{t('forms.filterRestaurants')}</span>
                <input
                  id="restaurant-filter"
                  type="text"
                  value={restaurantSearch}
                  placeholder={t('restaurants.placeholder')}
                  onChange={(event) => setRestaurantSearch(event.target.value)}
                />
              </label>
            </div>

            <div className="add-student-form__restaurant-add-row add-student-form__restaurant-add-row--actions">
              <div className="add-student-form__restaurant-add-column">
                <label className="add-student-form__field" htmlFor="restaurant-role">
                  <span>{t('forms.role')}</span>
                  <select
                    id="restaurant-role"
                    value={newRestaurant.role}
                    onChange={(event) =>
                      handleNewRestaurantChange('role', event.target.value)
                    }
                  >
                    <option value="">{t('forms.selectRole')}</option>
                    {restaurantRoleOptions.map((roleOption) => (
                      <option key={roleOption.value} value={roleOption.value}>
                        {roleOption.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="add-student-form__checkbox add-student-form__checkbox--inline">
                  <input
                    checked={newRestaurant.currentJob}
                    type="checkbox"
                    onChange={(event) =>
                      handleNewRestaurantChange('currentJob', event.target.checked)
                    }
                  />
                  {t('forms.currentJobCheckbox')}
                </label>
              </div>
              <button
                className="add-student-form__add-button"
                type="button"
                onClick={handleAddRestaurant}
              >
                {t('forms.addRestaurantButton')}
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

          {isEditMode ? (
            <div className="add-student-form__restaurant-request">
              <p>{t('forms.restaurantRequestPrompt')}</p>
              <button
                className="add-student-form__add-button"
                type="button"
                onClick={handleOpenRestaurantRequestDialog}
              >
                {t('forms.restaurantRequestButton')}
              </button>
              {restaurantRequestMessage ? (
                <p className="add-student-form__feedback add-student-form__feedback--success" role="status">
                  {restaurantRequestMessage}
                </p>
              ) : null}
            </div>
          ) : null}
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
          {isEditMode && isAdministrator ? (
            <button
              className="add-student-form__secondary-action"
              type="button"
              onClick={handlePasswordReset}
              disabled={isResettingPassword || isSubmitting}
            >
              {isResettingPassword ? t('forms.sendingEmail') : t('forms.resetPassword')}
            </button>
          ) : null}
          <button className="add-student-form__submit" type="submit" disabled={isSubmitting}>
            <SaveIcon />
            {isSubmitting ? t('common.saving') : submitLabel}
          </button>
        </div>
      </form>

      {isRestaurantRequestDialogOpen ? (
        <div className="add-student-form__dialog-layer">
          <div
            className="add-student-form__dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="restaurant-request-title"
          >
            <h2 id="restaurant-request-title">{t('forms.restaurantRequestTitle')}</h2>
            <label className="add-student-form__field" htmlFor="restaurant-request-description">
              <span>{t('forms.restaurantRequestDescription')}</span>
              <input
                id="restaurant-request-description"
                type="url"
                value={restaurantRequestMapsUrl}
                placeholder={t('forms.restaurantRequestPlaceholder')}
                onChange={(event) => {
                  setRestaurantRequestMapsUrl(event.target.value);
                  setRestaurantRequestError('');
                }}
              />
              <small>{t('forms.restaurantRequestHelp')}</small>
            </label>
            <figure className="add-student-form__request-example">
              <img
                className="add-student-form__request-example-image"
                src={googleMapsShareExampleImage}
                alt={t('forms.restaurantRequestExampleAlt')}
              />
            </figure>
            {restaurantRequestError ? (
              <p className="add-student-form__feedback add-student-form__feedback--error" role="alert">
                {restaurantRequestError}
              </p>
            ) : null}
            <div className="add-student-form__dialog-actions">
              <button
                className="add-student-form__secondary-action"
                type="button"
                onClick={() => setIsRestaurantRequestDialogOpen(false)}
                disabled={isSubmittingRestaurantRequest}
              >
                {t('common.cancel')}
              </button>
              <button
                className="add-student-form__submit"
                type="button"
                onClick={handleSubmitRestaurantRequest}
                disabled={isSubmittingRestaurantRequest}
              >
                {isSubmittingRestaurantRequest ? t('common.saving') : t('forms.restaurantRequestSubmit')}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

export default AddStudentScreen;
