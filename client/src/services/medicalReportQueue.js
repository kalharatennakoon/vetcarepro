const STORAGE_KEY = 'vetcarepro_deferred_medical_reports';

const readQueue = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const writeQueue = (ids) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
};

export const getDeferredMedicalReportIds = () => readQueue();

export const addDeferredMedicalReport = (appointmentId) => {
  if (!appointmentId) return;
  const nextIds = new Set(readQueue().map(id => String(id)));
  nextIds.add(String(appointmentId));
  writeQueue([...nextIds]);
};

export const removeDeferredMedicalReport = (appointmentId) => {
  if (!appointmentId) return;
  const filtered = readQueue().filter(id => String(id) !== String(appointmentId));
  writeQueue(filtered);
};
