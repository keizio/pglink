import {
  Controller,
  Post,
  Get,
  Body,
  Res,
  Query,
  Param,
  UseGuards,
  UnauthorizedException,
} from '@nestjs/common';
import { IsString, IsNotEmpty } from 'class-validator';
import type { Response } from 'express';
import { AdminService } from './admin.service';
import { AdminGuard } from '../../common/guards/admin.guard';
import { AdminPaymentQueryDto } from './dto/admin-payment-query.dto';
import { AdminSubscriptionQueryDto } from './dto/admin-subscription-query.dto';

export class AdminLoginDto {
  @IsString()
  @IsNotEmpty()
  username: string;

  @IsString()
  @IsNotEmpty()
  password: string;
}

@Controller()
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get()
  getHome(@Res() res: Response) {
    return res.render('home');
  }

  @Get('admin')
  getAdmin(@Res() res: Response) {
    return res.render('admin');
  }

  @Post('login')
  login(@Body() dto: AdminLoginDto, @Res() res: Response) {
    try {
      const result = this.adminService.login(dto.username, dto.password);
      return res.json(result);
    } catch {
      throw new UnauthorizedException('Invalid credentials');
    }
  }

  @UseGuards(AdminGuard)
  @Get('admin/dashboard')
  async getDashboard(@Res() res: Response) {
    const summary = await this.adminService.getDashboardSummary();
    return res.json(summary);
  }

  @UseGuards(AdminGuard)
  @Get('admin/applications')
  async getApplications(@Res() res: Response) {
    const applications = await this.adminService.getApplications();
    return res.json({ data: applications });
  }

  @UseGuards(AdminGuard)
  @Get('admin/applications/:id')
  async getApplicationById(@Param('id') id: string, @Res() res: Response) {
    const application = await this.adminService.getApplicationById(id);
    if (!application) {
      return res.status(404).json({ message: 'Application not found' });
    }
    return res.json({ data: application });
  }

  @UseGuards(AdminGuard)
  @Get('admin/payments')
  async getPayments(
    @Query() query: AdminPaymentQueryDto,
    @Res() res: Response,
  ) {
    const result = await this.adminService.getPayments(query);
    return res.json(result);
  }

  @UseGuards(AdminGuard)
  @Get('admin/subscriptions')
  async getSubscriptions(
    @Query() query: AdminSubscriptionQueryDto,
    @Res() res: Response,
  ) {
    const result = await this.adminService.getSubscriptions(query);
    return res.json(result);
  }
}
