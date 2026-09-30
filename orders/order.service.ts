import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Asset } from '../asset/enities/asset.entity';
import { Portfolio } from '../asset/enities/portfolio.entity';
import { Company } from '../company/company.entity';
import { Node } from '../node/node.entity';
import { RolesEnum } from '../roles/roles.entity';
import { MTUEntity } from '../timeframes/entities/mtu.entity';
import { TradingWindow } from '../timeframes/entities/trading-window.entity';
import {
  Order,
  OrderDirectionEnum,
  OrderProductType,
  OrderStatus,
} from './order.entity';

@Injectable()
export class OrdersService {
  logger: Logger;

  constructor(
    @InjectRepository(Order)
    private orderRepo: Repository<Order>,
    @InjectRepository(Asset)
    private assetRepo: Repository<Asset>,
    @InjectRepository(Node)
    private nodeRepo: Repository<Node>,
    @InjectRepository(MTUEntity)
    private mtuRepo: Repository<MTUEntity>,
    @InjectRepository(TradingWindow)
    private tradingWindowRepo: Repository<TradingWindow>,
    @InjectRepository(Company)
    private companyRepo: Repository<Company>,
    @InjectRepository(Portfolio)
    private portfolioRepo: Repository<Portfolio>,
  ) {
    this.logger = new Logger(OrdersService.name);
  }

  async listOrders(mtu_ids?: number[], cmp_id?: number, withDeleted = false) {
    this.logger.log(`listOrders(mtu_ids:${mtu_ids}, cmp_id:${cmp_id})`);

    const where: any = {};

    if (mtu_ids && mtu_ids.length > 0) {
      where.ord_mtu = In(mtu_ids);
    }

    if (cmp_id) {
      const company = await this.companyRepo.findOne({ where: { cmp_id } });
      if (!company) {
        throw new HttpException(
          `Company with id ${cmp_id} Not Found`,
          HttpStatus.NOT_FOUND,
        );
      }
      where.ord_company = { cmp_id: company.cmp_id };
    }

    const orders = await this.orderRepo.find({
      where,
      relations: {
        ord_portfolio: {
          prtf_assets: true, //? we might need to go only to portfolio level not to  asset level
        },
        ord_node: true,
        ord_mtu: true,
        ord_company: true,
      },
      withDeleted,
    });

    return orders;
  }

