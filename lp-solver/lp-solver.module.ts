// api/src/lp-solver/lp-solver.module.ts
import { Module } from '@nestjs/common';
import { Node } from '../node/node.entity';
import { LpSolverController } from './lp-solver.controller';
import { LpSolverService } from './lp-solver.service';

import { TypeOrmModule } from '@nestjs/typeorm';
import { AggregatedCurvePoint } from '../aggregated-curves/aggregated_curve_point.entity';
import { Order } from '../orders/order.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Node]),
    TypeOrmModule.forFeature([AggregatedCurvePoint]),
    TypeOrmModule.forFeature([Order]),
  ],

  controllers: [LpSolverController],
  providers: [LpSolverService],
})
export class LpSolverModule {}
