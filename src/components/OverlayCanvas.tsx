import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Stage, Layer, Text, Rect, Arrow, Circle, Transformer } from 'react-konva';
import Konva from 'konva';

// Add error boundary for Konva loading issues
class KonvaErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.error('Konva Error Boundary caught an error:', error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          color: 'red',
          fontSize: '14px'
        }}>
          Overlay system temporarily unavailable
        </div>
      );
    }

    return this.props.children;
  }
}

export interface OverlayElement {
  id: string;
  type: 'text' | 'arrow' | 'rectangle' | 'circle';
  x: number;
  y: number;
  width?: number;
  height?: number;
  text?: string;
  fontSize?: number;
  fontFamily?: string;
  fontStyle?: string; // normal, italic, oblique
  fontWeight?: string | number; // normal, bold, 100-900
  textDecoration?: string; // none, underline, line-through
  fill?: string;
  points?: number[];
  radius?: number;
  stroke?: string;
  strokeWidth?: number;
  opacity?: number;
  rotation?: number;
  scaleX?: number;
  scaleY?: number;
}

interface OverlayCanvasProps {
  width: number;
  height: number;
  elements: OverlayElement[];
  onElementsChange: (elements: OverlayElement[]) => void;
  selectedTool: string;
  onSelectionChange: (id: string | null) => void;
  selectedElementId: string | null;
}

