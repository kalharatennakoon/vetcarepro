import { useNavigate } from 'react-router-dom';
import PetForm from '../components/PetForm';

const PetCreate = () => {
  const navigate = useNavigate();

  const handleSuccess = () => {
    navigate('/pets');
  };

  const handleCancel = () => {
    navigate('/pets');
  };

  return (
    <div style={styles.container}>
      <PetForm
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
