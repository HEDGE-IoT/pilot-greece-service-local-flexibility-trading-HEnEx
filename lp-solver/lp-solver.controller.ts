// api/src/lp-solver/lp-solver.controller.ts
import { Controller, Param, ParseIntPipe, Post } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { LpSolverService } from './lp-solver.service';

@ApiTags('Solver')
@Controller('solver')
export class LpSolverController {
  constructor(private readonly lpSolverService: LpSolverService) {}
  /**
   * POST /lp-solver/solve
   * Expects a JSON body with the LP model.
   */
  @ApiOperation({ summary: 'Solve LP model for a specific MTU' })
  @ApiResponse({
    status: 200,
    description: 'Returns solver results for the specified MTU',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Invalid input data or no solution found',
  })
  @ApiResponse({ status: 404, description: 'MTU not found' })
  @ApiParam({ name: 'mtu_id', description: 'MTU ID', type: 'number' })
  @Post('/mtu/:mtu_id/solve')
  solvePerMtu(@Param('mtu_id', ParseIntPipe) mtu_id: number) {
    return this.lpSolverService.solvePerMtu(mtu_id);
  }
}
