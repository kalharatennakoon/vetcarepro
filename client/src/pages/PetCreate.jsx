import { useNavigate, useSearchParams } from 'react-router-dom';
import PetForm from '../components/PetForm';
import Layout from '../components/Layout';
import '../styles/FormPagesModern.css';

const PetCreate = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const customerId = searchParams.get('customer_id');

  const handleSuccess = () => {
    if (customerId) {
      navigate(`/customers/${customerId}`);
    } else {
      navigate('/pets');
    }
  };

  const handleCancel = () => {
    if (customerId) {
      navigate(`/customers/${customerId}`);
    } else {
      navigate('/pets');
    }
  };

  return (
    <Layout>
      <div className="form-page-container">
        <div className="form-page-hero">
          <div className="form-page-hero-left">
            <div className="form-page-icon-tile icon-tile-pet">
              <i className="fas fa-paw"></i>
            </div>
            <div>
              <h1 className="form-page-title">Add New Pet Patient</h1>
              <p className="form-page-subtitle">Register a new pet patient into the Pro Pet Animal Hospital database</p>
            </div>
          </div>
          <button onClick={handleCancel} className="form-page-back-btn" type="button">
            <i className="fas fa-arrow-left"></i>
            Back to {customerId ? 'Customer Profile' : 'Pets List'}
          </button>
        </div>

        <div className="form-page-card">
          <PetForm
            customerId={customerId || null}
            onSuccess={handleSuccess}
            onCancel={handleCancel}
          />
        </div>
      </div>
    </Layout>
  );
};

export default PetCreate;
