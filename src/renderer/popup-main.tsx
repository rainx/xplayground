import React from 'react';
import ReactDOM from 'react-dom/client';
import { ClipboardPopup } from './components/clipboard-popup';
import './styles/global.css';
import './styles/popup.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ClipboardPopup />
  </React.StrictMode>
);
