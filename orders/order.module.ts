import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Asset } from '../asset/enities/asset.entity';
import { Portfolio } from '../asset/enities/portfolio.entity';
import { Company } from '../company/company.entity';
import { Node } from '../node/node.entity';
import { MTUEntity } from '../timeframes/entities/mtu.entity';
import { TradingWindow } from '../timeframes/entities/trading-window.entity';
import { OrdersController } from './order.controller';
import { Order } from './order.entity';
import { OrdersService } from './order.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Order]),
    TypeOrmModule.forFeature([Node]),
    TypeOrmModule.forFeature([Asset]),
    TypeOrmModule.forFeature([MTUEntity]),
    TypeOrmModule.forFeature([TradingWindow]),
    TypeOrmModule.forFeature([Company]),
    TypeOrmModule.forFeature([Portfolio]),
  ],
  controllers: [OrdersController],
  providers: [OrdersService],
})
export class OrdersModule {}
