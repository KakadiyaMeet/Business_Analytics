/**
 * Axios instance configuration.
 * Centralized HTTP client with cookies and CSRF support.
 */
import axios from 'axios'

// Configure axios to send cookies and use Django CSRF token names
axios.defaults.withCredentials = true
axios.defaults.xsrfCookieName = 'csrftoken'
axios.defaults.xsrfHeaderName = 'X-CSRFToken'

export default axios