  async createOrder(order: any) {
    this.logger.log(`createOrder()`);
    this.logger.log(order);

    // 1. Check if the MTU ID is provided and has an open trading window
    if (!order?.ord_fk_mtu_id) {
      throw new HttpException(`MTU id is required`, HttpStatus.BAD_REQUEST);
    }

    // Fetch the MTU entity with the provided ID and include the trading window relation
    const mtu = await this.mtuRepo.findOne({
      where: { mtu_id: order.ord_fk_mtu_id },
      relations: { tradingWindow: true },
    });

    // If MTU is not found, throw an exception
    if (!mtu) {
      throw new HttpException(
        `MTU with id ${order.ord_fk_mtu_id} Not Found`,
        HttpStatus.NOT_FOUND,
      );
    }

    // Get the current date and time
    const now = new Date();

    // Check if the trading window start time is in the future
    if (new Date(mtu.tradingWindow.twd_from) > now) {
      throw new HttpException(
        `Trading Window is not open yet`,
        HttpStatus.BAD_REQUEST,
      );
    }

    // Check if the trading window end time is in the past
    if (new Date(mtu.tradingWindow.twd_to) < now) {
      throw new HttpException(
        `Trading Window is closed`,
        HttpStatus.BAD_REQUEST,
      );
    }
    // At this point, the MTU is open and we are ready to add the order

    // 2. Check if the company ID is provided
    if (!order?.ord_fk_cmp_id) {
      throw new HttpException(`Company id is required`, HttpStatus.BAD_REQUEST);
    }

    // Fetch the company entity with the provided ID
    const company = await this.companyRepo.findOne({
      where: { cmp_id: order.ord_fk_cmp_id },
    });

    // If company is not found, throw an exception
    if (!company) {
      throw new HttpException(
        `Company with id ${order.ord_fk_cmp_id} Not Found`,
        HttpStatus.NOT_FOUND,
      );
    }

    // 3. Check if the node ID is provided
    if (!order?.ord_fk_nd_id) {
      throw new HttpException(`Node id is required`, HttpStatus.BAD_REQUEST);
    }

    // Fetch the node entity with the provided ID
    const node = await this.nodeRepo.findOne({
      where: { nd_id: order.ord_fk_nd_id },
    });

    // 4. Check if the asset ID is provided and validate it
    let portfolio = null;
    if (order?.ord_fk_prtf_id) {
      //todo: must check if this asset on this mtu has order
      //! No i have to change it and check if the portfolio has any order by this company
      const OrderOnThisPortfolio = await this.orderRepo.findOne({
        where: {
          ord_company: { cmp_id: order.ord_fk_cmp_id },
          ord_portfolio: { prtf_id: order.ord_fk_prtf_id },
          ord_mtu: { mtu_id: order.ord_fk_mtu_id },
        },
      });

      if (OrderOnThisPortfolio) {
        throw new HttpException(
          `Asset ${order.ord_fk_prtf_id} already has an order on MTU ${order.ord_fk_mtu_id}`,
          HttpStatus.BAD_REQUEST,
        );
      }

      portfolio = await this.portfolioRepo.findOne({
        where: { prtf_id: order.ord_fk_prtf_id },
        relations: { prtf_node: true, prtf_company: true },
      });

      // If asset is not found, throw an exception
      if (!portfolio) {
        throw new HttpException(
          `Portfolio with id ${order.ord_fk_prtf_id} Not Found`,
          HttpStatus.NOT_FOUND,
        );
      }

      if (portfolio.prtf_company.cmp_id != order.ord_fk_cmp_id) {
        throw new HttpException(
          `Portfolio ${order.ord_fk_prtf_id} is not owned by the company ${order.ord_fk_cmp_id}`,
          HttpStatus.BAD_REQUEST,
        );
      }

      // Check if the asset belongs to the provided node
      if (order.ord_fk_nd_id != portfolio.prtf_node.nd_id) {
        throw new HttpException(
          `Porfolio ${portfolio.prtf_id} does not belong to Node ${order.ord_fk_nd_id}`,
          HttpStatus.BAD_REQUEST,
        );
      }
    } else {
      //! Probably this doesn't change with the changes on the portfolio
      //todo: in this case only mean we have DSO sumbitting the order on node //
      //todo: must check if the DSO has already submitted an order on this node for this MTU//
      const OrderOnThisNode = await this.orderRepo.findOne({
        where: {
          ord_company: { cmp_id: order.ord_fk_cmp_id },
          ord_node: { nd_id: order.ord_fk_nd_id },
          ord_mtu: { mtu_id: order.ord_fk_mtu_id },
        },
      });

      if (OrderOnThisNode) {
        throw new HttpException(
          `Node ${order.ord_fk_nd_id} already has an order on MTU ${order.ord_fk_mtu_id}`,
          HttpStatus.BAD_REQUEST,
        );
      }
    }

    // Create a new order entity with the provided data and related entities
    const newOrder = await this.orderRepo.create({
      ...order,
      ord_portfolio: portfolio,
      ord_node: node,
      ord_mtu: mtu,
      ord_company: company,
    });

    // Save the new order entity to the database and return it
    return await this.orderRepo.save(newOrder);
  }

  async deleteOrder(orderId: number) {
    this.logger.log(`deleteOrder(orderId:${orderId})`);

    // Fetch the order entity with the provided ID
    const order = await this.orderRepo.findOne({
      where: { ord_id: orderId },
    });

    // If order is not found, throw an exception
    if (!order) {
      throw new HttpException(
        `Order with id ${orderId} Not Found`,
        HttpStatus.NOT_FOUND,
      );
    }

    // Update the order status to DELETED
    order.ord_status = OrderStatus.DELETED;
    await this.orderRepo.save(order);

    // Soft delete the order entity from the database
    await this.orderRepo.softDelete(orderId);

    return HttpStatus.OK;
  }

