import axios from 'axios'

// Rutas relativas: el backend sirve la app y la API desde el mismo origen
// (http://127.0.0.1:8080 en Electron, o la URL de Tailscale en remoto).
// En desarrollo, Vite reenvia /api al backend (ver vite.config.js).
const client = axios.create({
  baseURL: '/api',
  timeout: 10000,
})

// Convierte los errores del backend (formato { error, status }) en
// un mensaje simple y legible para mostrar en la interfaz.
client.interceptors.response.use(
  (response) => response,
  (error) => {
    const message = error.response?.data?.error || 'No se pudo conectar con el sistema'
    return Promise.reject(new Error(message))
  }
)

export default client
