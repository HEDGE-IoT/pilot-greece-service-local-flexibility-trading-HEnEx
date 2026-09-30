import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { TimeframeService } from './timeframe.service';

@ApiTags('Timeframes')
@Controller('timeframe')
export class TimeframeController {
  constructor(private readonly timeframeService: TimeframeService) {}
  @ApiOperation({ summary: 'Create timeframes for a specific date' })
  @ApiResponse({ status: 201, description: 'Timeframes successfully created' })
  @ApiResponse({ status: 400, description: 'Bad request - Invalid input data' })
  @ApiBody({
    schema: { properties: { date: { type: 'string', example: '2023-01-01' } } },
  })
  @Post('/create') //todo: this must change name
  async createDatesTimeframes(@Body() body: { date: string }) {
    return this.timeframeService.createDatesTimeframes(body.date);
  }

  @ApiOperation({ summary: 'Get list of trading windows' })
  @ApiResponse({
    status: 200,
    description: 'Returns a list of trading windows',
  })
  @ApiQuery({
    name: 'from',
    required: false,
    description: 'Start date for filtering trading windows',
    type: 'string',
  })
  @ApiQuery({
    name: 'to',
    required: false,
    description: 'End date for filtering trading windows',
    type: 'string',
  })
  @Get('/trading-windows/list')
  async listTradingWindows(
    @Query('from') twd_from?: string,
    @Query('to') twd_to?: string,
  ) {
    return this.timeframeService.listTradingWindows(twd_from, twd_to);
  }
  @ApiOperation({ summary: 'Get list of MTUs' })
  @ApiResponse({
    status: 200,
    description: 'Returns a list of Market Time Units',
  })
  @ApiQuery({
    name: 'date',
    required: false,
    description: 'Filter MTUs by date',
    type: 'string',
  })
  @Get('/mtus/list')
  async listMtus(@Query('date') date?: string) {
    return this.timeframeService.listMtus(date);
  }
  @ApiOperation({ summary: 'Get MTU by ID' })
  @ApiResponse({
    status: 200,
    description: 'Returns the Market Time Unit with the specified ID',
  })
  @ApiResponse({ status: 404, description: 'MTU not found' })
  @ApiParam({ name: 'id', description: 'MTU ID', type: 'number' })
  @Get('/mtus/:id')
  async getMtu(@Param('id', ParseIntPipe) id: number) {
    return this.timeframeService.getMtuById(id);
  }
  @ApiOperation({
    summary: 'Run daily task to create MTUs and Trading Windows',
  })
  @ApiResponse({ status: 201, description: 'Daily task successfully executed' })
  @Post('/task/daily')
  async dailyTask() {
    return this.timeframeService.onCreateMtuAndTwEveryDay();
  }

  @Post('/task/weekly')
  async weeklyTask() {
    return this.timeframeService.onCreateMtuAndTwEveryWeek();
  }
}
