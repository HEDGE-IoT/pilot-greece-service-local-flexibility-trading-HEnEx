# Timeframes Module

## Overview

The Timeframes module manages temporal aspects of the energy trading system, including Market Time Units (MTUs) and Trading Windows. It handles the creation of trading periods, scheduling of market activities, and execution of automated procedures for market clearing and settlement.

## Purpose

- Define and manage Market Time Units (MTUs) for energy trading
- Create and manage Trading Windows for order submission
- Schedule automated market procedures and tasks
- Handle MTU closure and market clearing procedures
- Support temporal filtering and querying for market data

## Key Components

### Controller: `TimeframeController`

Handles HTTP requests for timeframe management operations.

#### Endpoints:

- `POST /timeframe/create` - Create timeframes for a specific date
- `GET /timeframe/trading-windows/list` - Get trading windows with date filtering
- `GET /timeframe/mtus/list` - Get MTUs with optional date filtering
- `GET /timeframe/mtus/:id` - Get specific MTU by ID
- `POST /timeframe/task/daily` - Manually trigger daily task
- `POST /timeframe/task/weekly` - Manually trigger weekly task

### Service: `TimeframeService`

Contains business logic for timeframe management and automated procedures.

#### Key Methods:

- `createDatesTimeframes(date)` - Create MTUs and Trading Windows for a date
- `listTradingWindows(from?, to?)` - Retrieve trading windows with filtering
- `listMtus(date?)` - Get MTUs with optional date filtering
- `getMtuById(id)` - Get specific MTU with relationships
- `mtuClosureProcedure()` - Execute market clearing on MTU closure
- `onCreateMtuAndTwEveryDay()` - Daily automated timeframe creation
- `onCreateMtuAndTwEveryWeek()` - Weekly automated timeframe creation

### Tasks: `TimeframeTaskService`

Automated scheduling service for market procedures.

#### Scheduled Tasks:

- **MTU Closure**: Every 15 minutes - Check and process closed MTUs
- **Daily Creation**: Daily at 09:05 - Create next day's timeframes
- **Weekly Creation**: Weekly on Sunday - Create next week's timeframes

## Entities

### `MTUEntity` (Market Time Unit)

Represents a trading period in the energy market.

#### Key Fields:

- `mtu_id` - Primary key
- `mtu_from` - Start timestamp of the MTU
- `mtu_to` - End timestamp of the MTU
- `mtu_on_closure_procedure` - Flag indicating closure processing completion

#### Relationships:

- One-to-One with `TradingWindow` (associated trading window)
- One-to-Many with `Order` (orders submitted for this MTU)
- One-to-Many with `AggregatedCurvePoint` (aggregated market data)

#### Business Rules:

- MTUs have unique time ranges (no overlapping periods)
- Typically 15-minute intervals for intraday trading
- Cannot be deleted once orders are associated

### `TradingWindow`

Represents the time period when orders can be submitted for an MTU.

#### Key Fields:

- `twd_id` - Primary key
- `twd_from` - Start timestamp for order submission
- `twd_to` - End timestamp for order submission

#### Relationships:

- One-to-One with `MTUEntity` (associated MTU)

#### Business Rules:

- Trading window opens before MTU starts
- Trading window closes before MTU execution
- Gate closure time allows for market clearing procedures

## Temporal Architecture

### MTU Structure

```
Day: 2023-01-01
MTUs: 96 x 15-minute periods
├── MTU 1:  00:00 - 00:15
├── MTU 2:  00:15 - 00:30
├── MTU 3:  00:30 - 00:45
├── ...
└── MTU 96: 23:45 - 24:00
```

### Trading Window Timeline

```
MTU:            [──── 00:00-00:15 ────]
Trading Window: [── 15:00 (D-1) -23:00 ──]
Gate Closure:                     ↑ (1 hour before MTU)
```

### Market Procedure Timeline

1. **T-30 min**: Trading window opens
2. **T-5 min**: Trading window closes (gate closure)
3. **T-5 to T-0**: Market clearing and optimization
4. **T**: MTU execution begins
5. **T+15**: MTU ends, settlement calculations

## Automated Tasks

### MTU Closure Procedure

Runs every 15 minutes to process closed trading windows:

```typescript
@Cron('0 */15 * * * *')
async onMtuClosure() {
  // 1. Find MTUs with closed trading windows
  // 2. Create aggregated curves from orders
  // 3. Run LP solver for optimal clearing
  // 4. Update orders with clearing results
  // 5. Mark MTU closure procedure as complete
}
```

### Daily Timeframe Creation

Runs daily at 09:05 to create next day's timeframes:

```typescript
@Cron('0 5 9 * * *')
async onCreateMTUandTW_EVERY_DAY() {
  // Create 96 MTUs for next day
  // Create associated trading windows
  // Set appropriate timing offsets
}
```

### Weekly Timeframe Creation

Runs weekly on Sunday to create next week's timeframes:

```typescript
@Cron(CronExpression.EVERY_WEEK)
async onCreateMTUandTW_EVERY_WEEK() {
  // Calculate next week's dates
  // Create timeframes for all 7 days
  // Handle holiday scheduling adjustments
}
```

## API Documentation

### Create Timeframes

