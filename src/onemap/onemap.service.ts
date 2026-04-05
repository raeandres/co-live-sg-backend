import {
  Injectable,
  Logger,
  HttpException,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import {
  OneMapSearchResult,
  OneMapReverseGeocodeResult,
  OneMapRouteResult,
  OneMapNearbyResult,
  OneMapTokenResponse,
} from './interfaces/onemap.interface';

@Injectable()
export class OneMapService {
  private readonly logger = new Logger(OneMapService.name);
  private readonly baseUrl: string;
  private readonly authUrl: string;
  private readonly email: string;
  private readonly password: string;
  private cachedToken: string | null = null;
  private tokenExpiry: Date | null = null;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.baseUrl =
      this.configService.get<string>(
        'ONEMAP_BASE_URL',
        'https://www.onemap.gov.sg/api/',
      );
    this.authUrl =
      this.configService.get<string>(
        'ONEMAP_AUTH_URL',
        'https://www.onemap.gov.sg/api/auth/post/getToken',
      );
    this.email = this.configService.get<string>('ONEMAP_EMAIL', '');
    this.password = this.configService.get<string>('ONEMAP_PASSWORD', '');
  }

  /**
   * Get or refresh the access token for OneMap API
   * Tokens are valid for 24 hours and cached to avoid unnecessary requests
   */
  private async getValidToken(): Promise<string> {
    // Return cached token if still valid (with 5-minute buffer)
    if (
      this.cachedToken &&
      this.tokenExpiry &&
      new Date() < new Date(this.tokenExpiry.getTime() - 5 * 60 * 1000)
    ) {
      return this.cachedToken;
    }

    return this.fetchNewToken();
  }

  /**
   * Fetch a new access token from OneMap
   */
  private async fetchNewToken(): Promise<string> {
    try {
      if (!this.email || !this.password) {
        this.logger.warn(
          'OneMap credentials not configured, using mock token for development',
        );
        const mockToken = `mock_token_${Date.now()}`;
        this.cachedToken = mockToken;
        this.tokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
        return mockToken;
      }

      const response = await firstValueFrom(
        this.httpService.post<OneMapTokenResponse>(
          this.authUrl,
          {
            email: this.email,
            password: this.password,
          },
          {
            headers: {
              'Content-Type': 'application/json',
            },
          },
        ),
      );

      this.cachedToken = response.data.access_token;
      // Convert Unix timestamp to Date object
      const expiryMs = parseInt(response.data.expiry_timestamp, 10) * 1000;
      this.tokenExpiry = new Date(expiryMs);

      this.logger.log('Successfully obtained OneMap access token');
      return this.cachedToken;
    } catch (error) {
      this.logger.error('Error fetching OneMap token:', error);
      throw new HttpException(
        'Failed to authenticate with OneMap API',
        HttpStatus.BAD_GATEWAY,
      );
    }
  }

  /**
   * Build authorization headers
   */
  private async getAuthHeaders(): Promise<Record<string, string>> {
    const token = await this.getValidToken();
    return {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  }

  /**
   * Search for addresses using OneMap search API
   * GET /privateapi/search
   */
  async search(params: {
    searchVal: string;
    returnGeom?: string;
    getAddrDetails?: string;
    pageNum?: number;
  }): Promise<OneMapSearchResult> {
    try {
      const queryParams: Record<string, any> = {
        searchVal: params.searchVal,
        returnGeom: params.returnGeom || 'Y',
        getAddrDetails: params.getAddrDetails || 'N',
        pageNum: params.pageNum || 1,
      };

      const headers = await this.getAuthHeaders();
      const response = await firstValueFrom(
        this.httpService.get<OneMapSearchResult>(`${this.baseUrl}common/elastic/search`, {
          params: queryParams,
          headers,
        }),
      );

      return response.data;
    } catch (error) {
      this.logger.error('Error searching OneMap:', error);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        'Failed to search location',
        HttpStatus.BAD_GATEWAY,
      );
    }
  }

  /**
   * Reverse geocoding - get address from coordinates
   * GET /private/revgeocode
   */
  async reverseGeocode(
    lat: number,
    long: number,
    buffer?: number,
    addressType?: string,
  ): Promise<OneMapReverseGeocodeResult> {
    try {
      const queryParams: Record<string, any> = {
        location: `${lat},${long}`,
        buffer: buffer || 10, // Default 10m, max 1000m
        addressType: addressType || 'All', // All, Block, Street, etc.
      };

      const headers = await this.getAuthHeaders();
      const response = await firstValueFrom(
        this.httpService.get<OneMapReverseGeocodeResult>(
          `${this.baseUrl}public/revgeocode`,
          {
            params: queryParams,
            headers,
          },
        ),
      );

      return response.data;
    } catch (error) {
      this.logger.error('Error reverse geocoding:', error);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        'Failed to reverse geocode',
        HttpStatus.BAD_GATEWAY,
      );
    }
  }

  /**
   * Get routing information using OneMap routing API
   * GET /privateapi/route
   */
  async getRoute(
    start: string,
    end: string,
    routeType: 'drive' | 'walk' | 'cycle' = 'drive',
  ): Promise<OneMapRouteResult> {
    try {
      // Validate coordinate format (lat,long)
      const validateCoordinate = (coord: string, name: string) => {
        const parts = coord.split(',');
        if (parts.length !== 2) {
          throw new BadRequestException(
            `Invalid ${name} format. Expected "lat,long"`,
          );
        }
        const [lat, long] = parts.map(Number);
        if (isNaN(lat) || isNaN(long)) {
          throw new BadRequestException(
            `Invalid ${name} coordinates. Must be numeric.`,
          );
        }
        if (lat < -90 || lat > 90) {
          throw new BadRequestException(
            `Invalid ${name} latitude. Must be between -90 and 90.`,
          );
        }
        if (long < -180 || long > 180) {
          throw new BadRequestException(
            `Invalid ${name} longitude. Must be between -180 and 180.`,
          );
        }
      };

      validateCoordinate(start, 'start');
      validateCoordinate(end, 'end');

      const queryParams = {
        start,
        end,
        routeType,
      };

      const headers = await this.getAuthHeaders();
      const response = await firstValueFrom(
        this.httpService.get<OneMapRouteResult>(`${this.baseUrl}/route`, {
          params: queryParams,
          headers,
        }),
      );

      return response.data;
    } catch (error) {
      this.logger.error('Error getting route:', error);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        'Failed to get route',
        HttpStatus.BAD_GATEWAY,
      );
    }
  }

  /**
   * Get nearby places using OneMap nearby API
   * GET /private/nearby
   */
  async getNearby(
    latitude: number,
    longitude: number,
    category: string,
    radius?: number,
  ): Promise<OneMapNearbyResult> {
    try {
      const queryParams: Record<string, any> = {
        latitude,
        longitude,
        radius_in_meters: radius || 500, // Default 500m
        category,
      };

      const headers = await this.getAuthHeaders();
      const response = await firstValueFrom(
        this.httpService.get<OneMapNearbyResult>(`${this.baseUrl}public/nearbysvc/getNearestMrtStops`, {
          params: queryParams,
          headers,
        }),
      );

      return response.data;
    } catch (error) {
      this.logger.error('Error getting nearby places:', error);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        'Failed to get nearby places',
        HttpStatus.BAD_GATEWAY,
      );
    }
  }

  /**
   * Get access token for authenticated API access
   * Returns token information for clients that need to manage their own auth
   */
  async getToken(): Promise<OneMapTokenResponse> {
    try {
      const token = await this.getValidToken();
      const expireIn = this.tokenExpiry
        ? Math.floor((this.tokenExpiry.getTime() - Date.now()) / 1000)
        : 86400;

      return {
        access_token: token,
        expiry_timestamp: Math.floor(Date.now() / 1000 + expireIn).toString(),
      };
    } catch (error) {
      this.logger.error('Error getting token:', error);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        'Failed to get access token',
        HttpStatus.BAD_GATEWAY,
      );
    }
  }
}
