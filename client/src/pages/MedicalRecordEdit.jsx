import { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import MedicalRecordForm from '../components/MedicalRecordForm';
import Layout from '../components/Layout';
import '../styles/MedicalRecordCreateModern.css';

const MedicalRecordEdit = () => {
  const [error, setError] = useState('');
  const errorRef = useRef(null);

  useEffect(() => {
    if (error) errorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [error]);
  const { id } = useParams();
  const navigate = useNavigate();

  const handleSuccess = (updatedRecord) => {
    navigate(`/medical-records/${id}`);
  };

  const handleCancel = () => {
    navigate(`/medical-records/${id}`);
  };

  return (
    <Layout>
      <div className="medrec-create-container">
        <div className="medrec-create-hero">
          <div className="medrec-create-hero-left">
            <div className="medrec-create-icon-tile">
              <i className="fas fa-edit"></i>
            </div>
            <div>
              <h1 className="medrec-create-title">Edit Medical Record</h1>
              <p className="medrec-create-subtitle">Update clinical findings, treatment, prescription, and follow-up data</p>
            </div>
          </div>
          <button onClick={() => navigate(`/medical-records/${id}`)} className="medrec-create-back-btn" type="button">
            <i className="fas fa-arrow-left"></i>
            Back to Record
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
            recordId={parseInt(id)}
            onSuccess={handleSuccess}
            onCancel={handleCancel}
          />
        </div>
      </div>
    </Layout>
  );
};

export default MedicalRecordEdit;
