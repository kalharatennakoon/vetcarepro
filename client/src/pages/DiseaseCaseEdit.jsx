import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getDiseaseCaseById, updateDiseaseCase } from '../services/diseaseCaseService';
import { getPets } from '../services/petService';
import { useAuth } from '../context/AuthContext';
import Layout from '../components/Layout';

const DiseaseCaseEdit = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [pets, setPets] = useState([]);
  const [formData, setFormData] = useState({
    pet_id: '',
    disease_name: '',
    disease_category: '',
    diagnosis_date: '',
    symptoms: '',
    severity: 'moderate',
    is_contagious: false,
    outcome: '',
    treatment_duration: '',
    notes: '',
    region: ''
  });

  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const isVetOrAdmin = user?.role === 'veterinarian' || user?.role === 'admin';

  useEffect(() => {
    if (!isVetOrAdmin) {
      navigate('/disease-cases');
      return;
    }
    
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [casesResponse, petsResponse] = await Promise.all([
        getDiseaseCaseById(id),
        getPets()
      ]);

      const caseData = casesResponse.data.diseaseCase;
      setPets(petsResponse.data.pets || []);
      
      setFormData({
        pet_id: caseData.pet_id || '',
        disease_name: caseData.disease_name || '',
        disease_category: caseData.disease_category || '',
        diagnosis_date: caseData.diagnosis_date ? caseData.diagnosis_date.split('T')[0] : '',
        symptoms: caseData.symptoms || '',
        severity: caseData.severity || 'moderate',
        is_contagious: caseData.is_contagious || false,
        outcome: caseData.outcome || '',
        treatment_duration: caseData.treatment_duration || '',
        notes: caseData.notes || '',
        region: caseData.region || ''
      });
      
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load disease case');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.disease_name) {
      setError('Please enter disease name');
      return;
    }
    
    if (!formData.disease_category) {
      setError('Please select disease category');
      return;
    }

    try {
      setSaving(true);
      setError('');
      
      const dataToSubmit = {
        ...formData,
        treatment_duration: formData.treatment_duration ? parseInt(formData.treatment_duration) : null
      };
      
      await updateDiseaseCase(id, dataToSubmit);
      navigate(`/disease-cases/${id}`);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update disease case');
      console.error(err);
    } finally {
      setSaving(false);
    }
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

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-3xl font-bold text-gray-800">Edit Disease Case</h1>
            <button
              onClick={() => navigate(`/disease-cases/${id}`)}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              ← Back to Details
            </button>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-6 space-y-6">
            {/* Pet Selection - Disabled */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Pet <span className="text-red-500">*</span>
              </label>
              <select
                name="pet_id"
                value={formData.pet_id}
                disabled
                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 cursor-not-allowed"
              >
                {pets.map(pet => (
                  <option key={pet.pet_id} value={pet.pet_id}>
                    {pet.name} - {pet.species} ({pet.owner_first_name} {pet.owner_last_name})
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">Pet cannot be changed after creation</p>
            </div>

            {/* Disease Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Disease Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="disease_name"
                value={formData.disease_name}
                onChange={handleChange}
                required
                placeholder="e.g., Parvovirus, Hip Dysplasia"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Disease Category */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Disease Category <span className="text-red-500">*</span>
              </label>
              <select
                name="disease_category"
                value={formData.disease_category}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select category</option>
                <option value="infectious">Infectious</option>
                <option value="parasitic">Parasitic</option>
                <option value="metabolic">Metabolic</option>
                <option value="genetic">Genetic</option>
                <option value="immune_mediated">Immune Mediated</option>
                <option value="neoplastic">Neoplastic (Cancer)</option>
                <option value="traumatic">Traumatic</option>
                <option value="nutritional">Nutritional</option>
              </select>
            </div>

            {/* Diagnosis Date and Severity */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Diagnosis Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  name="diagnosis_date"
                  value={formData.diagnosis_date}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Severity <span className="text-red-500">*</span>
                </label>
                <select
                  name="severity"
                  value={formData.severity}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="mild">Mild</option>
                  <option value="moderate">Moderate</option>
                  <option value="severe">Severe</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
            </div>

            {/* Symptoms */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Symptoms
              </label>
              <textarea
                name="symptoms"
                value={formData.symptoms}
                onChange={handleChange}
                rows="3"
                placeholder="Describe observed symptoms..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Outcome and Treatment Duration */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Outcome
                </label>
                <select
                  name="outcome"
                  value={formData.outcome}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Not yet determined</option>
                  <option value="recovered">Recovered</option>
                  <option value="ongoing">Ongoing Treatment</option>
                  <option value="deceased">Deceased</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Treatment Duration (days)
                </label>
                <input
                  type="number"
                  name="treatment_duration"
                  value={formData.treatment_duration}
                  onChange={handleChange}
                  min="0"
                  placeholder="e.g., 14"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Region and Contagious */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Region/Location
                </label>
                <input
                  type="text"
                  name="region"
                  value={formData.region}
                  onChange={handleChange}
                  placeholder="e.g., Colombo, Kandy"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center pt-8">
                <input
                  type="checkbox"
                  name="is_contagious"
                  checked={formData.is_contagious}
                  onChange={handleChange}
                  className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label className="ml-2 text-sm font-medium text-gray-700">
                  Contagious Disease
                </label>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Additional Notes
              </label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                rows="4"
                placeholder="Any additional information about the case..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-4 pt-4">
              <button
                type="button"
                onClick={() => navigate(`/disease-cases/${id}`)}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors flex items-center gap-2"
              >
                {saving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Save Changes
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Layout>
  );
};

export default DiseaseCaseEdit;