  async patchOrder(orderId: number, order: any) {
    //todo: fix type
    //! UNTESTED
    //! Changes on portfolio
    this.logger.log(`patchOrder(orderId:${orderId})`);
    this.logger.log(order);

    // Fetch the existing order entity with the provided ID
    const existingOrder = await this.orderRepo.findOne({
      where: { ord_id: orderId },
      relations: {
        ord_company: true,
        ord_mtu: true,
        ord_node: true,
        ord_portfolio: true,
      },
    });

    // If order is not found, throw an exception
    if (!existingOrder) {
      throw new HttpException(
        `Order with id ${orderId} Not Found`,
        HttpStatus.NOT_FOUND,
      );
    }

    // 1. Check if the MTU ID is provided and has an open trading window
    if (order?.ord_fk_mtu_id) {
      const mtu = await this.mtuRepo.findOne({
        where: { mtu_id: order.ord_fk_mtu_id },
        relations: { tradingWindow: true },
      });

      if (!mtu) {
        throw new HttpException(
          `MTU with id ${order.ord_fk_mtu_id} Not Found`,
          HttpStatus.NOT_FOUND,
        );
      }

      const now = new Date();
      if (new Date(mtu.tradingWindow.twd_from) > now) {
        throw new HttpException(
          `Trading Window is not open yet`,
          HttpStatus.BAD_REQUEST,
        );
      }

      if (new Date(mtu.tradingWindow.twd_to) < now) {
        throw new HttpException(
          `Trading Window is closed`,
          HttpStatus.BAD_REQUEST,
        );
      }

      order.ord_mtu = mtu;
    }

    // 2. Check if the company ID is provided
    if (order?.ord_fk_cmp_id) {
      const company = await this.companyRepo.findOne({
        where: { cmp_id: order.ord_fk_cmp_id },
      });

      if (!company) {
        throw new HttpException(
          `Company with id ${order.ord_fk_cmp_id} Not Found`,
          HttpStatus.NOT_FOUND,
        );
      }

      existingOrder.ord_company = company;
    }

    // 3. Check if the node ID is provided
    if (order.ord_fk_nd_id) {
      const node = await this.nodeRepo.findOne({
        where: { nd_id: order.ord_fk_nd_id },
      });

      if (!node) {
        throw new HttpException(
          `Node with id ${order.ord_fk_nd_id} Not Found`,
          HttpStatus.NOT_FOUND,
        );
      }

      order.ord_node = node;
    }

    //! Must make changes here to add the portfolio layer
    if (
      order?.ord_fk_prtf_id &&
      order.ord_fk_prtf_id !== existingOrder.ord_portfolio.prtf_id
    ) {
      //todo: must check if this asset on this mtu has order
      const OrderOnThisPortfolio = await this.orderRepo.findOne({
        where: {
          ord_company: { cmp_id: order.ord_fk_cmp_id },
          ord_portfolio: { prtf_id: order.ord_fk_prtf_id },
          ord_mtu: { mtu_id: order.ord_fk_mtu_id },
        },
      });

      if (OrderOnThisPortfolio) {
        throw new HttpException(
          `Portfolio ${order.ord_fk_prtf_id} already has an order on MTU ${order.ord_fk_mtu_id}`,
          HttpStatus.BAD_REQUEST,
        );
      }

      const portfolio = await this.portfolioRepo.findOne({
        where: { prtf_id: order.ord_fk_prtf_id },
        relations: { prtf_node: true },
      });

      if (!portfolio) {
        throw new HttpException(
          `Portfolio with id ${order.ord_fk_prtf_id} Not Found`,
          HttpStatus.NOT_FOUND,
        );
      }

      if (
        order.ord_fk_nd_id &&
        order.ord_fk_nd_id != portfolio.prtf_node.nd_id
      ) {
        throw new HttpException(
          `Portfolio ${portfolio.prtf_node.nd_id} does not belong to Node ${order.ord_fk_nd_id}`,
          HttpStatus.BAD_REQUEST,
        );
      }

      order.ord_portfolio = portfolio;
    } else if (order.ord_fk_nd_id !== existingOrder.ord_node.nd_id) {
      const OrderOnThisNode = await this.orderRepo.findOne({
        where: {
          ord_company: { cmp_id: order.ord_fk_cmp_id },
          ord_node: { nd_id: order.ord_fk_nd_id },
          ord_mtu: { mtu_id: order.ord_fk_mtu_id },
        },
      });

      if (OrderOnThisNode) {
        throw new HttpException(
          `Node ${order.ord_fk_nd_id} already has an order on MTU ${order.ord_fk_mtu_id}`,
          HttpStatus.BAD_REQUEST,
        );
      }
    }

    // Update the existing order entity with the provided data
    Object.assign(existingOrder, order);

    // Save the updated order entity to the database and return it
    return await this.orderRepo.save(existingOrder);
  }

