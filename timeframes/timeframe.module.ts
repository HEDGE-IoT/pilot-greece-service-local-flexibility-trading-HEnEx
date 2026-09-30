import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AggregatedCurvePoint } from '../aggregated-curves/aggregated_curve_point.entity';
import { AggregatedCurvesService } from '../aggregated-curves/aggregated_curves.service';
import { Company } from '../company/company.entity';
import { LpSolverService } from '../lp-solver/lp-solver.service';
import { Node } from '../node/node.entity';
import { Notification } from '../notifications/notification.entity';
import { NotificationService } from '../notifications/notification.service';
import { Order } from '../orders/order.entity';
import { User } from '../users/entities/user.entity';
import { MTUEntity } from './entities/mtu.entity';
import { TradingWindow } from './entities/trading-window.entity';
import { TimeframeTaskService } from './tasks/timeframe.task';
import { TimeframeController } from './timeframe.controller';
import { TimeframeService } from './timeframe.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([MTUEntity]),
    TypeOrmModule.forFeature([TradingWindow]),
    TypeOrmModule.forFeature([Node]),
    TypeOrmModule.forFeature([Order]),
    TypeOrmModule.forFeature([AggregatedCurvePoint]),
    TypeOrmModule.forFeature([Notification]),
    TypeOrmModule.forFeature([User]),
    TypeOrmModule.forFeature([Company]),
  ],
  controllers: [TimeframeController],
  providers: [
    TimeframeService,
    TimeframeTaskService,
    AggregatedCurvesService,
    LpSolverService,
    NotificationService,
  ],
})
export class TimeframeModule {}
