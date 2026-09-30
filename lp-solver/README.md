# LP Solver Module

## Overview

The LP (Linear Programming) Solver module is the heart of the HedgeIoT market clearing mechanism. It implements sophisticated optimization algorithms using GLPK.js to solve energy trading matching problems, determine optimal clearing prices, and maximize social welfare in the energy flexibility market.

## Purpose

- Solve linear programming optimization problems for energy market clearing
- Match buy and sell orders optimally across trading nodes
- Determine market clearing prices and quantities
- Maximize social welfare through optimal resource allocation
- Process aggregated curves into settled trading results

## Key Components

### Controller: `LpSolverController`

Provides REST endpoints for triggering market clearing optimization.

#### Endpoints:

- `POST /solver/mtu/:mtu_id/solve` - Trigger LP optimization for a specific MTU

### Service: `LpSolverService`

Contains the core linear programming optimization logic.

#### Key Methods:

- `solvePerMtu(mtu_id)` - Main solver entry point for MTU clearing
- `_solveMatchingProblem(sellCurve, buyCurve)` - Core optimization algorithm
- `_groupCurvesByDirection(points)` - Organize curve points by buy/sell direction

## Mathematical Optimization Model

### Objective Function

**Maximize Social Welfare:**

```
max: Σ(buy_price × buy_quantity) - Σ(sell_price × sell_quantity)
```

### Decision Variables

- `Qsi`: Quantity allocated from sell curve point i
- `Qbj`: Quantity allocated to buy curve point j

### Constraints

1. **Supply-Demand Balance:**

   ```
   Σ(Qsi) = Σ(Qbj)
   ```

2. **Quantity Bounds:**

   ```
   0 ≤ Qsi ≤ available_sell_quantity[i]
   0 ≤ Qbj ≤ available_buy_quantity[j]
   ```

3. **Price Equilibrium:**
   ```
   clearing_price = dual_variable(balance_constraint)
   ```

## Market Clearing Algorithm

### 1. Node-Level Processing

```typescript
for each trading_node {
  // Get aggregated curves for this node and MTU
  aggregated_curves = getAggregatedCurves(node_id, mtu_id);

  // Group by direction
  sell_curve = curves.filter(direction == 'SELL');
  buy_curve = curves.filter(direction == 'BUY');

  // Solve optimization
  results = solveMatchingProblem(sell_curve, buy_curve);
}
```

### 2. GLPK Model Construction

```typescript
model = {
  objective: {
    direction: MAXIMIZE,
    variables: [
      // Sell variables (negative coefficients)
      { name: 'Qs0', coefficient: -0.25 * sell_price[0] },
      { name: 'Qs1', coefficient: -0.25 * sell_price[1] },

      // Buy variables (positive coefficients)
      { name: 'Qb0', coefficient: 0.25 * buy_price[0] },
      { name: 'Qb1', coefficient: 0.25 * buy_price[1] },
    ],
  },
  constraints: [
    // Balance constraint
    {
      name: 'supply_demand_balance',
      variables: [...sell_vars, ...buy_vars],
      bound: 0(equality),
    },
  ],
  bounds: [
    // Variable bounds based on available quantities
    { variable: 'Qs0', min: 0, max: available_sell[0] },
    { variable: 'Qb0', min: 0, max: available_buy[0] },
  ],
};
```

### 3. Result Processing

```typescript
solution = glpk.solve(model);

clearing_price = solution.dual_variables.supply_demand_balance;

for each allocated_quantity {
  update_aggregated_curve_point(clearing_price, quantity);
  update_original_order(clearing_price, quantity, welfare);
}
```

## Technical Implementation

### GLPK Integration

- **Library**: `glpk.js` - JavaScript binding for GNU Linear Programming Kit
- **Solver Method**: Simplex algorithm with dual pricing
- **Problem Type**: Continuous linear programming (LP)
- **Scale**: Handles hundreds of variables efficiently

### Data Flow

1. **Input**: Aggregated curve points from closed trading window
2. **Grouping**: Separate buy and sell curves per node
3. **Modeling**: Construct LP problem with welfare maximization
4. **Solving**: Execute GLPK simplex algorithm
5. **Processing**: Extract clearing prices and quantities
6. **Updating**: Persist results to database

### Price Calculation Strategy

- **Clearing Price**: Extracted from dual variable of balance constraint
- **Economic Interpretation**: Marginal value of additional unit of energy
- **Market Efficiency**: Ensures no arbitrage opportunities remain

## Business Logic

### Market Clearing Process

1. **Trigger**: Called after trading window closes for an MTU
2. **Node Iteration**: Process each trading node independently
3. **Curve Processing**: Use aggregated buy/sell curves as input
4. **Optimization**: Maximize total social welfare
5. **Settlement**: Update orders with clearing results

