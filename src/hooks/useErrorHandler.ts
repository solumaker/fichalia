import { useState, useCallback } from 'react'

interface ErrorState {
  error: string | null
  isError: boolean
}

export function useErrorHandler() {
  const [errorState, setErrorState] = useState<ErrorState>({
    error: null,
    isError: false
  })

  const setError = useCallback((error: string | Error | null) => {
    if (error === null) {
      setErrorState({ error: null, isError: false })
    } else {
      const errorMessage = error instanceof Error ? error.message : error
      setErrorState({ error: errorMessage, isError: true })
    }
  }, [])

  const clearError = useCallback(() => {
    setErrorState({ error: null, isError: false })
  }, [])

  const handleAsync = useCallback(async <T>(
    asyncFn: () => Promise<T>,
    onSuccess?: (result: T) => void,
    onError?: (error: Error) => void
  ): Promise<T | null> => {
    try {
      clearError()
      const result = await asyncFn()
      onSuccess?.(result)
      return result
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error))
      setError(err)
      onError?.(err)
      return null
    }
  }, [clearError, setError])

  return {
    error: errorState.error,
    isError: errorState.isError,
    setError,
    clearError,
    handleAsync
  }
}