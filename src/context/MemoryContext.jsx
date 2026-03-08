import { createContext, useContext } from 'react'

const MemoryContext = createContext(null)

export function MemoryProvider({ folderHandle, setFolderHandle, children }) {
  return (
    <MemoryContext.Provider value={{ folderHandle, setFolderHandle }}>
      {children}
    </MemoryContext.Provider>
  )
}

export function useMemory() {
  const ctx = useContext(MemoryContext)
  if (!ctx) throw new Error('useMemory must be used within MemoryProvider')
  return ctx
}