### Welfare Maximization

The LP solver maximizes **consumer surplus + producer surplus**:

- **Consumer Surplus**: Difference between willingness to pay and clearing price
- **Producer Surplus**: Difference between clearing price and marginal cost
- **Total Welfare**: Sum of both surpluses across all participants

### Order Status Transitions

```
ACTIVE → TRANSIT → CLEARED
```

- Orders marked as `TRANSIT` during solving
- Successfully matched orders become `CLEARED`
- Clearing price and quantity populated

## API Documentation

### Solve MTU

```http
POST /solver/mtu/123/solve

Response: {
  "node_1": [
    {
      "clearing_price": 52.5,
      "total_quantity": 150,
      "welfare": 7850.0
    }
  ],
  "node_2": [...],
  ...
}
```

**Response Structure:**

- Node-level results with clearing outcomes
- Clearing price determined by optimization
- Total quantities allocated per node
- Social welfare generated

**Status Codes:**

- `200`: Successful optimization and clearing
- `400`: Invalid input data or infeasible problem
- `404`: MTU not found or no data available

## Algorithm Performance

### Computational Complexity

- **Time Complexity**: O(n³) where n = number of curve points
- **Space Complexity**: O(n²) for constraint matrix
- **Scalability**: Efficient for typical market sizes (100-1000 orders)

### Optimization Features

- **Sparse Matrix**: Efficient memory usage for large problems
- **Dual Pricing**: Fast convergence to optimal solution
- **Numerical Stability**: Robust handling of floating-point precision

### Performance Considerations

- **Node-Level Parallelization**: Independent solving per node
- **Memory Management**: Efficient GLPK instance lifecycle
- **Error Handling**: Graceful handling of infeasible problems

## Error Handling

### Infeasible Problems

- **Detection**: GLPK returns infeasibility status
- **Causes**: Mismatched supply/demand, constraint conflicts
- **Recovery**: Relaxed constraints or partial clearing

### Numerical Issues

- **Precision**: Handle floating-point rounding errors
- **Scaling**: Normalize large price/quantity differences
- **Validation**: Verify solution feasibility

## Dependencies

- **glpk.js**: Linear programming solver library
- **TypeORM**: Database operations for results persistence
- **NestJS Common**: Framework components

## Related Modules

- **Aggregated Curves Module**: Provides input data for optimization
- **Orders Module**: Receives clearing results for settlement
- **Timeframes Module**: Triggers solving on MTU closure
- **Settlement Module**: Processes financial implications
- **Analytics Module**: Uses clearing data for market insights

## Mathematical Examples

### Simple Two-Participant Market

```
Sell Orders:
- Order 1: 100 MW at €45/MWh
- Order 2: 50 MW at €50/MWh

Buy Orders:
- Order 3: 80 MW at €55/MWh
- Order 4: 70 MW at €48/MWh

Optimal Solution:
- Clearing Price: €50/MWh
- Cleared Quantity: 150 MW
- Welfare: (55-50)×80 + (48-50)×70 + (50-45)×100 + (50-50)×50 = 400 + (-140) + 500 + 0 = €760
```

### Multi-Price Curve Example

```
Buy Curve (descending prices):
- 50 MW at €60/MWh
- 75 MW at €55/MWh
- 100 MW at €50/MWh

Sell Curve (ascending prices):
- 60 MW at €45/MWh
- 80 MW at €52/MWh
- 85 MW at €58/MWh

Result: Clearing at €52/MWh, 140 MW cleared
```

## Usage Examples

### Trigger Market Clearing

```typescript
// Solve for specific MTU
const results = await lpSolverService.solvePerMtu(123);

// Check results per node
for (const [nodeId, nodeResults] of Object.entries(results)) {
  console.log(
    `Node ${nodeId} cleared ${nodeResults.total_quantity} MW at €${nodeResults.clearing_price}/MWh`,
  );
}
```

### Integration with Market Procedures

```typescript
// In TimeframeService MTU closure procedure
async onMtuClosure(mtuId: number) {
  // 1. Create aggregated curves
  await aggregatedCurvesService.createAggregatetedCurveForMtus(mtuId);

  // 2. Solve optimization
  const clearingResults = await lpSolverService.solvePerMtu(mtuId);

  // 3. Process settlement
  await settlementService.processResults(mtuId, clearingResults);
}
```

## Future Enhancements

- **Multi-Product Optimization**: Handle different energy products simultaneously
- **Network Constraints**: Include grid capacity limitations
- **Stochastic Optimization**: Handle uncertainty in supply/demand
- **Auction Mechanisms**: Alternative price discovery methods
- **Real-Time Solving**: Continuous market clearing
- **Machine Learning**: Predictive optimization parameters
