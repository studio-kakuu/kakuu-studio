import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './styles.css';

const start = () => createRoot(document.getElementById('root')).render(<StrictMode><App /></StrictMode>);
// フォントが揃ってから起動(配線の位置がずれないように)
(document.fonts ? document.fonts.ready : Promise.resolve()).then(start);
