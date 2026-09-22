import { useParams, useNavigate, Link } from 'react-router-dom';
import InventoryForm from '../components/InventoryForm';
import Layout from '../components/Layout';
import '../styles/InventoryDetailModern.css';

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
      <div className="inv-detail-container">
        {/* Navigation & Header */}
        <div className="inv-detail-topbar">
          <Link to={`/inventory/${id}`} className="inv-back-btn">
            <i className="fas fa-arrow-left"></i> Back to Item Details
          </Link>
        </div>

        <div className="inv-detail-hero" style={{ marginBottom: '1.5rem' }}>
          <div className="inv-detail-hero-left">
            <div className="inv-detail-avatar" style={{ background: 'linear-gradient(135deg, #2563eb, #3b82f6)' }}>
              <i className="fas fa-pen-to-square"></i>
            </div>
            <div>
              <h1 className="inv-detail-title">Edit Inventory Item</h1>
              <p style={{ margin: 0, fontSize: '0.875rem', color: '#64748b' }}>
                Update item pricing, stock levels, reorder quantities, or product batch details
              </p>
            </div>
          </div>
        </div>

        <InventoryForm itemId={id} onSuccess={handleSuccess} onCancel={handleCancel} />
      </div>
    </Layout>
  );
};

export default InventoryEdit;
