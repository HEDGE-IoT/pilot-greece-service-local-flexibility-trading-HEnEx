import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThanOrEqual, MoreThanOrEqual, Repository } from 'typeorm';
import { AggregatedCurvesService } from '../aggregated-curves/aggregated_curves.service';
import { LpSolverService } from '../lp-solver/lp-solver.service';
import { NotificationService } from '../notifications/notification.service';
import { MTUEntity } from './entities/mtu.entity';
import { TradingWindow } from './entities/trading-window.entity';

@Injectable()
export class TimeframeService {
  logger: Logger;

  constructor(
    @InjectRepository(MTUEntity)
    private mtuRepo: Repository<MTUEntity>,
    @InjectRepository(TradingWindow)
    private tradingWindowRepo: Repository<TradingWindow>,
    private aggregatedCurvesService: AggregatedCurvesService,
    private lpSolverService: LpSolverService,
    private notificationService: NotificationService,
  ) {
    this.logger = new Logger(TimeframeService.name);
  }

  async listTradingWindows(twd_from, twd_to) {
    //! Important to note that the trading window is a 24-hour period
    //! Also must check this function to see if it is working correctly
    //? even if not working correctly, it is not a big deal as it is filtered again in the front end

    // Default filters to undefined if not provided
    let fromDate = undefined;
    let toDate = undefined;

    if (twd_from) {
      const [dayFrom, monthFrom, yearFrom] = twd_from.split('-').map(Number);
      fromDate = new Date(yearFrom, monthFrom - 1, dayFrom);
      if (isNaN(fromDate.getTime())) {
        throw new HttpException(
          'Invalid from date format. Please use DD-MM-YYYY format.',
          HttpStatus.BAD_REQUEST,
        );
      }
    }

    if (twd_to) {
      const [dayTo, monthTo, yearTo] = twd_to.split('-').map(Number);
      toDate = new Date(yearTo, monthTo - 1, dayTo + 1);
      toDate.setUTCHours(0, 0, 0);
      if (isNaN(fromDate.getTime())) {
        throw new HttpException(
          'Invalid to date format. Please use DD-MM-YYYY format.',
          HttpStatus.BAD_REQUEST,
        );
      }
    }

    const where: any = {};
    if (fromDate) {
      where.twd_from = MoreThanOrEqual(fromDate);
    }
    if (toDate) {
      where.twd_to = LessThanOrEqual(toDate);
    }

    const res = await this.tradingWindowRepo.find({
      where,
      relations: { twd_fk_mtu_id: true },
    });

    return res;
  }

  async listMtus(inputDateStr: string) {
    // Default filters to undefined if not provided
    this.logger.log(`List MTUs ${inputDateStr}`);
    let fromDate = undefined;
    let toDate = undefined;
    let selectedDay: Date;
    const [day, month, year] = inputDateStr.split('-').map(Number);
    selectedDay = new Date(year, month - 1, day); // JavaScript months are zero-based

    if (inputDateStr) {
      const [dayFrom, monthFrom, yearFrom] = inputDateStr
        .split('-')
        .map(Number);
      fromDate = new Date(yearFrom, monthFrom - 1, dayFrom);

      fromDate.setHours(0, 0, 0, 0);

      if (isNaN(fromDate.getTime())) {
        throw new HttpException(
          'Invalid from date format. Please use DD-MM-YYYY format.',
          HttpStatus.BAD_REQUEST,
        );
      }
    }

    if (inputDateStr) {
      const [dayTo, monthTo, yearTo] = inputDateStr.split('-').map(Number);
      toDate = new Date(yearTo, monthTo - 1, dayTo + 1);
      toDate.setHours(0, 0, 0, 0);

      if (isNaN(toDate.getTime())) {
        throw new HttpException(
          'Invalid to date format. Please use DD-MM-YYYY format.',
          HttpStatus.BAD_REQUEST,
        );
      }
    }

    const where: any = {};

    if (fromDate) {
      where.mtu_from = MoreThanOrEqual(fromDate);
    }

    if (toDate) {
      where.mtu_to = LessThanOrEqual(toDate);
    }

    const res = await this.mtuRepo.find({
      where,
      relations: { tradingWindow: true },
    });

    return res;
  }

  async getMtuById(id: number) {
    return await this.mtuRepo.findOne({
      where: { mtu_id: id },
      relations: { tradingWindow: true },
    });
  }

