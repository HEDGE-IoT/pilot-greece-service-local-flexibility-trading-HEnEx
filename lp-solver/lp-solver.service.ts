// api/src/lp-solver/lp-solver.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AggregatedCurvePoint } from '../aggregated-curves/aggregated_curve_point.entity';
import { Node } from '../node/node.entity';
import { Order, OrderDirectionEnum, OrderStatus } from '../orders/order.entity';

const glpk = require('glpk.js');

@Injectable()
// Service that wraps around the lp-solver library to solve linear programming problems.
export class LpSolverService {
  logger: Logger;

  constructor(
    @InjectRepository(AggregatedCurvePoint)
    private aggregatedCurveRepository: Repository<AggregatedCurvePoint>,
    @InjectRepository(Node)
    private nodeRepository: Repository<Node>,
    @InjectRepository(Order)
    private orderRepository: Repository<Order>,
  ) {
    this.logger = new Logger(LpSolverService.name);
  }

  async solvePerMtu(mtu_id: number) {
    let glpkInstance = await glpk();
    const nodes = await this.nodeRepository.find();
    let res = {};
    for (const node of nodes) {
      this.logger.log(`\nSolving matching problem for node ${node.nd_id}`);
      const aggregatedCurvesPoints = await this.aggregatedCurveRepository.find({
        where: { agcp_mtu: { mtu_id }, agcp_node: { nd_id: node.nd_id } },
        relations: {
          agcp_order: {
            ord_portfolio: true,
            ord_company: true,
            ord_node: true,
          },
        },
      });
      const groupedCurves = this._groupCurvesByDirection(
        aggregatedCurvesPoints,
      );
      const results = await this._solveMatchingProblem(
        groupedCurves.sell,
        groupedCurves.buy,
        glpkInstance,
      );
      res[`${node.nd_id}`] = results;
    }
    return res;
  }

  async _solveMatchingProblem(sellCurve, buyCurve, glpkInstance) {
    let model = {
      name: 'Matching Problem',
      objective: {
        direction: glpkInstance.GLP_MAX,
        name: 'profit',
        vars: [],
      },
      subjectTo: [],
      bounds: [],
    };
    let totalSell = 0,
      totalBuy = 0;
    // Add sell variables
    sellCurve.forEach((sell, i) => {
      let xi = `Qs${i}`;
      model.objective.vars.push({ name: xi, coef: -0.25 * sell.agcp_price });
      model.bounds.push({
        name: xi,
        type: glpkInstance.GLP_DB,
        lb: 0,
        ub: sell.agcp_differential_quantity,
      });
      totalSell += sell.agcp_differential_quantity;
    });
    // Add buy variables
    buyCurve.forEach((buy, j) => {
      let yj = `Qb${j}`;
      model.objective.vars.push({ name: yj, coef: 0.25 * buy.agcp_price });
      model.bounds.push({
        name: yj,
        type: glpkInstance.GLP_DB,
        lb: 0,
        ub: buy.agcp_differential_quantity,
      });
      totalBuy += buy.agcp_differential_quantity;
    });
    // Balance constraint: ∑j 0.25 * yj = ∑i 0.25 * xi
    model.subjectTo.push({
      name: 'price',
      vars: [
        ...sellCurve.map((_, i) => ({ name: `Qs${i}`, coef: -0.25 })),
        ...buyCurve.map((_, j) => ({ name: `Qb${j}`, coef: 0.25 })),
      ],
      bnds: {
        type: glpkInstance.GLP_FX,
        lb: 0,
        ub: 0,
      },
    });
    // Solve the problem
    let results = await glpkInstance.solve(model, {
      msglev: glpkInstance.GLP_MSG_ALL,
    });
    const resultsVariables = results?.result?.vars;
    const clearingPrice = results?.result?.dual?.price;
    let trades = [];
    for (const [variable, value] of Object.entries(resultsVariables)) {
      const OrderDirection =
        variable[1] === 's' ? OrderDirectionEnum.SELL : OrderDirectionEnum.BUY;
      const quantityIndex = Number(variable[2]);
      let curvePoint: AggregatedCurvePoint;
      if (OrderDirection === OrderDirectionEnum.BUY) {
        curvePoint = buyCurve[quantityIndex];
      } else {
        curvePoint = sellCurve[quantityIndex];
      }
      curvePoint.agcp_clearing_quantity = value as number;
      curvePoint.agcp_clearing_price = clearingPrice as number;
      curvePoint.agcp_order.ord_status = OrderStatus.CLEARED;
      await this.aggregatedCurveRepository.update(
        { agcp_id: curvePoint.agcp_id },
        curvePoint,
      );
      const order = await this.orderRepository.findOne({
        where: { ord_id: curvePoint.agcp_order.ord_id },
      });
      order.ord_clearing_price = clearingPrice;
      order.ord_clearing_quantity =
        Number(order.ord_clearing_quantity) + Number(value as number);
      order.ord_clearing_welfare = results.result?.z ?? -3423423424234;
      order.ord_status = OrderStatus.CLEARED;
      await this.orderRepository.update({ ord_id: order.ord_id }, order);
    }
    return trades;
  }

  _groupCurvesByDirection(aggregatedCurvesPoints: AggregatedCurvePoint[]): {
    sell: AggregatedCurvePoint[];
    buy: AggregatedCurvePoint[];
  } {
    const grouped = { sell: [], buy: [] };
    aggregatedCurvesPoints.forEach((point) => {
      if (point.agcp_direction === OrderDirectionEnum.SELL) {
        grouped.sell.push(point);
      } else if (point.agcp_direction === OrderDirectionEnum.BUY) {
        grouped.buy.push(point);
      }
    });
    return grouped;
  }
}
