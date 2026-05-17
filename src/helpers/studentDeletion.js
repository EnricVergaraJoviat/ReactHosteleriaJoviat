import { httpsCallable } from 'firebase/functions';
import { functions } from './firebase';

const deleteStudentAccountFunction = httpsCallable(functions, 'deleteStudentAccount');

async function deleteStudentAccount(student) {
  if (!student?.id) {
    throw new Error('missing-student-id');
  }

  await deleteStudentAccountFunction({ studentId: student.id });
}

export { deleteStudentAccount };
