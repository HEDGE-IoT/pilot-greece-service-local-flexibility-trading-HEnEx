import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseArrayPipe,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CreateOrderDto, UpdateOrderDto } from './order.dto';
import { OrdersService } from './order.service';

@ApiTags('Orders')
@Controller('order')
export class OrdersController {
  //todo: must add guards //
  constructor(private readonly ordersService: OrdersService) {}
  @ApiOperation({ summary: 'Get list of orders' })
  @ApiResponse({ status: 200, description: 'Returns a list of orders' })
  @ApiQuery({
    name: 'mtu_ids',
    required: false,
    description: 'Filter orders by MTU IDs (comma-separated)',
    type: 'string',
    example: '1,2,3',
  })
  @ApiQuery({
    name: 'cmpId',
    required: false,
    description: 'Filter orders by company ID',
    type: 'number',
  })
  @Get('/list')
  ordersList(
    @Query(
      'mtu_ids',
      new ParseArrayPipe({ items: Number, separator: ',', optional: true }),
    )
    mtu_ids?: number[],
    @Query('cmpId', new ParseIntPipe({ optional: true })) cmp_id?: number,
  ) {
    return this.ordersService.listOrders(mtu_ids, cmp_id);
  }
  //Post order
  @ApiOperation({ summary: 'Create a new order' })
  @ApiResponse({ status: 201, description: 'Order successfully created' })
  @ApiResponse({ status: 400, description: 'Bad request - Invalid input data' })
  @Post('/')
  createOrder(@Body(ValidationPipe) body: CreateOrderDto) {
    return this.ordersService.createOrder(body);
  }
  //Delete Order
  @ApiOperation({ summary: 'Delete an order' })
  @ApiResponse({ status: 200, description: 'Order successfully deleted' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  @ApiParam({ name: 'id', description: 'Order ID', type: 'number' })
  @Delete('/:id')
  deleteOrder(@Param('id', ParseIntPipe) id: number) {
    return this.ordersService.deleteOrder(id);
  }
  //! Must be tested correctly //
  //Patch Order
  @ApiOperation({ summary: 'Update an order' })
  @ApiResponse({ status: 200, description: 'Order successfully updated' })
  @ApiResponse({ status: 400, description: 'Bad request - Invalid input data' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  @ApiParam({ name: 'id', description: 'Order ID', type: 'number' })
  @Patch('/:id')
  patchOrder(
    @Param('id', ParseIntPipe) id: number,
    @Body(ValidationPipe) body: UpdateOrderDto,
  ) {
    return this.ordersService.patchOrder(id, body);
  }

  @Post('/mtu/:id/seed')
  seedMtu(@Param('id', ParseIntPipe) mtu_id: number) {
    return this.ordersService.seedMtuWithOrders(mtu_id);
  }
}
