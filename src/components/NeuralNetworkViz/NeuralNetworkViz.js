// src/components/NeuralNetworkViz/NeuralNetworkViz.js

import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  Typography,
  Slider,
  Button,
  Box,
  createTheme,
  ThemeProvider
} from '@mui/material';
import { styled } from '@mui/system';
import Draggable from 'react-draggable';
import { debounce } from 'lodash';

// Create a custom MUI theme for better typography and colors
const theme = createTheme({
  palette: {
    primary: {
      main: '#00796b', // Teal
    },
    text: {
      primary: '#333333', // Darker text for better contrast
      secondary: '#555555',
    },
    background: {
      default: '#f9f9f9',
      paper: '#ffffff',
    },
  },
  typography: {
    fontFamily: 'Open Sans, sans-serif',
    body1: {
      fontSize: '1.1rem',
      lineHeight: 1.6,
    },
    body2: {
      fontSize: '1rem',
      lineHeight: 1.5,
    },
    h4: {
      fontSize: '2rem',
      fontWeight: 700,
      fontFamily: 'Open Sans, sans-serif',
    },
    h5: {
      fontSize: '1.4rem',
      fontWeight: 600,
      fontFamily: 'Open Sans, sans-serif',
    },
    caption: {
      fontSize: '0.9rem',
    },
  },
});

// Utility function: Sigmoid activation
const sigmoid = (x) => 1 / (1 + Math.exp(-x));

// Improved color scales with slightly more appealing tints
const getWeightColor = (weight) => {
  const intensity = Math.min(Math.abs(weight), 1);
  if (weight > 0) {
    // Green gradient for positive weights
    return `rgba(0, ${150 + 105 * intensity}, 0, ${intensity})`;
  } else if (weight < 0) {
    // Red gradient for negative weights
    return `rgba(${150 + 105 * intensity}, 0, 0, ${intensity})`;
  }
  return `rgba(100, 100, 100, 0.5)`;
};

const getActivationColor = (activation) => {
  // Activation in [0,1], map to gradient: pale yellow (#fff9c4) to deep orange (#ff9800)
  const startColor = { r: 255, g: 249, b: 196 }; // a lighter, more appealing pale yellow
  const endColor = { r: 255, g: 152, b: 0 };     // #ff9800 (a nice orange)
  const r = Math.round(startColor.r + (endColor.r - startColor.r) * activation);
  const g = Math.round(startColor.g + (endColor.g - startColor.g) * activation);
  const b = Math.round(startColor.b + (endColor.b - startColor.b) * activation);
  return `rgb(${r}, ${g}, ${b})`;
};

// Single container that switches between inline and floating mode
const CanvasContainer = styled('div')(({ theme, isfloating }) => ({
  position: isfloating ? 'fixed' : 'static',
  top: isfloating ? '50%' : 'auto',
  left: isfloating ? '50%' : 'auto',
  transform: isfloating ? 'translate(-50%, -50%)' : 'none',
  zIndex: isfloating ? 2000 : 'auto',
  background: isfloating ? '#fff' : 'transparent',
  border: isfloating ? '1px solid #ccc' : 'none',
  borderRadius: isfloating ? '8px' : 0,
  boxShadow: isfloating ? '0 2px 10px rgba(0,0,0,0.2)' : 'none',
  padding: isfloating ? '1rem' : 0,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  maxWidth: '850px',
  marginBottom: isfloating ? 0 : '2rem',
}));

const ResponsiveCanvas = styled('canvas')(({ theme }) => ({
  width: '100%',
  maxWidth: '800px',
  height: 'auto',
  display: 'block',
  marginTop: '1rem',
}));

const HandleLabel = styled('div')(({ theme }) => ({
  marginBottom: '0.5rem',
  fontSize: '14px',
  color: '#333',
  cursor: 'grab',
  userSelect: 'none',
}));

const Legend = styled('div')(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  marginBottom: '1rem',
  fontSize: '0.9rem',
  color: theme.palette.text.secondary,
}));

const LegendItem = styled('div')(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  marginRight: '1rem',
}));

const ColorBox = styled('span')(({ color }) => ({
  width: '20px',
  height: '10px',
  backgroundColor: color,
  display: 'inline-block',
  marginRight: '0.5rem',
}));

