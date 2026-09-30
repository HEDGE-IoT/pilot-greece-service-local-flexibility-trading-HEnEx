import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';

import { Repository } from 'typeorm';
import { AggregatedCurvesService } from '../../aggregated-curves/aggregated_curves.service';
import { LpSolverService } from '../../lp-solver/lp-solver.service';
import { MTUEntity } from '../entities/mtu.entity';
import { TradingWindow } from '../entities/trading-window.entity';
import { TimeframeService } from '../timeframe.service';

@Injectable()
export class TimeframeTaskService {
  logger: Logger;

  constructor(
    @InjectRepository(MTUEntity)
    private mtuRepo: Repository<MTUEntity>,
    @InjectRepository(TradingWindow)
    private tradingWindowRepo: Repository<TradingWindow>,
    private timeframesService: TimeframeService,
    private aggregatedCurvesService: AggregatedCurvesService, // Add this line
    private lpSolverService: LpSolverService, // Add this line
  ) {
    this.logger = new Logger(TimeframeTaskService.name);
  }

  @Cron('0 */15 * * * *')
  async onMtuClosure() {
    await this.timeframesService.mtuClosureProcedure();
  }

  @Cron(CronExpression.EVERY_WEEK)
  async onCreateMTUandTW_EVERY_WEEK() {
    this.logger.debug('Starting weekly task onCreateMTUandTW_EVERY_WEEK');
    // this will run on every start of every sunday at 00:00

    const today = new Date(0);
    this.logger.debug(`Initial date set to: ${today.toISOString()}`);

    const runDate = new Date();
    this.logger.debug(`Run date: ${runDate.toISOString()}`);
    // Calculate next week's Monday by adding 9 days (since today is assumed to be Sunday)
    const nextMonday = new Date(runDate);
    nextMonday.setDate(runDate.getDate() + 9);
    nextMonday.setUTCHours(0, 0, 0, 0);
    this.logger.debug(`Next Monday calculated as: ${nextMonday.toISOString()}`);

    const nextWeekDates: string[] = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(nextMonday);
      day.setDate(nextMonday.getDate() + i);
      const dayString = `${day.getDate()}-${day.getMonth() + 1}-${day.getFullYear()}`;
      nextWeekDates.push(dayString);
      this.logger.debug(`Added date: ${dayString}`);
    }

    for (let date of nextWeekDates) {
      this.logger.debug(`Creating timeframe for date: ${date}`);
      try {
        await this.timeframesService.createDatesTimeframes(date);
        this.logger.debug(`Successfully created timeframe for ${date}`);
      } catch (error) {
        this.logger.error(
          `Error creating timeframe for ${date}: ${error.message}`,
          error.stack,
        );
      }
    }

    this.logger.debug('Completed weekly task onCreateMTUandTW_EVERY_WEEK');
  }

  @Cron('0 5 9 * * *')
  async onCreateMTUandTW_EVERY_DAY() {
    await this.timeframesService.onCreateMtuAndTwEveryDay();
  }
}
