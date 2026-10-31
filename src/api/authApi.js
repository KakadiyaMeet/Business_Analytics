/**
 * Authentication API calls.
 */
import axios from './axios'

export const loginUser = (username, password) =>
  axios.post('/api/auth/login/', { username, password })

export const registerUser = (username, email, password) =>
  axios.post('/api/auth/register/', { username, email, password })

export const logoutUser = () =>
  axios.post('/api/auth/logout/')

export const getCurrentUser = () =>
  axios.get('/api/auth/user/')