```http
POST /timeframe/create
Content-Type: application/json

{
  "date": "2023-01-01"
}

Response: Created MTUs and Trading Windows for the date
```

### List Trading Windows

```http
GET /timeframe/trading-windows/list?from=2023-01-01&to=2023-01-07

Query Parameters:
- from: Start date filter (optional)
- to: End date filter (optional)

Response: TradingWindow[]
```

### List MTUs

```http
GET /timeframe/mtus/list?date=2023-01-01

Query Parameters:
- date: Filter MTUs by specific date (optional)

Response: MTUEntity[]
```

### Get MTU Details

```http
GET /timeframe/mtus/123

Response: MTUEntity with orders, trading window, and aggregated curves
```

## Business Logic

### Timeframe Creation Logic

1. **Date Parsing**: Convert input date to proper format
2. **MTU Generation**: Create 96 15-minute intervals for the day
3. **Trading Window Creation**: Generate windows with appropriate lead times
4. **Validation**: Ensure no duplicate or overlapping timeframes
5. **Database Storage**: Persist MTUs and trading windows atomically

### Market Clearing Integration

1. **Trigger Detection**: Monitor for closed trading windows
2. **Order Aggregation**: Call AggregatedCurvesService to create curves
3. **Optimization**: Use LpSolverService for market clearing
4. **Result Processing**: Update orders with clearing prices and quantities
5. **Status Updates**: Mark MTU closure procedure as complete

### Scheduling Considerations

- **Timezone Handling**: All times in UTC for consistency
- **Holiday Management**: Special handling for non-trading days
- **Error Recovery**: Retry mechanisms for failed procedures
- **Load Management**: Distribute processing across time intervals

## Database Schema

### MTU Entity Table

```sql
CREATE TABLE mtu_entity (
  mtu_id SERIAL PRIMARY KEY,
  mtu_from TIMESTAMP NOT NULL,
  mtu_to TIMESTAMP NOT NULL,
  mtu_on_closure_procedure BOOLEAN DEFAULT FALSE,
  date_created TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  date_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(mtu_from, mtu_to)
);
```

### Trading Window Table

```sql
CREATE TABLE trading_window (
  twd_id SERIAL PRIMARY KEY,
  twd_from TIMESTAMP NOT NULL,
  twd_to TIMESTAMP NOT NULL,
  twd_fk_mtu_id INTEGER REFERENCES mtu_entity(mtu_id),
  date_created TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  date_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Dependencies

- **@nestjs/schedule**: Cron job scheduling
- **TypeORM**: Database operations and relationships
- **NestJS Common**: Framework components
- **Aggregated Curves Service**: Market data aggregation
- **LP Solver Service**: Market optimization

## Related Modules

- **Orders Module**: Orders are associated with MTUs
- **Aggregated Curves Module**: Creates curves when trading windows close
- **LP Solver Module**: Performs market clearing optimization
- **Settlement Module**: Processes clearing results
- **Analytics Module**: Uses timeframe data for reporting

## Performance Considerations

- **Indexing**: Timestamp fields indexed for efficient querying
- **Batch Processing**: Multiple MTUs created in single transactions
- **Caching**: Frequently accessed MTUs cached in memory
- **Async Processing**: Market clearing runs asynchronously

## Error Handling

- **Duplicate Prevention**: Unique constraints prevent duplicate timeframes
- **Transaction Safety**: Atomic creation of MTUs and trading windows
- **Recovery Procedures**: Failed market clearing can be retried
- **Logging**: Comprehensive logging for debugging scheduled tasks

## Configuration

Environment variables for timeframe configuration:

```env
# Market timing configuration
MTU_DURATION_MINUTES=15
TRADING_WINDOW_LEAD_TIME_MINUTES=30
GATE_CLOSURE_MINUTES=5

# Scheduling configuration
ENABLE_AUTOMATED_TASKS=true
DAILY_CREATION_TIME="0 5 9 * * *"
WEEKLY_CREATION_TIME="0 0 0 * * 0"
```

## Usage Examples

### Manual Timeframe Creation

```typescript
// Create timeframes for a specific date
await timeframeService.createDatesTimeframes('01-01-2023');

// Get today's MTUs
const todayMtus = await timeframeService.listMtus('01-01-2023');

// Check current MTU
const now = new Date();
const currentMtu = todayMtus.find(
  (mtu) => new Date(mtu.mtu_from) <= now && now < new Date(mtu.mtu_to),
);
```

### Market Procedure Integration

```typescript
// Process all closed MTUs
await timeframeService.mtuClosureProcedure();

// Check MTU closure status
const mtu = await timeframeService.getMtuById(123);
if (mtu.mtu_on_closure_procedure) {
  console.log('Market clearing completed for this MTU');
}
```

### Trading Window Validation

```typescript
// Check if trading window is open
const tradingWindow = mtu.tradingWindow;
const now = new Date();
const isOpen =
  now >= new Date(tradingWindow.twd_from) &&
  now <= new Date(tradingWindow.twd_to);

if (!isOpen) {
  throw new Error('Trading window is closed');
}
```

## Future Enhancements

- Dynamic MTU duration configuration
- Holiday calendar integration
- Real-time market status dashboard
- Advanced scheduling rules
- Market suspension capabilities
- Cross-border market synchronization
