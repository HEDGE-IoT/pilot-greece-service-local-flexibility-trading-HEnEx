import {
  Column,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { MTUEntity } from './mtu.entity';

@Entity()
export class TradingWindow {
  @PrimaryGeneratedColumn()
  twd_id: number;

  @Column({ type: 'timestamp' })
  twd_from: string;

  @Column({ type: 'timestamp' })
  twd_to: string;

  // ------ Relations ------- //
  @OneToOne(() => MTUEntity, (mtu) => mtu.tradingWindow, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'twd_fk_mtu_id' })
  twd_fk_mtu_id: MTUEntity;

  // ------- Control date fields -------
  @Column({
    type: 'timestamp',
    name: 'date_created',
    default: () => 'CURRENT_TIMESTAMP',
  })
  twd_date_created: string;

  @Column({
    type: 'timestamp',
    name: 'date_updated',
    default: () => 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP',
  })
  twd_date_updated: string;
}
