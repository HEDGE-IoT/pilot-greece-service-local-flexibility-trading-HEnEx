import {
  Column,
  Entity,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { AggregatedCurvePoint } from '../../aggregated-curves/aggregated_curve_point.entity';
import { Order } from '../../orders/order.entity';
import { TradingWindow } from './trading-window.entity';

@Entity()
@Unique(['mtu_from', 'mtu_to'])
export class MTUEntity {
  @PrimaryGeneratedColumn()
  mtu_id: number;

  @Column({ type: 'timestamp' })
  mtu_from: string;

  @Column({ type: 'timestamp' })
  mtu_to: string;

  //! this is the indication that the procedure on mtu closure is done
  @Column({ type: 'boolean', default: false })
  mtu_on_closure_procedure: boolean;

  // ------- Relationships ------- //

  @OneToOne(() => TradingWindow, (td) => td.twd_fk_mtu_id, {
    onDelete: 'CASCADE',
  })
  tradingWindow: TradingWindow;

  @OneToMany(() => AggregatedCurvePoint, (acp) => acp.agcp_mtu)
  aggregatedCurvePoints: AggregatedCurvePoint[];

  @OneToMany(() => Order, (order) => order.ord_mtu)
  orders: Order[];

  // ------- Control date fields -------
  @Column({
    type: 'timestamp',
    name: 'date_created',
    default: () => 'CURRENT_TIMESTAMP',
  })
  mtu_date_created: string;

  @Column({
    type: 'timestamp',
    name: 'date_updated',
    default: () => 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP',
  })
  mtu_date_updated: string;
}
