import { useNavigate } from 'react-router-dom';
import CustomerForm from '../components/CustomerForm';
import Layout from '../components/Layout';

const CustomerCreate = () => {
  const navigate = useNavigate();

  const handleSuccess = () => {
    navigate('/customers');
  };

  const handleCancel = () => {
    navigate('/customers');
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
