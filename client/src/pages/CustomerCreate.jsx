import { useNavigate, useLocation } from 'react-router-dom';
import CustomerForm from '../components/CustomerForm';
import Layout from '../components/Layout';

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
    <div style={styles.container}>
      <CustomerForm
        onSuccess={handleSuccess}
        onCancel={handleCancel}
      />
    </div>
    </Layout>
  );
};

const styles = {
  container: {
    fontFamily: 'system-ui, -apple-system, sans-serif',
    maxWidth: '1200px',
    margin: '0 auto',
  },
};

export default CustomerCreate;
