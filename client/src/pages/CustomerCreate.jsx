import { useNavigate, useLocation } from 'react-router-dom';
import CustomerForm from '../components/CustomerForm';
import Layout from '../components/Layout';
import '../styles/FormPagesModern.css';

const CustomerCreate = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const returnTo = location.state?.returnTo || '/customers';

  const handleSuccess = (newCustomerId) => {
    navigate(returnTo, { state: { newCustomerId } });
  };

  const handleCancel = () => {
    navigate(returnTo);
  };

  return (
    <Layout>
      <div className="form-page-container">
        <div className="form-page-hero">
          <div className="form-page-hero-left">
            <div className="form-page-icon-tile icon-tile-customer">
              <i className="fas fa-user-plus"></i>
            </div>
            <div>
              <h1 className="form-page-title">Add New Customer</h1>
              <p className="form-page-subtitle">Create a new pet owner profile and contact records</p>
            </div>
          </div>
          <button onClick={handleCancel} className="form-page-back-btn" type="button">
            <i className="fas fa-arrow-left"></i>
            Back to Customers
          </button>
        </div>

        <div className="form-page-card">
          <CustomerForm
            onSuccess={handleSuccess}
            onCancel={handleCancel}
          />
        </div>
      </div>
    </Layout>
  );
};

export default CustomerCreate;
