import { useNavigate } from 'react-router-dom';
import CustomerForm from '../components/CustomerForm';

const CustomerCreate = () => {
  const navigate = useNavigate();

  const handleSuccess = () => {
    navigate('/customers');
  };

  const handleCancel = () => {
    navigate('/customers');
  };

  return (
    <div style={styles.container}>
      <CustomerForm
        onSuccess={handleSuccess}
        onCancel={handleCancel}
      />
    </div>
  );
};

const styles = {
  container: {
    padding: '2rem',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    maxWidth: '1200px',
    margin: '0 auto',
  },
};

export default CustomerCreate;
