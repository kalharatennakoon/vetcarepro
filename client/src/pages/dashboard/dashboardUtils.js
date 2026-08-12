// Shared presentational helpers extracted verbatim from the former Dashboard.jsx
// Used identically by AdminDashboard.jsx, VetDashboard.jsx, ReceptionistDashboard.jsx

export const formatTime = (timeString) => {
  if (!timeString) return '';
  const [hours, minutes] = timeString.split(':');
  const hour = parseInt(hours);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${minutes} ${ampm}`;
};

export const getStatusBadge = (status) => {
  const badges = {
    'confirmed': { bg: '#d1fae5', color: '#065f46', text: 'Confirmed' },
    'in_progress': { bg: '#dbeafe', color: '#1e3a8a', text: 'In Progress' },
    'completed': { bg: '#f3f4f6', color: '#374151', text: 'Completed' },
    'cancelled': { bg: '#fee2e2', color: '#991b1b', text: 'Cancelled' }
  };
  return badges[status] || badges['confirmed'];
};
