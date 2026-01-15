import { useParams, useNavigate } from 'react-router-dom';
import CustomerForm from '../components/CustomerForm';
import Layout from '../components/Layout';

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
    <Layout>
    <div style={styles.container}>
      <CustomerForm
        customerId={id}
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

export default CustomerEdit;
