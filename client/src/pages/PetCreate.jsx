import { useNavigate, useSearchParams } from 'react-router-dom';
import PetForm from '../components/PetForm';

const PetCreate = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const customerId = searchParams.get('customer_id');

  const handleSuccess = () => {
    // If coming from customer detail page, redirect back to that customer
    if (customerId) {
      navigate(`/customers/${customerId}`);
    } else {
      navigate('/pets');
    }
  };

  const handleCancel = () => {
    // If coming from customer detail page, redirect back to that customer
    if (customerId) {
      navigate(`/customers/${customerId}`);
    } else {
      navigate('/pets');
    }
  };

  return (
    <div style={styles.container}>
      <PetForm
        customerId={customerId ? parseInt(customerId) : null}
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
  },
};

export default PetCreate;
