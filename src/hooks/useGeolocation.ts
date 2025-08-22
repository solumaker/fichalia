import { useState, useCallback } from 'react'

interface GeolocationData {
  latitude: number
  longitude: number
  address?: string
}

export function useGeolocation() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const getCurrentLocation = useCallback((): Promise<GeolocationData> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocalización no soportada por este navegador'))
        return
      }

      setLoading(true)
      setError(null)

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords
          
          try {
            // Try to get address from coordinates (reverse geocoding)
            const address = await reverseGeocode(latitude, longitude)
            
            setLoading(false)
            resolve({ latitude, longitude, address })
          } catch (geoError) {
            console.warn('Error getting address:', geoError)
            setLoading(false)
            resolve({ latitude, longitude })
          }
        },
        (geoError) => {
          setLoading(false)
          let errorMessage = 'Error desconocido obteniendo la ubicación'
          
          switch (geoError.code) {
            case geoError.PERMISSION_DENIED:
              errorMessage = 'Permiso de ubicación denegado. Por favor, permite el acceso a la ubicación.'
              break
            case geoError.POSITION_UNAVAILABLE:
              errorMessage = 'Información de ubicación no disponible.'
              break
            case geoError.TIMEOUT:
              errorMessage = 'Tiempo de espera agotado obteniendo la ubicación.'
              break
          }
          
          setError(errorMessage)
          reject(new Error(errorMessage))
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000, // 5 minutes
        }
      )
    })
  }, [])

  return {
    getCurrentLocation,
    loading,
    error,
  }
}

// Simple reverse geocoding function
async function reverseGeocode(lat: number, lng: number): Promise<string> {
  try {
    // Using a simple approximation for demo - in production use a proper geocoding service
    return `Lat: ${lat.toFixed(4)}, Lng: ${lng.toFixed(4)}`
  } catch (error) {
    throw error
  }
}