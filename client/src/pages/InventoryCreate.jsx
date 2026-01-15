import { useNavigate } from 'react-router-dom';
import InventoryForm from '../components/InventoryForm';
import Layout from '../components/Layout';

const InventoryCreate = () => {
  const navigate = useNavigate();

  const handleSuccess = () => {
    navigate('/inventory');
  };

  const handleCancel = () => {
    navigate('/inventory');
  };

  return (
    <Layout>
      <div style={styles.container}>
        <InventoryForm onSuccess={handleSuccess} onCancel={handleCancel} />
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

export default InventoryCreate;
