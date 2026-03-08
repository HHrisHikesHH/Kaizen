import { useState, useEffect } from 'react'
import { getFolderHandle } from '../utils/memoryStore'

export function useMemoryFolder() {
  const [handle, setHandle] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    getFolderHandle()
      .then((h) => {
        if (!cancelled) {
          setHandle(h)
        }
      })
      .catch(() => {
        if (!cancelled) setHandle(null)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [])

  const setFolderHandle = (h) => {
    setHandle(h)
  }

  return { folderHandle: handle, setFolderHandle, loading }
}
