import { useParams, useNavigate } from 'react-router-dom';
import CustomerForm from '../components/CustomerForm';
import Layout from '../components/Layout';
import '../styles/FormPagesModern.css';

const CustomerEdit = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const handleSuccess = () => {
    navigate(`/customers/${id}`);
  };

  const handleCancel = () => {
    navigate(`/customers/${id}`);
  };

  return (
    <Layout>
      <div className="form-page-container">
        <div className="form-page-hero">
          <div className="form-page-hero-left">
            <div className="form-page-icon-tile icon-tile-customer">
              <i className="fas fa-user-edit"></i>
            </div>
            <div>
              <h1 className="form-page-title">Edit Customer Profile</h1>
              <p className="form-page-subtitle">Update contact details, emergency contacts, and notes</p>
            </div>
          </div>
          <button onClick={handleCancel} className="form-page-back-btn" type="button">
            <i className="fas fa-arrow-left"></i>
            Back to Customer Profile
          </button>
        </div>

        <div className="form-page-card">
          <CustomerForm
            customerId={id}
            onSuccess={handleSuccess}
            onCancel={handleCancel}
          />
        </div>
      </div>
    </Layout>
  );
};

export default CustomerEdit;