export function OverlayCanvas({
  width,
  height,
  elements,
  onElementsChange,
  selectedTool,
  onSelectionChange,
  selectedElementId
}: OverlayCanvasProps) {
  const stageRef = useRef<Konva.Stage>(null);
  const transformerRef = useRef<Konva.Transformer>(null);
  const [isKonvaReady, setIsKonvaReady] = useState(false);

  // Check if Konva is available
  useEffect(() => {
    try {
      if (typeof Konva !== 'undefined' && Konva.Stage) {
        setIsKonvaReady(true);
      }
    } catch (error) {
      console.error('Konva library not available:', error);
    }
  }, []);

  // Ref to store the latest callback
  const onElementsChangeRef = useRef(onElementsChange);
  const elementsRef = useRef(elements);

  // Update refs when props change
  useEffect(() => {
    onElementsChangeRef.current = onElementsChange;
    elementsRef.current = elements;
  }, [onElementsChange, elements]);

  // Update function for canvas operations
  const updateElement = useCallback((id: string, updates: Partial<OverlayElement>) => {
    if (onElementsChangeRef.current) {
      const newElements = elementsRef.current.map(el =>
        el.id === id ? { ...el, ...updates } : el
      );
      onElementsChangeRef.current(newElements);
    }
  }, []);

  const handleStageClick = (e: any) => {
    try {
      // If clicking on empty space, deselect
      if (e.target === e.target.getStage()) {
        onSelectionChange && onSelectionChange(null);
        return;
      }

      // Select clicked element
      const clickedElement = e.target;
      if (clickedElement && clickedElement.id && onSelectionChange) {
        onSelectionChange(clickedElement.id());
      }
    } catch (error) {
      console.error('Error in handleStageClick:', error);
    }
  };


  const addTextElement = (x: number, y: number) => {
    if (!onElementsChange) return;

    const newElement: OverlayElement = {
      id: `text-${Date.now()}`,
      type: 'text',
      x: Math.max(0, Math.min(x, width - 200)), // Keep within bounds
      y: Math.max(0, Math.min(y, height - 40)),
      text: 'Click to edit',
      fontSize: 24,
      fontFamily: 'Inter',
      fontStyle: 'normal',
      fontWeight: 'normal',
      textDecoration: 'none',
      fill: '#ffffff',
      width: 200,
      height: 40,
      opacity: 1
    };
    onElementsChange([...elements, newElement]);
    onSelectionChange && onSelectionChange(newElement.id);
  };

  const addArrowElement = (x: number, y: number) => {
    if (!onElementsChange) return;

    const newElement: OverlayElement = {
      id: `arrow-${Date.now()}`,
      type: 'arrow',
      x: Math.max(0, Math.min(x, width - 100)),
      y: Math.max(0, y),
      points: [0, 0, 100, 0], // Start at origin, point right
      stroke: '#ff4655',
      strokeWidth: 3,
      fill: '#ff4655',
      opacity: 1
    };
    onElementsChange([...elements, newElement]);
    onSelectionChange && onSelectionChange(newElement.id);
  };

  const addRectangleElement = (x: number, y: number) => {
    if (!onElementsChange) return;

    const newElement: OverlayElement = {
      id: `rect-${Date.now()}`,
      type: 'rectangle',
      x: Math.max(0, Math.min(x, width - 100)),
      y: Math.max(0, Math.min(y, height - 60)),
      width: 100,
      height: 60,
      fill: '#ffffff',
      stroke: '#ffffff',
      strokeWidth: 2,
      opacity: 0.2
    };
    onElementsChange([...elements, newElement]);
    onSelectionChange && onSelectionChange(newElement.id);
  };

  const addCircleElement = (x: number, y: number) => {
    if (!onElementsChange) return;

    const newElement: OverlayElement = {
      id: `circle-${Date.now()}`,
      type: 'circle',
      x: Math.max(40, Math.min(x, width - 40)),
      y: Math.max(40, Math.min(y, height - 40)),
      radius: 40,
      fill: '#ffffff',
      stroke: '#ffffff',
      strokeWidth: 2,
      opacity: 0.2
    };
    onElementsChange([...elements, newElement]);
    onSelectionChange && onSelectionChange(newElement.id);
  };

  const handleStageMouseDown = (e: any) => {
    // If clicking on an existing element, don't create a new one
    if (e.target !== e.target.getStage()) {
      return;
    }

    if (selectedTool === 'select') return;

    try {
      const stage = stageRef.current;
      if (!stage) return;

      const pos = stage.getPointerPosition();
      if (!pos || typeof pos.x !== 'number' || typeof pos.y !== 'number') return;

      switch (selectedTool) {
        case 'text':
          addTextElement(pos.x, pos.y);
          break;
        case 'arrow':
          addArrowElement(pos.x, pos.y);
          break;
        case 'rectangle':
          addRectangleElement(pos.x, pos.y);
          break;
        case 'circle':
          addCircleElement(pos.x, pos.y);
          break;
      }
    } catch (error) {
      console.error('Error in handleStageMouseDown:', error);
    }
  };

  // Update transformer when selection changes
  React.useEffect(() => {
    if (transformerRef.current && selectedElementId) {
      const selectedNode = stageRef.current?.findOne(`#${selectedElementId}`);
      if (selectedNode) {
        transformerRef.current.nodes([selectedNode]);
      }
    } else if (transformerRef.current) {
      transformerRef.current.nodes([]);
    }
  }, [selectedElementId]);

  return (
    <KonvaErrorBoundary>
      {isKonvaReady ? (
        <Stage
          ref={stageRef}
          width={width}
          height={height}
          onClick={handleStageClick}
          onTap={handleStageClick}
          onMouseDown={handleStageMouseDown}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            pointerEvents: 'auto'
          }}
        >
      <Layer>
        {elements.map((element) => {
          switch (element.type) {
            case 'text':
              return (
                <Text
                  key={element.id}
                  id={element.id}
                  x={element.x}
                  y={element.y}
                  text={element.text || ''}
                  fontSize={element.fontSize || 24}
                  fontFamily={element.fontFamily || 'Inter'}
                  fontStyle={element.fontStyle || 'normal'}
                  fontWeight={element.fontWeight || 'normal'}
                  textDecoration={element.textDecoration || 'none'}
                  fill={element.fill || '#ffffff'}
                  opacity={element.opacity || 1}
                  width={element.width || 200}
                  height={element.height || 40}
                  scaleX={element.scaleX || 1}
                  scaleY={element.scaleY || 1}
                  draggable
                  onDragEnd={(e) => {
                    updateElement(element.id, {
                      x: e.target.x(),
                      y: e.target.y()
                    });
                  }}
                  onTransformEnd={(e) => {
                    const node = e.target;
                    updateElement(element.id, {
                      x: node.x(),
                      y: node.y(),
                      rotation: node.rotation(),
                      scaleX: node.scaleX(),
                      scaleY: node.scaleY()
                    });
                  }}
                />
              );

            case 'arrow':
              const arrowColor = element.fill || '#ff4655';
              return (
                <Arrow
                  key={element.id}
                  id={element.id}
                  x={element.x}
                  y={element.y}
                  points={element.points || [0, 0, 100, 0]}
                  stroke={arrowColor}
                  strokeWidth={element.strokeWidth || 3}
                  fill={arrowColor}
                  opacity={element.opacity || 1}
                  scaleX={element.scaleX || 1}
                  scaleY={element.scaleY || 1}
                  pointerLength={10}
                  pointerWidth={10}
                  draggable
                  onDragEnd={(e) => {
                    updateElement(element.id, {
                      x: e.target.x(),
                      y: e.target.y()
                    });
                  }}
                  onTransformEnd={(e) => {
                    const node = e.target;
                    updateElement(element.id, {
                      x: node.x(),
                      y: node.y(),
                      rotation: node.rotation(),
                      scaleX: node.scaleX(),
                      scaleY: node.scaleY()
                    });
                  }}
                />
              );

            case 'rectangle':
              return (
                <Rect
                  key={element.id}
                  id={element.id}
                  x={element.x}
                  y={element.y}
                  width={element.width || 100}
                  height={element.height || 60}
                  fill={element.fill || '#ffffff'}
                  stroke={element.stroke || '#ffffff'}
                  strokeWidth={element.strokeWidth || 2}
                  opacity={element.opacity || 1}
                  scaleX={element.scaleX || 1}
                  scaleY={element.scaleY || 1}
                  draggable
                  onDragEnd={(e) => {
                    updateElement(element.id, {
                      x: e.target.x(),
                      y: e.target.y()
                    });
                  }}
                  onTransformEnd={(e) => {
                    const node = e.target;
                    updateElement(element.id, {
                      x: node.x(),
                      y: node.y(),
                      rotation: node.rotation(),
                      scaleX: node.scaleX(),
                      scaleY: node.scaleY()
                    });
                  }}
                />
              );

            case 'circle':
              return (
                <Circle
                  key={element.id}
                  id={element.id}
                  x={element.x}
                  y={element.y}
                  radius={element.radius || 40}
                  fill={element.fill || '#ffffff'}
                  stroke={element.stroke || '#ffffff'}
                  strokeWidth={element.strokeWidth || 2}
                  opacity={element.opacity || 1}
                  scaleX={element.scaleX || 1}
                  scaleY={element.scaleY || 1}
                  draggable
                  onDragEnd={(e) => {
                    updateElement(element.id, {
                      x: e.target.x(),
                      y: e.target.y()
                    });
                  }}
                  onTransformEnd={(e) => {
                    const node = e.target;
                    updateElement(element.id, {
                      x: node.x(),
                      y: node.y(),
                      rotation: node.rotation(),
                      scaleX: node.scaleX(),
                      scaleY: node.scaleY()
                    });
                  }}
                />
              );

            default:
              return null;
          }
        })}

        <Transformer
          ref={transformerRef}
          boundBoxFunc={(oldBox, newBox) => {
            // Limit resize
            if (newBox.width < 5 || newBox.height < 5) {
              return oldBox;
            }
            return newBox;
          }}
          />
        </Layer>
      </Stage>
      ) : (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          color: '#666',
          fontSize: '12px'
        }}>
          Loading overlay system...
        </div>
      )}
    </KonvaErrorBoundary>
  );
}
