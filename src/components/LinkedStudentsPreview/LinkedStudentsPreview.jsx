import SmartImage from '../SmartImage/SmartImage';
import { useI18n } from '../../i18n/I18nContext';
import './LinkedStudentsPreview.css';

function LinkedStudentsPreview({ students = [], count = 0, className = '' }) {
  const { t } = useI18n();
  const visibleStudents = students.slice(0, 3);
  const remainingCount = Math.max(count - visibleStudents.length, 0);
  const classes = `linked-students-preview${className ? ` ${className}` : ''}`;

  if (count === 0) {
    return (
      <div className={classes}>
        <p className="linked-students-preview__empty">{t('linkedStudents.empty')}</p>
      </div>
    );
  }

  return (
    <div className={classes}>
      <div className="linked-students-preview__avatars" aria-hidden="true">
        {visibleStudents.map((student, index) => (
          <div
            className="linked-students-preview__avatar"
            key={student.id ?? `${student.Name ?? 'student'}-${index}`}
            style={{ zIndex: visibleStudents.length - index }}
          >
            <SmartImage
              className="linked-students-preview__image"
              src={student.PhotoURL}
              type="student"
              label={student.Name}
              alt={student.Name ?? t('common.student')}
            />
          </div>
        ))}
        {remainingCount > 0 ? (
          <div className="linked-students-preview__more">
            +{remainingCount}
          </div>
        ) : null}
      </div>
      <p className="linked-students-preview__text">
        {t('linkedStudents.count', { count, plural: count === 1 ? '' : 's' })}
      </p>
    </div>
  );
}

export default LinkedStudentsPreview;
