import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getPets } from '../services/petService';
import { createDiseaseCase } from '../services/diseaseCaseService';
import { useAuth } from '../context/AuthContext';
import Layout from '../components/Layout';

const DiseaseCaseCreate = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [pets, setPets] = useState([]);
  const [formData, setFormData] = useState({
    pet_id: '',
    disease_name: '',
    disease_category: '',
    diagnosis_date: new Date().toISOString().split('T')[0],
    symptoms: '',
    severity: 'moderate',
    is_contagious: false,
    outcome: '',
    treatment_duration: '',
    notes: '',
    region: ''
  });

  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    fetchPets();
  }, []);

  const fetchPets = async () => {
    try {
      const response = await getPets();
      setPets(response.data.pets || []);
    } catch (err) {
      setError('Failed to load pets');
      console.error(err);
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
    
    if (!formData.pet_id) {
      setError('Please select a pet');
      return;
    }
    
    if (!formData.disease_name) {
      setError('Please enter disease name');
      return;
    }
    
    if (!formData.disease_category) {
      setError('Please select disease category');
      return;
    }

    try {
      setLoading(true);
      setError('');
      
      const dataToSubmit = {
        ...formData,
        treatment_duration: formData.treatment_duration ? parseInt(formData.treatment_duration) : null
      };
      
      await createDiseaseCase(dataToSubmit);
      navigate('/disease-cases');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create disease case');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-3xl font-bold text-gray-800">Create Disease Case</h1>
            <button
              onClick={() => navigate('/disease-cases')}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              ← Back to List
            </button>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-6 space-y-6">
            {/* Pet Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Pet <span className="text-red-500">*</span>
              </label>
              <select
                name="pet_id"
                value={formData.pet_id}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select a pet</option>
                {pets.map(pet => (
                  <option key={pet.pet_id} value={pet.pet_id}>
                    {pet.name} - {pet.species} ({pet.owner_first_name} {pet.owner_last_name})
                  </option>
                ))}
              </select>
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
                onClick={() => navigate('/disease-cases')}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Creating...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Create Disease Case
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

export default DiseaseCaseCreate;