  async createDatesTimeframes(inputDateStr: string) {
    this.logger.log(`\n\nCreate Dates Timeframes for ${inputDateStr}`);
    try {
      // Convert inputDateStr to a Date object if provided; otherwise, default to the next day
      let selectedDay: Date;
      const [day, month, year] = inputDateStr.split('-').map(Number);
      selectedDay = new Date(year, month - 1, day); // JavaScript months are zero-based

      selectedDay.setHours(0, 0, 0, 0);

      const mtuRows = [];
      for (let i = 0; i < 96; i++) {
        const mtu_from = new Date(selectedDay);

        mtu_from.setMinutes(i * 15);

        mtu_from.setSeconds(0, 0);

        const mtu_to = new Date(mtu_from);
        mtu_to.setMinutes(mtu_from.getMinutes() + 15);

        mtuRows.push(
          this.mtuRepo.create({
            mtu_from: mtu_from.toISOString(),
            mtu_to: mtu_to.toISOString(),
          }),
        );
      }

      const mtus = await this.mtuRepo.save(mtuRows);
      // Create the TradingWindows array
      const tradingWindows: TradingWindow[] = [];

      for (const mtu of mtus) {
        // Set twd_from to 15:00:00 of the previous day relative to the selected day
        const previousDay = new Date(selectedDay); //! it is already the previous day
        previousDay.setDate(previousDay.getDate() - 1);
        previousDay.setHours(15, 0, 0, 0);

        // Calculate twd_to as one hour before mtu_from
        const twd_to = new Date(mtu.mtu_from);
        //it already has the offset
        twd_to.setHours(twd_to.getHours() - 1); // remove 1 hour because it closes one hour before

        const tradingWindow = this.tradingWindowRepo.create({
          twd_from: previousDay.toISOString(),
          twd_to: twd_to.toISOString(),
          twd_fk_mtu_id: mtu,
        });

        tradingWindows.push(tradingWindow);
      }

      // Save the TradingWindow entries
      if (tradingWindows.length > 0) {
        await this.tradingWindowRepo.save(tradingWindows);
      }
      return HttpStatus.OK;
    } catch (error: any) {
      this.logger.error(error);
      throw new HttpException(
        `Error while creating MTUs for ${inputDateStr}`,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  async mtuClosureProcedure() {
    //todo: runs on every function needed to be run.
    const currentTime = new Date().toISOString();
    this.logger.log(`Running onMtuClosure task at ${currentTime}`);

    try {
      const now = new Date();

      const mtus = await this.mtuRepo.find({
        where: {
          mtu_on_closure_procedure: false,
        },
        relations: {
          tradingWindow: true,
        },
      });

      const closedMtus = mtus.filter(
        (mtu) =>
          new Date(mtu.tradingWindow.twd_to).toISOString() <= now.toISOString(),
      );

      this.logger.debug(
        `Found ${closedMtus.length} MTUs that need closure procedure.`,
      );

      for (const mtu of closedMtus) {
        try {
          await this.aggregatedCurvesService.createAggregatetedCurveForMtus(
            mtu.mtu_id,
          );

          mtu.mtu_on_closure_procedure = true;
          await this.mtuRepo.save(mtu);

          await this.lpSolverService.solvePerMtu(mtu.mtu_id);

          // this.notificationService.sendNotificationToAllUsers({
          //   event: NEvents.MTU_CLOSED,
          //   message: getNotificationText(NEvents.MTU_CLOSED)(mtu),
          //   type: NotificationTypeEnum.SYSTEM,
          // });
        } catch (error) {
          this.logger.error(
            `onMTUClossure - Error processing MTU with id ${mtu.mtu_id}: ${error.message}`,
            error.stack,
          );
        }
      }

      this.logger.log(
        `Updated mtu_on_closure_procedure to true for ${closedMtus.length} MTUs.`,
      );
    } catch (error) {
      this.logger.error(
        `Error in onMtuClosure task: ${error.message}`,
        error.stack,
      );
    }
  }

  async onCreateMtuAndTwEveryWeek() {
    //todo: runs every week and creates the MTU and TWD for next week.
    this.logger.debug('Starting weekly task onCreateMTUandTW_EVERY_WEEK');
    // this will run on every start of every sunday at 00:00

    const today = new Date(0);
    this.logger.debug(`Initial date set to: ${today.toISOString()}`);

    const runDate = new Date();
    this.logger.debug(`Run date: ${runDate.toISOString()}`);
    // Calculate next week's Monday by adding 9 days (since today is assumed to be Sunday)
    const nextMonday = new Date(runDate);
    nextMonday.setDate(runDate.getDate() + 8);
    nextMonday.setHours(0, 0, 0, 0);
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
        await this.createDatesTimeframes(date);
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

  async onCreateMtuAndTwEveryDay() {
    // //todo: runs every day and if the MTUs and Trading Windows are created.
    // //todo: Not for D+1 but for D+2.

    const today = new Date();
    this.logger.log(
      `onCreateMTUandTW_EVERY_DAY started. Today: ${today.toISOString()}`,
    );

    const nextDay = new Date(today);
    nextDay.setDate(nextDay.getDate() + 1);
    nextDay.setHours(0, 0, 0, 0);

    const startOfNextDay = new Date(nextDay);
    startOfNextDay.setHours(0, 0, 0, 0);
    // startOfNextDay.setSeconds(startOfNextDay.getSeconds() - 1);
    this.logger.debug(
      `Start of next day (adjusted): ${startOfNextDay.toISOString()}`,
    );

    const endOfNextDay = new Date(nextDay);
    endOfNextDay.setDate(endOfNextDay.getDate() + 1);
    endOfNextDay.setHours(0, 0, 0, 0);

    this.logger.debug(`End of next day: ${endOfNextDay.toISOString()}`);

    const where: any = {};
    where.mtu_from = MoreThanOrEqual(startOfNextDay);
    where.mtu_to = LessThanOrEqual(endOfNextDay);
    const tommorowsMTU = await this.mtuRepo.find({
      where,
      relations: { tradingWindow: true },
    });

    if (tommorowsMTU.length > 0) {
      this.logger.debug(
        'MTUs for tomorrow already exist:',
        tommorowsMTU.length,
      );

      if (tommorowsMTU.length != 96) {
        this.logger.warn(
          `${today.toISOString()} has less than 96 Mtus. It has ${tommorowsMTU.length}`,
        );
      }

      return;
    }

    const nextDayString = `${nextDay.getDate()}-${nextDay.getMonth() + 1}-${nextDay.getFullYear()}`;
    this.logger.debug(
      `No MTUs found for tomorrow. Creating timeframe for: ${nextDayString}`,
    );

    try {
      await this.createDatesTimeframes(nextDayString);
      this.logger.debug(
        `Timeframe successfully created for date ${nextDayString}`,
      );
    } catch (error) {
      this.logger.error(
        `Error creating timeframe for ${nextDayString}: ${error.message}`,
        error.stack,
      );
    }
  }
}
