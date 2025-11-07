import { useCallback, useRef, useEffect } from 'react';

import type { OverlayElement } from './OverlayCanvas';

interface OverlayToolbarProps {
  selectedTool: string;
  onToolChange: (tool: string) => void;
  onDeleteSelected: () => void;
  hasSelection: boolean;
  elementsCount: number;
  selectedElement?: OverlayElement;
  onElementUpdate?: (id: string, updates: Partial<OverlayElement>) => void;
}

export function OverlayToolbar({
  selectedTool,
  onToolChange,
  onDeleteSelected,
  hasSelection,
  elementsCount,
  selectedElement,
  onElementUpdate
}: OverlayToolbarProps) {
  const tools = [
    { id: 'select', label: 'Select', icon: '↖' },
    { id: 'text', label: 'Text', icon: 'T' },
    { id: 'arrow', label: 'Arrow', icon: '→' },
    { id: 'rectangle', label: 'Rectangle', icon: '▭' },
    { id: 'circle', label: 'Circle', icon: '○' }
  ];

  // Ref to store the latest callback
  const onElementUpdateRef = useRef(onElementUpdate);

  // Update ref when prop changes
  useEffect(() => {
    onElementUpdateRef.current = onElementUpdate;
  }, [onElementUpdate]);

  // Update function for element properties
  const updateElement = useCallback((id: string, updates: Partial<OverlayElement>) => {
    if (onElementUpdateRef.current) {
      onElementUpdateRef.current(id, updates);
    }
  }, []);

  return (
    <div className="overlay-toolbar">
      <div className="toolbar-section">
        <h4 className="toolbar-title">Overlay Tools</h4>
        <div className="tool-grid">
          {tools.map((tool) => (
            <button
              key={tool.id}
              onClick={() => onToolChange(tool.id)}
              className={`tool-button ${selectedTool === tool.id ? 'active' : ''}`}
              title={tool.label}
            >
              <span className="tool-icon">{tool.icon}</span>
              <span className="tool-label">{tool.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="toolbar-section">
        <div className="toolbar-actions">
          <button
            onClick={onDeleteSelected}
            disabled={!hasSelection}
            className="delete-button"
            title="Delete selected element"
          >
            Delete
          </button>
        </div>
        <div className="element-count">
          {elementsCount} element{elementsCount !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Properties Panel */}
      {selectedElement && onElementUpdate && (
        <div className="toolbar-section">
          <h4 className="toolbar-title">Properties</h4>
          <div className="properties-panel">
            {/* Text Properties */}
            {selectedElement.type === 'text' && (
              <>
                <div className="filter-group">
                  <label className="filter-label">Text</label>
                  <input
                    type="text"
                    value={selectedElement.text || ''}
                    onChange={(e) => updateElement(selectedElement.id, { text: e.target.value })}
                    className="text-input"
                  />
                </div>

                <div className="filter-group">
                  <label className="filter-label">Font Family</label>
                  <select
                    value={selectedElement.fontFamily || 'Inter'}
                    onChange={(e) => updateElement(selectedElement.id, { fontFamily: e.target.value })}
                    className="select-input"
                  >
                    <option value="Inter">Inter</option>
                    <option value="Arial">Arial</option>
                    <option value="Helvetica">Helvetica</option>
                    <option value="Times New Roman">Times New Roman</option>
                    <option value="Courier New">Courier New</option>
                  </select>
                </div>

                <div className="filter-group">
                  <label className="filter-label">Font Size: {selectedElement.fontSize || 24}px</label>
                  <input
                    type="range"
                    min="8"
                    max="96"
                    value={selectedElement.fontSize || 24}
                    onChange={(e) => updateElement(selectedElement.id, { fontSize: Number(e.target.value) })}
                    className="range-input"
                  />
                </div>

                <div className="filter-group">
                  <label className="filter-label">Font Style</label>
                  <div className="button-group">
                    <button
                      onClick={() => updateElement(selectedElement.id, { fontWeight: selectedElement.fontWeight === 'bold' ? 'normal' : 'bold' })}
                      className={`button-group-item ${selectedElement.fontWeight === 'bold' ? 'active' : ''}`}
                    >
                      B
                    </button>
                    <button
                      onClick={() => updateElement(selectedElement.id, { fontStyle: selectedElement.fontStyle === 'italic' ? 'normal' : 'italic' })}
                      className={`button-group-item ${selectedElement.fontStyle === 'italic' ? 'active' : ''}`}
                    >
                      I
                    </button>
                    <button
                      onClick={() => updateElement(selectedElement.id, { textDecoration: selectedElement.textDecoration === 'underline' ? 'none' : 'underline' })}
                      className={`button-group-item ${selectedElement.textDecoration === 'underline' ? 'active' : ''}`}
                    >
                      U
                    </button>
                  </div>
                </div>
              </>
            )}

            {/* Shape Properties */}
            {(selectedElement.type === 'rectangle' || selectedElement.type === 'circle') && (
              <>
                <div className="filter-group">
                  <label className="filter-label">Fill Color</label>
                  <input
                    type="color"
                    value={selectedElement.fill || '#ffffff'}
                    onChange={(e) => updateElement(selectedElement.id, { fill: e.target.value })}
                    className="color-input"
                  />
                </div>

                <div className="filter-group">
                  <label className="filter-label">Stroke Color</label>
                  <input
                    type="color"
                    value={selectedElement.stroke || '#ffffff'}
                    onChange={(e) => updateElement(selectedElement.id, { stroke: e.target.value })}
                    className="color-input"
                  />
                </div>

                <div className="filter-group">
                  <label className="filter-label">Stroke Width: {selectedElement.strokeWidth || 2}px</label>
                  <input
                    type="range"
                    min="1"
                    max="20"
                    value={selectedElement.strokeWidth || 2}
                    onChange={(e) => updateElement(selectedElement.id, { strokeWidth: Number(e.target.value) })}
                    className="range-input"
                  />
                </div>
              </>
            )}

            {/* Arrow Properties */}
            {selectedElement.type === 'arrow' && (
              <>
                <div className="filter-group">
                  <label className="filter-label">Arrow Color</label>
                  <input
                    type="color"
                    value={selectedElement.fill || '#ff4655'}
                    onChange={(e) => updateElement(selectedElement.id, { fill: e.target.value })}
                    className="color-input"
                  />
                </div>

                <div className="filter-group">
                  <label className="filter-label">Stroke Width: {selectedElement.strokeWidth || 3}px</label>
                  <input
                    type="range"
                    min="1"
                    max="20"
                    value={selectedElement.strokeWidth || 3}
                    onChange={(e) => updateElement(selectedElement.id, { strokeWidth: Number(e.target.value) })}
                    className="range-input"
                  />
                </div>
              </>
            )}

            {/* All Elements */}
            <div className="filter-group">
              <label className="filter-label">Opacity: {Math.round((selectedElement.opacity || 1) * 100)}%</label>
              <input
                type="range"
                min="0.1"
                max="1"
                step="0.1"
                value={selectedElement.opacity || 1}
                onChange={(e) => updateElement(selectedElement.id, { opacity: Number(e.target.value) })}
                className="range-input"
              />
            </div>
          </div>
        </div>
      )}

      <div className="toolbar-help">
        <small>
          <strong>How to use:</strong><br/>
          1. Choose a tool (Text, Arrow, Rectangle, Circle)<br/>
          2. Click on heatmap to add new elements<br/>
          3. Switch to Select tool to edit existing elements<br/>
          4. Click elements to select, then use Properties panel<br/>
          5. Drag to move, use corner handles to resize
        </small>
      </div>
    </div>
  );
}
