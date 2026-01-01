import { useParams, useNavigate } from 'react-router-dom';
import PetForm from '../components/PetForm';

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
    <div style={styles.container}>
      <PetForm
        petId={id}
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

export default PetEdit;
