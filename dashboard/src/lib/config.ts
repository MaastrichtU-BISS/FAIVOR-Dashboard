export const PUBLIC_ORGANIZATION_NAME = import.meta.env.PUBLIC_ORGANIZATION_NAME || 'Organization Name';

// Backend API Configuration
// Use the proxy endpoint for browser-side requests to avoid CORS issues
// The proxy will forward requests to the internal Docker service
export const PUBLIC_FAIVOR_BACKEND_URL = import.meta.env.PUBLIC_FAIVOR_BACKEND_URL || '/api/faivor-backend';