const NeuralNetworkViz = () => {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);

  const [weights, setWeights] = useState({
    'A->H1': 0.5,
    'A->H2': 0.5,
    'B->H1': 0.5,
    'B->H2': 0.5,
    'H1->O': 0.5,
    'H2->O': 0.5,
  });

  const [biases, setBiases] = useState({
    H1: 0,
    H2: 0,
    O: 0,
  });

  const [inputs, setInputs] = useState({
    A: 0,
    B: 0,
  });

  const [isFloating, setIsFloating] = useState(false);
  const [dragPosition, setDragPosition] = useState({ x: 0, y: 0 });

  const calculateActivations = useCallback(() => {
    const { A, B } = inputs;
    const {
      'A->H1': wAH1,
      'A->H2': wAH2,
      'B->H1': wBH1,
      'B->H2': wBH2,
      'H1->O': wH1O,
      'H2->O': wH2O,
    } = weights;
    const { H1: bH1, H2: bH2, O: bO } = biases;

    const h1_input = A * wAH1 + B * wBH1 + bH1;
    const h2_input = A * wAH2 + B * wBH2 + bH2;
    const h1_activation = sigmoid(h1_input);
    const h2_activation = sigmoid(h2_input);

    const o_input = h1_activation * wH1O + h2_activation * wH2O + bO;
    const o_activation = sigmoid(o_input);

    return {
      H1: h1_activation,
      H2: h2_activation,
      O: o_activation,
    };
  }, [inputs, weights, biases]);

  const activations = useMemo(() => calculateActivations(), [calculateActivations]);

  // Debounced handlers for sliders
  const debouncedSetInputs = useMemo(
    () => debounce((key, newValue) => {
      setInputs((prev) => ({ ...prev, [key]: newValue }));
    }, 100),
    []
  );

  const debouncedSetWeights = useMemo(
    () => debounce((key, newValue) => {
      setWeights((prev) => ({ ...prev, [key]: newValue }));
    }, 100),
    []
  );

  const debouncedSetBiases = useMemo(
    () => debounce((key, newValue) => {
      setBiases((prev) => ({ ...prev, [key]: newValue }));
    }, 100),
    []
  );

  const drawNetwork = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const devicePixelRatio = window.devicePixelRatio || 1;
    const logicalWidth = 800;
    const logicalHeight = 500;
    canvas.width = logicalWidth * devicePixelRatio;
    canvas.height = logicalHeight * devicePixelRatio;
    ctx.scale(devicePixelRatio, devicePixelRatio);

    ctx.clearRect(0, 0, logicalWidth, logicalHeight);

    const { A, B } = inputs;
    const nodeRadius = 30;
    const nodes = {
      A: { x: 150, y: 150, label: 'Input A' },
      B: { x: 150, y: 350, label: 'Input B' },
      H1: { x: 400, y: 150, label: 'Hidden Neuron 1' },
      H2: { x: 400, y: 350, label: 'Hidden Neuron 2' },
      O: { x: 650, y: 250, label: 'Output Neuron' },
    };

    // Draw layer labels with increased prominence
    ctx.fillStyle = '#333';
    ctx.font = 'bold 20px "Open Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Input Layer', nodes.A.x, 40);
    ctx.fillText('Hidden Layer', nodes.H1.x, 40);
    ctx.fillText('Output Layer', nodes.O.x, 40);

    const {
      'A->H1': wAH1,
      'A->H2': wAH2,
      'B->H1': wBH1,
      'B->H2': wBH2,
      'H1->O': wH1O,
      'H2->O': wH2O,
    } = weights;

    const connections = [
      { start: nodes.A, end: nodes.H1, weight: wAH1 },
      { start: nodes.A, end: nodes.H2, weight: wAH2 },
      { start: nodes.B, end: nodes.H1, weight: wBH1 },
      { start: nodes.B, end: nodes.H2, weight: wBH2 },
      { start: nodes.H1, end: nodes.O, weight: wH1O },
      { start: nodes.H2, end: nodes.O, weight: wH2O },
    ];

    // Draw connections
    ctx.lineWidth = 3;
    ctx.font = '12px "Open Sans", sans-serif';
    connections.forEach(({ start, end, weight }) => {
      ctx.beginPath();
      ctx.strokeStyle = getWeightColor(weight);
      ctx.moveTo(start.x + nodeRadius, start.y);
      ctx.lineTo(end.x - nodeRadius, end.y);
      ctx.stroke();

      const midX = (start.x + end.x) / 2;
      const midY = (start.y + end.y) / 2;
      ctx.fillStyle = '#333';
      ctx.textAlign = 'center';
      ctx.fillText(weight.toFixed(2), midX, midY - 10);
    });

    const nodeActivations = activations;
    Object.entries(nodes).forEach(([key, pos]) => {
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, nodeRadius, 0, Math.PI * 2);
      let activation = key === 'A' || key === 'B' ? inputs[key] : nodeActivations[key];
      ctx.fillStyle = getActivationColor(activation);
      ctx.fill();
      ctx.strokeStyle = '#333';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Label above node
      ctx.fillStyle = '#333';
      ctx.font = '16px "Open Sans", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText(pos.label, pos.x, pos.y - nodeRadius - 10);

      // Activation/value below node
      ctx.font = '14px "Open Sans", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      const labelText = (key === 'A' || key === 'B')
        ? `Value: ${inputs[key].toFixed(2)}`
        : `Activation: ${activation.toFixed(2)}`;
      ctx.fillText(labelText, pos.x, pos.y + nodeRadius + 10);
    });
  }, [weights, biases, inputs, activations]);

  useEffect(() => {
    drawNetwork();
    const animation = requestAnimationFrame(drawNetwork);
    return () => cancelAnimationFrame(animation);
  }, [drawNetwork]);

  // Use IntersectionObserver to detect when canvas scrolls out of view
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) {
          setIsFloating(true);
        } else {
          setIsFloating(false);
        }
      },
      { threshold: [1] }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => {
      if (containerRef.current) {
        observer.unobserve(containerRef.current);
      }
    };
  }, []);

  const resetAll = () => {
    setInputs({ A: 0, B: 0 });
    setWeights({
      'A->H1': 0.5,
      'A->H2': 0.5,
      'B->H1': 0.5,
      'B->H2': 0.5,
      'H1->O': 0.5,
      'H2->O': 0.5,
    });
    setBiases({ H1: 0, H2: 0, O: 0 });
  };

  const handleReturn = () => {
    // Reset drag position before returning
    setDragPosition({ x: 0, y: 0 });
    setIsFloating(false);
    containerRef.current.scrollIntoView({ behavior: 'smooth' });
  };

  const onDrag = (e, data) => {
    if (isFloating) {
      setDragPosition({ x: data.x, y: data.y });
    }
  };

  return (
    <ThemeProvider theme={theme}>
      <Card variant="outlined" sx={{ padding: 4, backgroundColor: 'background.paper' }}>
        <CardHeader
          title={
            <Typography variant="h4" component="div" align="center">
              Interactive Neural Network Explorer
            </Typography>
          }
        />
        <CardContent>
          {/* Introductory Paragraphs */}
          <Box mb={8}>
            <Typography variant="body1" color="text.primary" paragraph>
              Welcome to the <strong>Neural Network Explorer</strong> - an interactive tool that lets you
              discover how artificial neural networks process information, make decisions,
              and learn from data. This visualization shows a simple but powerful neural
              network that demonstrates the core concepts behind modern AI systems.
            </Typography>

            <Typography variant="body1" color="text.primary" paragraph>
              What you're seeing is a network with three layers: two <strong>input neurons</strong>
              (A and B) that receive initial signals, two <strong>hidden neurons</strong> that process
              this information, and one <strong>output neuron</strong> that produces the final result.
              This structure, while simple, can already perform impressive tasks like
              basic pattern recognition or decision-making.
            </Typography>

            <Typography variant="body1" color="text.primary" paragraph>
              Think of this network as a tiny digital brain: information flows from left
              to right, getting processed and transformed along the way. Just as our
              brain cells communicate through connections of varying strengths, this
              neural network uses weights (the lines) and biases (internal to each
              neuron) to process information. The color and thickness of each connection
              shows its weight - red for negative influences, green for positive ones, with
              stronger colors indicating stronger effects.
            </Typography>

            <Typography variant="body1" color="text.primary" paragraph>
              <strong>How it works:</strong> The inputs feed signals into the hidden layer,
              each connection is multiplied by a <em>weight</em>, and each neuron has a <em>bias</em>
              that shifts its activation threshold. The hidden layer then feeds into the output neuron,
              which produces the network’s final output. The <em>sigmoid</em> function converts
              sums into values between 0 and 1, representing the neuron’s activation level.
            </Typography>
          </Box>

          {/* Legend for weights */}
          <Legend>
            <LegendItem>
              <ColorBox color="rgba(0,255,0,0.8)" /> <span>Positive Weight</span>
            </LegendItem>
            <LegendItem>
              <ColorBox color="rgba(255,0,0,0.8)" /> <span>Negative Weight</span>
            </LegendItem>
            <LegendItem>
              <Typography variant="caption" color="text.secondary">
                Move sliders left for negative values, right for positive values.
              </Typography>
            </LegendItem>
          </Legend>

          <div ref={containerRef} />

          {/* Draggable container for the canvas, single canvas rendered once */}
          <Draggable
            disabled={!isFloating}
            handle=".drag-handle"
            position={isFloating ? dragPosition : { x: 0, y: 0 }}
            onDrag={onDrag}
          >
            <CanvasContainer isfloating={isFloating}>
              {isFloating && <HandleLabel className="drag-handle">drag me</HandleLabel>}
              {isFloating && (
                <Box position="absolute" top="8px" right="8px" zIndex={10}>
                  <Button
                    variant="contained"
                    color="primary"
                    size="small"
                    onClick={handleReturn}
                  >
                    Return
                  </Button>
                </Box>
              )}
              <ResponsiveCanvas
                ref={canvasRef}
                width={800}
                height={500}
                role="img"
                aria-label="Neural Network Visualization"
              />
            </CanvasContainer>
          </Draggable>

          {/* Understanding Activations Section */}
          <Box mb={4}>
            <Typography variant="h5" gutterBottom>
              Understanding the Visualization
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              The intensity of each neuron's color shows its activation level:
            </Typography>
            <ul>
              <li>
                <Typography variant="body2" color="text.secondary">
                  <strong>Pale yellow</strong> indicates low activation (close to 0)
                </Typography>
              </li>
              <li>
                <Typography variant="body2" color="text.secondary">
                  <strong>Deep orange</strong> indicates high activation (close to 1)
                </Typography>
              </li>
            </ul>
            <Typography variant="body2" color="text.secondary" paragraph>
              The network uses a special function called "sigmoid" to calculate these activations. This function smoothly converts any input into a value between 0 and 1, similar to how biological neurons either fire or don't fire, but with varying intensities.
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              Try creating extreme scenarios:
            </Typography>
            <ol>
              <li>
                <Typography variant="body2" color="text.secondary">
                  Set all weights positive and watch information flow freely
                </Typography>
              </li>
              <li>
                <Typography variant="body2" color="text.secondary">
                  Set all weights negative and observe how signals get inverted
                </Typography>
              </li>
              <li>
                <Typography variant="body2" color="text.secondary">
                  Play with biases to see how they affect neuron sensitivity
                </Typography>
              </li>
            </ol>
          </Box>

          {/* Controls Section */}
          <Box display="flex" flexDirection="column" gap={4}>
            {/* Inputs */}
            <Box>
              <Typography variant="h5" gutterBottom>
                Inputs: The Network's Senses
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                Inputs A and B represent the raw information our network receives - similar to how our eyes receive light or our ears receive sound. Each input can vary from 0 (completely inactive) to 1 (fully active).
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                Try adjusting these values and watch how the signal propagates through the network. Notice how changes in one input can affect multiple hidden neurons, just as a single sensory input might trigger multiple neurons in our brains.
              </Typography>
              {Object.entries(inputs).map(([key, value]) => (
                <Box key={key} mb={2}>
                  <Typography gutterBottom>
                    {`Input ${key}`} (0 to 1): {value.toFixed(2)}
                  </Typography>
                  <Slider
                    aria-label={`Input ${key}`}
                    value={value}
                    min={0}
                    max={1}
                    step={0.01}
                    onChange={(event, newValue) =>
                      debouncedSetInputs(key, newValue)
                    }
                    valueLabelDisplay="auto"
                  />
                </Box>
              ))}
            </Box>

            {/* Weights: Input to Hidden */}
            <Box>
              <Typography variant="h5" gutterBottom>
                Weights: Controlling Information Flow
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                These weights determine how strongly each input affects each hidden neuron. Think of weights like volume knobs - they can amplify (positive weights) or dampen (negative weights) the signal passing through each connection. A weight of 1.0 means "pass this signal through at full strength," while -1.0 means "pass through the opposite signal at full strength." A weight of 0 effectively turns off that connection.
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                The color coding helps visualize this: green connections amplify signals, red connections invert them, and the intensity shows how strong this effect is. Try setting extreme weights and watch how the hidden neurons react!
              </Typography>
              {Object.entries(weights)
                .filter(([k]) => k.includes('->H'))
                .map(([key, value]) => (
                  <Box key={key} mb={2}>
                    <Typography gutterBottom>
                      {key} Weight: {value.toFixed(2)}
                    </Typography>
                    <Slider
                      aria-label={`${key} Weight`}
                      value={value}
                      min={-1}
                      max={1}
                      step={0.01}
                      onChange={(event, newValue) =>
                        debouncedSetWeights(key, newValue)
                      }
                      valueLabelDisplay="auto"
                    />
                    <Typography variant="caption" color="text.secondary">
                      Increasing <strong>{key.split('->')[0]}</strong> makes{' '}
                      <strong>{key.split('->')[1]}</strong> have a stronger influence on{' '}
                      <strong>{key.split('->')[1]}</strong>.
                    </Typography>
                  </Box>
                ))}
            </Box>

            {/* Weights: Hidden to Output */}
            <Box>
              <Typography variant="h5" gutterBottom>
                Hidden to Output Connections: The Decision-Making Layer
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                These weights control how each hidden neuron influences the final output. The hidden neurons have already processed the input information, and now these weights determine how to combine their insights into a final decision.
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                Experiment with these weights to see how different combinations of hidden neuron activations lead to different outputs. Notice how the network can emphasize or ignore certain hidden neurons by adjusting these weights - this is similar to how our brains might focus on certain features while ignoring others when making decisions.
              </Typography>
              {Object.entries(weights)
                .filter(([k]) => k.includes('->O'))
                .map(([key, value]) => (
                  <Box key={key} mb={2}>
                    <Typography gutterBottom>
                      {key} Weight: {value.toFixed(2)}
                    </Typography>
                    <Slider
                      aria-label={`${key} Weight`}
                      value={value}
                      min={-1}
                      max={1}
                      step={0.01}
                      onChange={(event, newValue) =>
                        debouncedSetWeights(key, newValue)
                      }
                      valueLabelDisplay="auto"
                    />
                    <Typography variant="caption" color="text.secondary">
                      Increasing {key} gives that hidden neuron more influence on the output’s final value.
                    </Typography>
                  </Box>
                ))}
            </Box>

            {/* Biases */}
            <Box>
              <Typography variant="h5" gutterBottom>
                Biases: Setting Neuron Sensitivity
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                Each neuron has a bias that acts like its "activation threshold" - how easily it fires in response to incoming signals. Think of bias as a neuron's basic tendency to activate:
              </Typography>
              <ul>
                <li>
                  <Typography variant="body2" color="text.secondary">
                    <strong>A positive bias</strong> makes the neuron more "optimistic" - it's more likely to activate even with weak input signals
                  </Typography>
                </li>
                <li>
                  <Typography variant="body2" color="text.secondary">
                    <strong>A negative bias</strong> makes the neuron more "conservative" - it needs stronger input to activate
                  </Typography>
                </li>
                <li>
                  <Typography variant="body2" color="text.secondary">
                    <strong>A zero bias</strong> means the neuron responds purely based on its inputs
                  </Typography>
                </li>
              </ul>
              <Typography variant="body2" color="text.secondary" paragraph>
                Try setting extreme biases and watch how neurons become either very easy or very difficult to activate. In real neural networks, biases help the network model more complex patterns by allowing neurons to have different baseline activation levels.
              </Typography>
              {Object.entries(biases).map(([key, value]) => (
                <Box key={key} mb={2}>
                  <Typography gutterBottom>
                    {key} Bias: {value.toFixed(2)}
                  </Typography>
                  <Slider
                    aria-label={`${key} Bias`}
                    value={value}
                    min={-2}
                    max={2}
                    step={0.01}
                    onChange={(event, newValue) =>
                      debouncedSetBiases(key, newValue)
                    }
                    valueLabelDisplay="auto"
                  />
                  <Typography variant="caption" color="text.secondary">
                    Increasing {key} bias makes this neuron more likely to activate.
                  </Typography>
                </Box>
              ))}
            </Box>

            {/* Reset Button */}
            <Box display="flex" justifyContent="center">
              <Button variant="contained" color="primary" onClick={resetAll}>
                Reset to Defaults
              </Button>
            </Box>
          </Box>
        </CardContent>
      </Card>
    </ThemeProvider>
  );
};

export default NeuralNetworkViz;
