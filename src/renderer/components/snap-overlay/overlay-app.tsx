import { useMemo } from 'react';
import { RegionSelect } from './region-select';
import { WindowPicker } from './window-picker';

export function OverlayApp(): JSX.Element {
  const params = useMemo(() => new URLSearchParams(window.location.search), []);
  const mode = params.get('mode');
  const displayId = Number(params.get('displayId') || '0');

  if (mode === 'region') {
    return <RegionSelect displayId={displayId} />;
  }

  if (mode === 'window-picker') {
    return <WindowPicker />;
  }

  return <div />;
}
