# Neural Networks and Machine Learning

A single, self-contained HTML file: Train a single neuron, then a network with a hidden layer, to sort coloured points: watch the decision boundary move, the weights change and the loss fall; see why one neuron cannot learn XOR, how the learning rate matters, and how a network overfits. It needs no install and no
internet: **open `neural-networks-and-ml.html` in Chrome or Edge**. Printable worksheets (one per
investigation and per batch experiment, with teacher notes) are in
`worksheets.html`.

Built with the shared kit from `tools/kit/src/neural_networks_and_ml.js` by `node build.js` (run inside
`tools/kit/`). Do not edit `neural-networks-and-ml.html` by hand.

- **AI concepts:** Cambridge International AS & A Level Computer Science 9618: an introduction to how machine learning works, using labelled data to train a single artificial neuron to separate two groups of points. (AI and machine learning are examined at A Level, topic 18.)
- **A Level (9618):** Cambridge International AS & A Level Computer Science 9618 (A Level) topic 18.1 Artificial Intelligence: machine learning (supervised, unsupervised, reinforcement), deep learning, artificial neural networks with input, hidden and output layers, weights, activation and back propagation of errors; regression methods. Training and test data and overfitting.

## What it shows

A square of labelled points (filled = training, ringed = test) with the network's output shaded behind them and its decision boundary in white, beside a diagram of the network whose lines show each weight's sign and size. Charts of loss and accuracy for training and test data, epoch by epoch.

Try this first: Can one neuron learn XOR? Now give it 4 hidden neurons.

## Batch run

| Experiment | Result when tested (fixed seeds) |
|---|---|
| How fast does one neuron learn a straight line? | mean 0.969, SD 0.0112, SE 0.00144 from 60 runs |
| Single neuron against XOR | mean 0.514, SD 0.0832, SE 0.0107 from 60 runs (theory: best possible for a straight line: about ¾) |
| Hidden neurons and the circle (A level) | 0: 0.606 ± 0.072 · 1: 0.684 ± 0.0175 · 2: 0.682 ± 0.0102 · 3: 0.803 ± 0.0493 · 4: 0.887 ± 0.0217 · 6: 0.895 ± 0.0215 · 8: 0.842 ± 0.0373 (mean ± SE, 4 runs each) |
| Overfitting and training-set size (A level) | 20: 0.178 ± 0.0583 · 40: 0.112 ± 0.0828 · 80: 0.0481 ± 0.0608 · 160: -9.72e-4 ± 0.00376 · 320: -0.00479 ± 0.0396 (mean ± SE, 3 runs each) |

## The model

A 2–H–1 network (tanh hidden units, sigmoid output) trained by stochastic gradient descent on cross-entropy loss. Assumptions and simplifications are listed inside the simulation under **The model**.
