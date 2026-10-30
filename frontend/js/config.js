/* Where the Flask API lives. Update PROD_API once the backend is deployed on Render. */
window.IIP_CONFIG = (() => {
  const LOCAL_API = 'http://localhost:5000/api';
  const PROD_API = 'https://YOUR-RENDER-SERVICE.onrender.com/api';
  const isLocal = ['localhost', '127.0.0.1', ''].includes(location.hostname);
  return { API_BASE: isLocal ? LOCAL_API : PROD_API };
})();
