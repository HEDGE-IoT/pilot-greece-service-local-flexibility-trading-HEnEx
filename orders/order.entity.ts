import {
  Column,
  DeleteDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Portfolio } from '../asset/enities/portfolio.entity';
import { Company } from '../company/company.entity';
import { Node } from '../node/node.entity';
import { MTUEntity } from '../timeframes/entities/mtu.entity';

export namespace OrderDirectionEnum {
  export const BUY = 'BUY';
  export const SELL = 'SELL';
}

//! this might be unusefull if products become seperate table
export namespace OrderProductType {
  export const ACTIVE = 'ACTIVE POWER';
}

export namespace OrderStatus {
  export const ACTIVE = 'ACTIVE';
  export const TRANSIT = 'TRANSIT';
  export const CLEARED = 'CLEARED';
  export const DELETED = 'DELETED';
}

@Entity()
export class Order {
  @PrimaryGeneratedColumn()
  ord_id: number;

  //! Donot know if it is usefull or not
  @Column({ nullable: true })
  ord_name: string;

  @Column({ nullable: false, default: OrderDirectionEnum.BUY })
  ord_direction: string;

  @Column({ nullable: false, default: OrderStatus.ACTIVE })
  ord_status: string;

  @Column({ default: OrderProductType.ACTIVE })
  ord_product_type: string;

  @Column({ type: 'json', nullable: true })
  ord_price_quantity_pairs: { price: number; quantity: number }[];

  //! Details about Clearing/Trade. Theese are NULL at first.
  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  ord_clearing_price: number;

  @Column('decimal', { precision: 10, scale: 2, nullable: false, default: 0 })
  ord_clearing_quantity: number;

  @Column('decimal', { precision: 10, scale: 2, nullable: false, default: 0 })
  ord_clearing_welfare: number;

  // ------  Relations  ------- //

  //todo: MTU relation - ManyToOne
  //! On delete of MTU set Null -  Eventhough mtu are not suposed to be deleted
  @ManyToOne(() => MTUEntity, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'ord_fk_mtu_id' })
  ord_mtu: MTUEntity;

  //todo: Company Relation -  ManyToOne
  //! On Delete of company must delete orders
  @ManyToOne(() => Company, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'ord_fk_cmp_id' })
  ord_company: Company;

  //! The Node/Asset Relation are a bit more complex on how to do it.

  //? We give only one order per company per asset with price quantity pairs.
  //? This give more flexibillity
  //todo: Asset Relation - ManyToOne but nullable (DSO)
  @ManyToOne(() => Portfolio, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'ord_fk_prtf_id' })
  ord_portfolio: Portfolio;

  //todo: Node Relation - ManyToOne
  @ManyToOne(() => Node, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'ord_fk_nd_id' })
  ord_node: Node;

  // ------- Control date fields -------
  @Column({
    type: 'timestamp',
    name: 'ord_date_created',
    default: () => 'CURRENT_TIMESTAMP',
  })
  ord_date_created: string;

  @Column({
    type: 'timestamp',
    name: 'ord_date_updated',
    default: () => 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP',
  })
  ord_date_updated: string;

  @DeleteDateColumn({ nullable: true })
  ord_date_deleted: string;
}
