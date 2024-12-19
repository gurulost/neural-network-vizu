// src/App.js

import React from 'react';
import NeuralNetworkViz from './components/NeuralNetworkViz/NeuralNetworkViz';
import { Container } from '@mui/material';

function App() {
  return (
    <Container maxWidth="lg" style={{ marginTop: '2rem', marginBottom: '2rem' }}>
      <NeuralNetworkViz />
    </Container>
  );
}

export default App;
