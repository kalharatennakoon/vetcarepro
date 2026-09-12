import { useParams, useNavigate } from 'react-router-dom';
import PetForm from '../components/PetForm';
import Layout from '../components/Layout';
import '../styles/FormPagesModern.css';

const PetEdit = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const handleSuccess = () => {
    navigate(`/pets/${id}`);
  };

  const handleCancel = () => {
    navigate(`/pets/${id}`);
  };

  return (
    <Layout>
      <div className="form-page-container">
        <div className="form-page-hero">
          <div className="form-page-hero-left">
            <div className="form-page-icon-tile icon-tile-pet">
              <i className="fas fa-edit"></i>
            </div>
            <div>
              <h1 className="form-page-title">Edit Pet Patient Details</h1>
              <p className="form-page-subtitle">Update health records, species, breed, and insurance metadata</p>
            </div>
          </div>
          <button onClick={handleCancel} className="form-page-back-btn" type="button">
            <i className="fas fa-arrow-left"></i>
            Back to Pet Profile
          </button>
        </div>

        <div className="form-page-card">
          <PetForm
            petId={id}
            onSuccess={handleSuccess}
            onCancel={handleCancel}
          />
        </div>
      </div>
    </Layout>
  );
};

export default PetEdit;
