import React from 'react';
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { registerServiceWorkerOutsidePublicProfile } from './registerServiceWorker'
import { reloadOnChunkError } from './lib/reloadOnChunkError'

reloadOnChunkError();
createRoot(document.getElementById("root")!).render(<App />);
registerServiceWorkerOutsidePublicProfile();
