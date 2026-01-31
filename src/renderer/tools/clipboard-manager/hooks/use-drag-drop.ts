/**
 * Hook for drag and drop functionality
 */

import { useState, useCallback, DragEvent } from 'react';

interface UseDragDropResult {
  draggedItemId: string | null;
  dropTargetId: string | null;
  handleDragStart: (e: DragEvent, itemId: string) => void;
  handleDragEnd: () => void;
  handleDragOver: (e: DragEvent, targetId: string) => void;
  handleDragLeave: () => void;
  handleDrop: (e: DragEvent, targetId: string) => void;
}

interface UseDragDropOptions {
  onDrop: (itemId: string, targetId: string) => void;
}

export function useDragDrop({ onDrop }: UseDragDropOptions): UseDragDropResult {
  const [draggedItemId, setDraggedItemId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);

  const handleDragStart = useCallback((e: DragEvent, itemId: string) => {
    e.dataTransfer.setData('text/plain', itemId);
    e.dataTransfer.effectAllowed = 'copy';
    setDraggedItemId(itemId);
  }, []);

  const handleDragEnd = useCallback(() => {
    setDraggedItemId(null);
    setDropTargetId(null);
  }, []);

  const handleDragOver = useCallback((e: DragEvent, targetId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    setDropTargetId(targetId);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDropTargetId(null);
  }, []);

  const handleDrop = useCallback(
    (e: DragEvent, targetId: string) => {
      e.preventDefault();
      const itemId = e.dataTransfer.getData('text/plain');
      if (itemId && targetId) {
        onDrop(itemId, targetId);
      }
      setDraggedItemId(null);
      setDropTargetId(null);
    },
    [onDrop]
  );

  return {
    draggedItemId,
    dropTargetId,
    handleDragStart,
    handleDragEnd,
    handleDragOver,
    handleDragLeave,
    handleDrop,
  };
}
