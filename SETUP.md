# Setup Guide

This document guides you through setting up yantraverse.

## Installation

```bash
npm install yantraverse
```

## Quick Start

Create a simple server:

```javascript
const yantraverse = require('yantraverse');
const app = yantraverse();

app.get('/', (req, res) => {
  res.json({ message: 'Hello World' });
});

app.listen(3000);
```

## File Structure

See the file map in README.md for the complete project structure.
