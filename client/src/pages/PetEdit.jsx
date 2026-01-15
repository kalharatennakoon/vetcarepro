import { useParams, useNavigate } from 'react-router-dom';
import PetForm from '../components/PetForm';
import Layout from '../components/Layout';

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
    <Layout>
    <div style={styles.container}>
      <PetForm
        petId={id}
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
  },
};

export default PetEdit;
