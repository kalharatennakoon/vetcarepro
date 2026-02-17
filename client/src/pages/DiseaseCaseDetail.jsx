import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getDiseaseCaseById, deleteDiseaseCase } from '../services/diseaseCaseService';
import { useAuth } from '../context/AuthContext';
import Layout from '../components/Layout';

const DiseaseCaseDetail = () => {
  const [diseaseCase, setDiseaseCase] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const isAdmin = user?.role === 'admin';
  const isVetOrAdmin = user?.role === 'veterinarian' || user?.role === 'admin';

  useEffect(() => {
    fetchDiseaseCase();
  }, [id]);

  const fetchDiseaseCase = async () => {
    try {
      setLoading(true);
      const response = await getDiseaseCaseById(id);
      setDiseaseCase(response.data.diseaseCase);
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load disease case');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      setDeleting(true);
      await deleteDiseaseCase(id);
      navigate('/disease-cases');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete disease case');
      setShowDeleteModal(false);
      setDeleting(false);
    }
  };

  const getSeverityColor = (severity) => {
    const colors = {
      mild: 'bg-green-100 text-green-800',
      moderate: 'bg-yellow-100 text-yellow-800',
      severe: 'bg-orange-100 text-orange-800',
      critical: 'bg-red-100 text-red-800'
    };
    return colors[severity] || 'bg-gray-100 text-gray-800';
  };

  const getOutcomeColor = (outcome) => {
    const colors = {
      recovered: 'bg-green-100 text-green-800',
      ongoing: 'bg-blue-100 text-blue-800',
      deceased: 'bg-gray-100 text-gray-800'
    };
    return colors[outcome] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-screen">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600"></div>
        </div>
      </Layout>
    );
  }

  if (error && !diseaseCase) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
          <button
            onClick={() => navigate('/disease-cases')}
            className="mt-4 px-4 py-2 text-blue-600 hover:text-blue-800"
          >
            ← Back to List
          </button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <div>
              <button
                onClick={() => navigate('/disease-cases')}
                className="text-blue-600 hover:text-blue-800 mb-2"
              >
                ← Back to Disease Cases
              </button>
              <h1 className="text-3xl font-bold text-gray-800">{diseaseCase.disease_name}</h1>
              <p className="text-gray-600 mt-1">Case ID: {diseaseCase.case_id}</p>
            </div>
            <div className="flex gap-3">
              {isVetOrAdmin && (
                <button
                  onClick={() => navigate(`/disease-cases/${id}/edit`)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Edit
                </button>
              )}
              {isAdmin && (
                <button
                  onClick={() => setShowDeleteModal(true)}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Delete
                </button>
              )}
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
              {error}
            </div>
          )}

          {/* Status Badges */}
          <div className="flex gap-3 mb-6">
            <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getSeverityColor(diseaseCase.severity)}`}>
              {diseaseCase.severity?.toUpperCase()}
            </span>
            {diseaseCase.outcome && (
              <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getOutcomeColor(diseaseCase.outcome)}`}>
                {diseaseCase.outcome?.replace('_', ' ').toUpperCase()}
              </span>
            )}
            {diseaseCase.is_contagious && (
              <span className="px-3 py-1 rounded-full text-sm font-semibold bg-red-100 text-red-800 flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                CONTAGIOUS
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Information */}
            <div className="lg:col-span-2 space-y-6">
              {/* Pet Information */}
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-semibold text-gray-800 mb-4">Pet Information</h2>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Pet Name</p>
                    <p className="font-semibold text-gray-800">{diseaseCase.pet_name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Species</p>
                    <p className="font-semibold text-gray-800">{diseaseCase.species}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Breed</p>
                    <p className="font-semibold text-gray-800">{diseaseCase.breed || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Age at Diagnosis</p>
                    <p className="font-semibold text-gray-800">
                      {diseaseCase.age_at_diagnosis ? `${diseaseCase.age_at_diagnosis} months` : 'N/A'}
                    </p>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <p className="text-sm text-gray-600">Owner</p>
                  <p className="font-semibold text-gray-800">
                    {diseaseCase.owner_first_name} {diseaseCase.owner_last_name}
                  </p>
                  {diseaseCase.owner_phone && (
                    <p className="text-sm text-gray-600 mt-1">📞 {diseaseCase.owner_phone}</p>
                  )}
                </div>
              </div>

              {/* Disease Information */}
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-semibold text-gray-800 mb-4">Disease Information</h2>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-600">Disease Category</p>
                    <p className="font-semibold text-gray-800 capitalize">
                      {diseaseCase.disease_category?.replace('_', ' ')}
                    </p>
                  </div>
                  {diseaseCase.symptoms && (
                    <div>
                      <p className="text-sm text-gray-600">Symptoms</p>
                      <p className="text-gray-800">{diseaseCase.symptoms}</p>
                    </div>
                  )}
                  {diseaseCase.notes && (
                    <div>
                      <p className="text-sm text-gray-600">Additional Notes</p>
                      <p className="text-gray-800">{diseaseCase.notes}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Timeline */}
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-semibold text-gray-800 mb-4">Timeline</h2>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-gray-600">Diagnosis Date</p>
                    <p className="font-semibold text-gray-800">
                      {new Date(diseaseCase.diagnosis_date).toLocaleDateString()}
                    </p>
                  </div>
                  {diseaseCase.treatment_duration && (
                    <div>
                      <p className="text-sm text-gray-600">Treatment Duration</p>
                      <p className="font-semibold text-gray-800">{diseaseCase.treatment_duration} days</p>
                    </div>
                  )}
                  <div>
                    <p className="text-sm text-gray-600">Created</p>
                    <p className="text-sm text-gray-800">
                      {new Date(diseaseCase.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  {diseaseCase.updated_at && (
                    <div>
                      <p className="text-sm text-gray-600">Last Updated</p>
                      <p className="text-sm text-gray-800">
                        {new Date(diseaseCase.updated_at).toLocaleDateString()}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Location */}
              {diseaseCase.region && (
                <div className="bg-white rounded-lg shadow-md p-6">
                  <h2 className="text-xl font-semibold text-gray-800 mb-4">Location</h2>
                  <p className="text-gray-800">{diseaseCase.region}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-semibold text-gray-800 mb-4">Confirm Deletion</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete this disease case? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                disabled={deleting}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-400 transition-colors flex items-center gap-2"
              >
                {deleting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Deleting...
                  </>
                ) : (
                  'Delete'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default DiseaseCaseDetail;
