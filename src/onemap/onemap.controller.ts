import {
  Controller,
  Get,
  Query,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { OneMapService } from './onemap.service';
import {
  SearchQueryDto,
  ReverseGeocodeQueryDto,
  RoutingQueryDto,
  NearbyQueryDto,
} from './dto/onemap-query.dto';

@Controller('onemap')
export class OneMapController {
  constructor(private readonly oneMapService: OneMapService) {}

  /**
   * Search for addresses
   * GET common/elastic/search?searchVal=100+Orchard+Road&returnGeom=Y&getAddrDetails=N&pageNum=1
   */
  @Get('search')
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async search(@Query() query: SearchQueryDto) {
    try {
      const results = await this.oneMapService.search({
        searchVal: query.searchVal,
        returnGeom: query.returnGeom,
        getAddrDetails: query.getAddrDetails,
        pageNum: query.pageNum,
      });

      return {
        success: true,
        data: results,
        message: 'Search completed successfully',
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Search failed',
      };
    }
  }

  /**
   * Reverse geocoding
   * GET revgeocode?lat=1.3521&long=103.8198&buffer=10&addressType=All
   */
  @Get('revgeocode')
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async revgeocode(@Query() query: ReverseGeocodeQueryDto) {
    try {
      const result = await this.oneMapService.reverseGeocode(
        query.lat,
        query.long,
        query.buffer,
        query.addressType,
      );

      return {
        success: true,
        data: result,
        message: 'Reverse geocoding completed successfully',
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Reverse geocoding failed',
      };
    }
  }

  /**
   * Get routing information
   * GET routingsvc?start=1.3521,103.8198&end=1.2897,103.8520&routeType=drive
   */
  @Get('routingsvc')
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async routingsvc(@Query() query: RoutingQueryDto) {
    try {
      const routeType = query.routeType as 'drive' | 'walk' | 'cycle' | undefined;
      const result = await this.oneMapService.getRoute(
        query.start,
        query.end,
        routeType || 'drive',
      );

      return {
        success: true,
        data: result,
        message: 'Route calculation completed successfully',
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Route calculation failed',
      };
    }
  }

  /**
   * Get nearby places
   * GET nearbysvc?lat=1.3521&long=103.8198&radius=500&category=ATM
   */
  @Get('nearbysvc')
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async nearbysvc(@Query() query: NearbyQueryDto) {
    try {
      const result = await this.oneMapService.getNearby(
        query.lat,
        query.long,
        query.category,
        query.radius,
      );

      return {
        success: true,
        data: result,
        message: 'Nearby places search completed successfully',
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Nearby places search failed',
      };
    }
  }

  /**
   * Get access token
   * GET gettoken
   */
  @Get('/gettoken')
  async gettoken() {
    try {
      const result = await this.oneMapService.getToken();

      return {
        success: true,
        data: result,
        message: 'Token retrieved successfully',
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Token retrieval failed',
      };
    }
  }
}
