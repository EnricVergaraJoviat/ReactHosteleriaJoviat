import SmartImage from '../SmartImage/SmartImage';
import './LinkedStudentsPreview.css';

function LinkedStudentsPreview({ students = [], count = 0, className = '' }) {
  const visibleStudents = students.slice(0, 3);
  const remainingCount = Math.max(count - visibleStudents.length, 0);
  const classes = `linked-students-preview${className ? ` ${className}` : ''}`;

  if (count === 0) {
    return (
      <div className={classes}>
        <p className="linked-students-preview__empty">0 alumni associats</p>
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
              alt={student.Name ?? 'Alumne'}
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
        {count} alumni associat{count === 1 ? '' : 's'}
      </p>
    </div>
  );
}

export default LinkedStudentsPreview;
