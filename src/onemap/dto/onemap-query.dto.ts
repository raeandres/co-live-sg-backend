import {
  IsString,
  IsOptional,
  IsNumber,
  IsLatitude,
  IsLongitude,
  Min,
  Max,
  IsIn,
} from 'class-validator';
import { Type } from 'class-transformer';

export class SearchQueryDto {
  @IsString()
  searchVal: string; // Search query string

  @IsOptional()
  @IsIn(['Y', 'N'])
  returnGeom?: string; // Y or N, default: Y

  @IsOptional()
  @IsIn(['Y', 'N'])
  getAddrDetails?: string; // Y or N, default: N

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  pageNum?: number; // Page number for pagination, default: 1
}

export class ReverseGeocodeQueryDto {
  @Type(() => Number)
  @IsNumber()
  @IsLatitude()
  lat: number;

  @Type(() => Number)
  @IsNumber()
  @IsLongitude()
  long: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(1000)
  buffer?: number; // Search radius in meters, default: 10, max: 1000

  @IsOptional()
  @IsString()
  addressType?: string; // Address type: All, Block, Street, etc. Default: All
}

export class RoutingQueryDto {
  @IsString()
  start: string; // Format: "lat,long"

  @IsString()
  end: string; // Format: "lat,long"

  @IsOptional()
  @IsIn(['drive', 'walk', 'cycle'])
  routeType?: string; // drive, walk, cycle, default: drive
}

export class NearbyQueryDto {
  @IsNumber()
  @IsLatitude()
  @Type(() => Number)
  lat: number;

  @IsNumber()
  @IsLongitude()
  @Type(() => Number)
  long: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  radius?: number; // Search radius in meters, default: 500

  @IsString()
  category: string; // Required: e.g., "ATM", "RESTAURANT"
}
