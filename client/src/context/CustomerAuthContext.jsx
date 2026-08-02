import { createContext, useState, useEffect, useContext } from 'react';
import axios from 'axios';

const CustomerAuthContext = createContext();

/**
 * Customer (Pet Owner) Auth Context Provider
 * Mirrors AuthContext.jsx's shape and behavior, but talks to
 * /api/customer-auth and stores its token under a separate localStorage
 * key ('customerToken'). Kept fully independent from AuthContext so a
 * staff session and a pet-owner session can never collide or leak into
 * each other - notably, this provider never touches the shared
 * axios.defaults.headers, since a staff member and a pet owner could
 * theoretically have both tabs open using the same axios instance.
 */
export const CustomerAuthProvider = ({ children }) => {
  const [customer, setCustomer] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('customerToken'));
  const [loading, setLoading] = useState(true);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

  useEffect(() => {
    if (token) {
      localStorage.setItem('customerToken', token);
    } else {
      localStorage.removeItem('customerToken');
    }
  }, [token]);

  // Load customer on mount if a token exists
  useEffect(() => {
    const loadCustomer = async () => {
      if (token) {
        try {
          const response = await axios.get(`${API_URL}/customer-auth/me`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          setCustomer(response.data.data.customer);
        } catch (error) {
          console.error('Failed to load customer:', error);
          setToken(null);
          setCustomer(null);
        } finally {
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    };

    loadCustomer();
  }, [token, API_URL]);

  /**
   * Login with email or phone as username
   */
  const login = async (identifier, password) => {
    try {
      const response = await axios.post(`${API_URL}/customer-auth/login`, {
        identifier,
        password
      });

      const { customer: customerData, token: authToken } = response.data.data;

      setCustomer(customerData);
      setToken(authToken);

      return { success: true, customer: customerData };
    } catch (error) {
      const message = error.response?.data?.message || 'Login failed';
      const requiresSetup = !!error.response?.data?.requiresSetup;
      return { success: false, message, requiresSetup };
    }
  };

  /**
   * Step 1 of first-time account setup: confirm email + phone match an
   * account on file. Returns a short-lived setupToken (not a session token)
   * on success, used by setPassword() below.
   */
  const verifyIdentity = async (email, phone) => {
    try {
      const response = await axios.post(`${API_URL}/customer-auth/verify-identity`, {
        email,
        phone
      });

      const { setupToken, firstName } = response.data.data;
      return { success: true, setupToken, firstName };
    } catch (error) {
      const message = error.response?.data?.message || 'We could not verify your identity';
      return { success: false, message };
    }
  };

  /**
   * Step 2 of first-time account setup: set a password using the setupToken
   * from verifyIdentity(). Logs the customer in on success, same as login().
   */
  const setPassword = async (setupToken, newPassword) => {
    try {
      const response = await axios.post(`${API_URL}/customer-auth/set-password`, {
        setupToken,
        newPassword
      });

      const { customer: customerData, token: authToken } = response.data.data;

      setCustomer(customerData);
      setToken(authToken);

      return { success: true, customer: customerData };
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to set password';
      return { success: false, message };
    }
  };

  /**
   * Change password for an already-logged-in customer (requires current password)
   */
  const changePassword = async (currentPassword, newPassword) => {
    try {
      await axios.post(
        `${API_URL}/customer-auth/change-password`,
        { currentPassword, newPassword },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to change password';
      return { success: false, message };
    }
  };

  /**
   * Update own editable contact details (alternate phone, address, city,
   * preferred contact method, emergency contact/phone). Updates local
   * `customer` state on success so the profile page reflects the change
   * without a full reload.
   */
  const updateProfile = async (profileData) => {
    try {
      const response = await axios.put(
        `${API_URL}/customer-auth/me`,
        profileData,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const updatedCustomer = response.data.data.customer;
      setCustomer(updatedCustomer);
      return { success: true, customer: updatedCustomer };
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to update profile';
      return { success: false, message };
    }
  };

  const logout = async () => {
    try {
      if (token) {
        await axios.post(
          `${API_URL}/customer-auth/logout`,
          {},
          { headers: { Authorization: `Bearer ${token}` } }
        );
      }
    } catch (error) {
      console.error('Customer logout error:', error);
    } finally {
      setCustomer(null);
      setToken(null);
    }
  };

  const value = {
    customer,
    token,
    loading,
    login,
    logout,
    verifyIdentity,
    setPassword,
    changePassword,
    updateProfile,
    isAuthenticated: !!customer
  };

  return <CustomerAuthContext.Provider value={value}>{children}</CustomerAuthContext.Provider>;
};

export const useCustomerAuth = () => {
  const context = useContext(CustomerAuthContext);
  if (!context) {
    throw new Error('useCustomerAuth must be used within a CustomerAuthProvider');
  }
  return context;
};
