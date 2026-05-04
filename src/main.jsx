import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
// 設計系統（Fandora CI tokens + V2 app shell）— 必須在 index.css 之前載入
import './styles/fandora-tokens.css';
import './styles/app.css';
import './styles/island.css';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
