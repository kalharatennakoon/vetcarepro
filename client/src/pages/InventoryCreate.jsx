import { useNavigate, Link } from 'react-router-dom';
import InventoryForm from '../components/InventoryForm';
import Layout from '../components/Layout';
import '../styles/InventoryDetailModern.css';

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
      <div className="inv-detail-container">
        {/* Navigation & Header */}
        <div className="inv-detail-topbar">
          <Link to="/inventory" className="inv-back-btn">
            <i className="fas fa-arrow-left"></i> Back to Inventory
          </Link>
        </div>

        <div className="inv-detail-hero" style={{ marginBottom: '1.5rem' }}>
          <div className="inv-detail-hero-left">
            <div className="inv-detail-avatar" style={{ background: 'linear-gradient(135deg, #2563eb, #3b82f6)' }}>
              <i className="fas fa-plus"></i>
            </div>
            <div>
              <h1 className="inv-detail-title">Add New Inventory Item</h1>
              <p style={{ margin: 0, fontSize: '0.875rem', color: '#64748b' }}>
                Create a new medicine, vaccine, equipment, or clinical supply record
              </p>
            </div>
          </div>
        </div>

        <InventoryForm onSuccess={handleSuccess} onCancel={handleCancel} />
      </div>
    </Layout>
  );
};

export default InventoryCreate;
