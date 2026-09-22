import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import AppointmentForm from '../components/AppointmentForm';
import '../styles/AppointmentCreateModern.css';

const AppointmentCreate = () => {
  const navigate = useNavigate();

  const handleSuccess = () => {
    navigate('/appointments');
  };

  const handleCancel = () => {
    navigate('/appointments');
  };

  return (
    <Layout>
      <div className="apt-create-container">
        <div className="apt-create-hero">
          <div className="apt-create-hero-left">
            <div className="apt-create-icon-tile">
              <i className="fas fa-calendar-plus"></i>
            </div>
            <div>
              <h1 className="apt-create-title">Schedule New Appointment</h1>
              <p className="apt-create-subtitle">Book a new appointment for a patient in Pro Pet Animal Hospital</p>
            </div>
          </div>
          <button onClick={handleCancel} className="apt-create-back-btn" type="button">
            <i className="fas fa-arrow-left"></i>
            Back to Appointments
          </button>
        </div>

        <div className="apt-create-card">
          <AppointmentForm 
            onSuccess={handleSuccess}
            onCancel={handleCancel}
          />
        </div>
      </div>
    </Layout>
  );
};

export default AppointmentCreate;