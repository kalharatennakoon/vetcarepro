import { useState, useRef, useEffect } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import MedicalRecordForm from '../components/MedicalRecordForm';
import Layout from '../components/Layout';
import '../styles/MedicalRecordCreateModern.css';

const MedicalRecordCreate = () => {
  const [error, setError] = useState('');
  const errorRef = useRef(null);

  useEffect(() => {
    if (error) errorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [error]);
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const appointmentData = location.state?.appointmentData || null;
  const petId = appointmentData?.pet_id || searchParams.get('petId');

  const handleSuccess = (newRecord) => {
    navigate(`/medical-records/${newRecord.record_id}`);
  };

  const handleCancel = () => {
    navigate(-1);
  };

  return (
    <Layout>
      <div className="medrec-create-container">
        <div className="medrec-create-hero">
          <div className="medrec-create-hero-left">
            <div className="medrec-create-icon-tile">
              <i className="fas fa-notes-medical"></i>
            </div>
            <div>
              <h1 className="medrec-create-title">Create New Medical Record</h1>
              <p className="medrec-create-subtitle">Record clinical diagnosis, vital signs, treatment, and prescription details</p>
            </div>
          </div>
          <button onClick={() => navigate(-1)} className="medrec-create-back-btn" type="button">
            <i className="fas fa-arrow-left"></i>
            Back
          </button>
        </div>

        {error && (
          <div ref={errorRef} className="medrec-form-error">
            <i className="fas fa-exclamation-circle medrec-form-error-icon"></i>
            <span>{error}</span>
          </div>
        )}

        <div className="medrec-create-card">
          <MedicalRecordForm
            petId={petId ? parseInt(petId) : null}
            appointmentData={appointmentData}
            onSuccess={handleSuccess}
            onCancel={handleCancel}
          />
        </div>
      </div>
    </Layout>
  );
};

export default MedicalRecordCreate;
