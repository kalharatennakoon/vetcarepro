import { useParams, useNavigate } from 'react-router-dom';
import InventoryForm from '../components/InventoryForm';
import Layout from '../components/Layout';

const InventoryEdit = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const handleSuccess = () => {
    navigate(`/inventory/${id}`);
  };

  const handleCancel = () => {
    navigate(`/inventory/${id}`);
  };

  return (
    <Layout>
      <div style={styles.container}>
        <InventoryForm itemId={id} onSuccess={handleSuccess} onCancel={handleCancel} />
      </div>
    </Layout>
  );
};

const styles = {
  container: {
    maxWidth: '56rem',
    margin: '0 auto',
    padding: '2rem 1rem',
  }
};

export default InventoryEdit;