  async seedMtuWithOrders(mtu_id: number) {
    try {
      this.logger.log(`seedMtuWithOrders(mtu_id:${mtu_id})`);
      const mtu = await this.mtuRepo.findOne({
        where: { mtu_id },
        relations: { tradingWindow: true },
      });

      if (!mtu) {
        throw new HttpException(
          `MTU with id ${mtu_id} Not Found`,
          HttpStatus.NOT_FOUND,
        );
      }

      const now = new Date();
      if (
        new Date(mtu.tradingWindow.twd_from) > now ||
        new Date(mtu.tradingWindow.twd_to) < now
      ) {
        throw new HttpException(
          `Trading Window is not open for MTU ${mtu_id}`,
          HttpStatus.BAD_REQUEST,
        );
      }

      await this._seedOrdersForFPS(mtu);

      await this._seedOrdersForDSO(mtu);
    } catch (error) {
      this.logger.error('Error creating orders for MTU');
      this.logger.error(error);
    }
  }

  async _seedOrdersForFPS(mtu) {
    const companies = await this.companyRepo.find({
      where: { cmp_role: { rl_name: RolesEnum.FSP } },
      relations: { cmp_role: true },
    });

    for (const company of companies) {
      const portfolios = await this.portfolioRepo.find({
        where: { prtf_company: { cmp_id: company.cmp_id } },
        relations: {
          prtf_node: true,
          prtf_assets: true,
          prtf_company: true,
        },
      });

      const portfoliosWithAssets = portfolios.filter(
        (p) => p.prtf_assets.length > 0,
      );
      const shuffledPortfoliosWithAssets = portfoliosWithAssets.sort(
        () => 0.5 - Math.random(),
      );
      const seventyFivePercentPortfoliosWithAssets =
        shuffledPortfoliosWithAssets.slice(
          0,
          Math.floor(shuffledPortfoliosWithAssets.length * 0.75),
        );

      for (const portfolio of seventyFivePercentPortfoliosWithAssets) {
        const direction =
          Math.random() < 0.5
            ? OrderDirectionEnum.BUY
            : OrderDirectionEnum.SELL;

        let price_quantity_pairs = Array.from(
          { length: Math.floor(Math.random() * 7) + 1 },
          () => ({
            price: Math.floor(Math.random() * 1001) - 500,
            quantity: Math.floor(Math.random() * 5001) / 2500,
          }),
        );

        if (direction === OrderDirectionEnum.SELL) {
          price_quantity_pairs.sort((a, b) => a.price - b.price);
        } else {
          price_quantity_pairs.sort((a, b) => b.price - a.price);
        }

        const order = this.orderRepo.create({
          ord_mtu: mtu,
          ord_company: company,
          ord_portfolio:
            company.cmp_role?.rl_name === RolesEnum.FSP ? portfolio : null,
          ord_node: portfolio.prtf_node,
          ord_name: `Order ${mtu.mtu_id}-${company.cmp_id}-${portfolio.prtf_id}`,
          ord_direction: direction,
          ord_status: OrderStatus.ACTIVE,
          ord_price_quantity_pairs: price_quantity_pairs,
          ord_product_type: OrderProductType.ACTIVE,
        });

        await this.orderRepo.save(order);
      }
    }
  }

  async _seedOrdersForDSO(mtu) {
    const companies = await this.companyRepo.find({
      where: { cmp_role: { rl_name: RolesEnum.DSO } },
      relations: { cmp_role: true },
    });

    for (const company of companies) {
      const nodes = await this.nodeRepo.find();

      for (const node of nodes) {
        const direction =
          Math.random() < 0.5
            ? OrderDirectionEnum.BUY
            : OrderDirectionEnum.SELL;

        let price_quantity_pairs = Array.from(
          { length: Math.floor(Math.random() * 7) + 1 },
          () => ({
            price: Math.floor(Math.random() * 1001) - 500,
            quantity: Math.floor(Math.random() * 5001) / 2500,
          }),
        );

        if (direction === OrderDirectionEnum.SELL) {
          price_quantity_pairs.sort((a, b) => a.price - b.price);
        } else {
          price_quantity_pairs.sort((a, b) => b.price - a.price);
        }

        const order = this.orderRepo.create({
          ord_mtu: mtu,
          ord_company: company,
          ord_portfolio: null,
          ord_node: node,
          ord_name: `Order ${mtu.mtu_id}-${company.cmp_id}-${node.nd_id}`,
          ord_direction: direction,
          ord_status: OrderStatus.ACTIVE,
          ord_price_quantity_pairs: price_quantity_pairs,
          ord_product_type: OrderProductType.ACTIVE,
        });

        await this.orderRepo.save(order);
      }
    }
  }
}
