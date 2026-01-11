import { useParams, useNavigate } from 'react-router-dom';
import CustomerForm from '../components/CustomerForm';

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
    <div style={styles.container}>
      <CustomerForm
        customerId={id}
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

export default CustomerEdit;
