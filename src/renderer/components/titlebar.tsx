import { useCallback } from 'react';

export function TitleBar(): JSX.Element {
  const handleDoubleClick = useCallback(() => {
    window.api.window.toggleMaximize();
  }, []);

  return (
    <div
      className="titlebar"
      onDoubleClick={handleDoubleClick}
    />
  );
}
