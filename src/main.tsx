import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { DemoProvider } from './state';
import App from './App';
import './styles.css';

createRoot(document.getElementById('root')!).render(<React.StrictMode><BrowserRouter><DemoProvider><App /></DemoProvider></BrowserRouter></React.StrictMode>);
