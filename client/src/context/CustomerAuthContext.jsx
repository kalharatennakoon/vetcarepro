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

  /**
   * Set a new password on first login (clears password_must_change)
   */
  const changePasswordFirstLogin = async (newPassword) => {
    try {
      await axios.post(
        `${API_URL}/customer-auth/change-password-first-login`,
        { newPassword },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setCustomer((prev) => (prev ? { ...prev, password_must_change: false } : prev));
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to change password';
      return { success: false, message };
    }
  };

  const value = {
    customer,
    token,
    loading,
    login,
    logout,
    changePasswordFirstLogin,
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
