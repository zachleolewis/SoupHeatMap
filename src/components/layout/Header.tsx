interface HeaderProps {
  folderPath: string | null
  loading: boolean
  onSelectFolder: () => Promise<void>
}

export function Header({ folderPath, loading, onSelectFolder }: HeaderProps) {
  return (
    <header className="app-header">
      <div>
        <h1 className="app-title">SoupHeatMap</h1>
        <p className="app-subtitle">Valorant Match Analytics</p>
      </div>
      <button
        onClick={onSelectFolder}
        className="button-primary button-compact"
        disabled={loading}
      >
        {loading ? 'Loading...' : folderPath ? 'Change Folder' : 'Choose Folder'}
      </button>
    </header>
  )
}
