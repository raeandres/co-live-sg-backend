import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { HttpException, HttpStatus, BadRequestException } from '@nestjs/common';
import { of, throwError } from 'rxjs';
import { AxiosResponse } from 'axios';
import { OneMapService } from '../onemap.service';

describe('OneMapService', () => {
  let service: OneMapService;
  let httpService: HttpService;
  let configService: ConfigService;

  const mockHttpService = {
    get: jest.fn(),
    post: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn((key: string, defaultValue: string) => {
      if (key === 'ONEMAP_BASE_URL')
        return 'https://developers.onemap.sg/privateapi';
      if (key === 'ONEMAP_AUTH_URL')
        return 'https://developers.onemap.sg/privateapi/auth/token';
      if (key === 'ONEMAP_EMAIL') return '';
      if (key === 'ONEMAP_PASSWORD') return '';
      return defaultValue;
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OneMapService,
        { provide: HttpService, useValue: mockHttpService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<OneMapService>(OneMapService);
    httpService = module.get<HttpService>(HttpService);
    configService = module.get<ConfigService>(ConfigService);

    // Reset cached token between tests
    service['cachedToken'] = null;
    service['tokenExpiry'] = null;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('search', () => {
    it('should return search results successfully', async () => {
      const mockResult = {
        found: 1,
        totalNumPages: 1,
        pageNum: 1,
        results: [
          {
            BLK_NO: '100',
            ROAD_NAME: 'ORCHARD ROAD',
            BUILDING: 'ION ORCHARD',
            ADDRESS: '100 ORCHARD ROAD',
            POSTAL: '238840',
            X: 29538.5,
            Y: 30735.2,
            LATITUDE: 1.3041,
            LONGITUDE: 103.832,
          },
        ],
      };

      // Mock token fetch
      mockHttpService.post.mockReturnValue(
        of({
          data: { access_token: 'mock_token_123', expiry_timestamp: String(Math.floor(Date.now() / 1000) + 86400) },
          status: 200,
          statusText: 'OK',
          headers: {},
          config: { headers: {} as any, url: '' },
        } as AxiosResponse),
      );

      // Mock search request
      mockHttpService.get.mockReturnValue(
        of({
          data: mockResult,
          status: 200,
          statusText: 'OK',
          headers: {},
          config: { headers: {} as any, url: '' },
        } as AxiosResponse),
      );

      const result = await service.search({ searchVal: '100 Orchard Road' });

      expect(result).toEqual(mockResult);
      expect(result.found).toBe(1);
      expect(result.results).toHaveLength(1);
      expect(result.results[0].BUILDING).toBe('ION ORCHARD');
    });

    it('should include optional parameters in search', async () => {
      mockHttpService.post.mockReturnValue(
        of({
          data: { access_token: 'mock_token_123', expiry_timestamp: String(Math.floor(Date.now() / 1000) + 86400) },
          status: 200,
        } as AxiosResponse),
      );

      mockHttpService.get.mockReturnValue(
        of({
          data: { found: 0, totalNumPages: 0, pageNum: 1, results: [] },
          status: 200,
        } as AxiosResponse),
      );

      await service.search({
        searchVal: 'restaurant',
        returnGeom: 'Y',
        getAddrDetails: 'Y',
        pageNum: 2,
      });

      expect(mockHttpService.get).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          params: expect.objectContaining({
            searchVal: 'restaurant',
            returnGeom: 'Y',
            getAddrDetails: 'Y',
            pageNum: 2,
          }),
        }),
      );
    });

    it('should use default values for optional parameters', async () => {
      mockHttpService.post.mockReturnValue(
        of({
          data: { access_token: 'mock_token_123', expire_in: 86400 },
          status: 200,
        } as AxiosResponse),
      );

      mockHttpService.get.mockReturnValue(
        of({
          data: { found: 0, totalNumPages: 0, pageNum: 1, results: [] },
          status: 200,
        } as AxiosResponse),
      );

      await service.search({ searchVal: 'test' });

      expect(mockHttpService.get).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          params: expect.objectContaining({
            searchVal: 'test',
            returnGeom: 'Y',
            getAddrDetails: 'N',
            pageNum: 1,
          }),
        }),
      );
    });

    it('should throw HttpException on search failure', async () => {
      mockHttpService.post.mockReturnValue(
        of({
          data: { access_token: 'mock_token_123', expire_in: 86400 },
          status: 200,
        } as AxiosResponse),
      );

      mockHttpService.get.mockReturnValue(
        throwError(() => new Error('Network error')),
      );

      await expect(
        service.search({ searchVal: 'test' }),
      ).rejects.toThrow(
        new HttpException('Failed to search location', HttpStatus.BAD_GATEWAY),
      );
    });
  });

  describe('reverseGeocode', () => {
    it('should return reverse geocode result successfully', async () => {
      const mockResult = {
        found: 1,
        results: [
          {
            ADDRESS: '100 ORCHARD ROAD',
            BLK_NO: '100',
            ROAD_NAME: 'ORCHARD ROAD',
            BUILDING: 'ION ORCHARD',
            POSTAL: '238840',
            X: 29538.5,
            Y: 30735.2,
            LATITUDE: 1.3041,
            LONGITUDE: 103.832,
            DISTANCE: 5,
          },
        ],
      };

      mockHttpService.post.mockReturnValue(
        of({
          data: { access_token: 'mock_token_123', expiry_timestamp: String(Math.floor(Date.now() / 1000) + 86400) },
          status: 200,
        } as AxiosResponse),
      );

      mockHttpService.get.mockReturnValue(
        of({
          data: mockResult,
          status: 200,
        } as AxiosResponse),
      );

      const result = await service.reverseGeocode(1.3041, 103.832);

      expect(result).toEqual(mockResult);
      expect(result.found).toBe(1);
      expect(result.results[0].ADDRESS).toBe('100 ORCHARD ROAD');
    });

    it('should use custom buffer and addressType when provided', async () => {
      mockHttpService.post.mockReturnValue(
        of({
          data: { access_token: 'mock_token_123', expiry_timestamp: String(Math.floor(Date.now() / 1000) + 86400) },
          status: 200,
        } as AxiosResponse),
      );

      mockHttpService.get.mockReturnValue(
        of({
          data: { found: 0, results: [] },
          status: 200,
        } as AxiosResponse),
      );

      await service.reverseGeocode(1.3041, 103.832, 100, 'Block');

      expect(mockHttpService.get).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          params: expect.objectContaining({
            location: '1.3041,103.832',
            buffer: 100,
            addressType: 'Block',
          }),
        }),
      );
    });

    it('should use default buffer and addressType when not provided', async () => {
      mockHttpService.post.mockReturnValue(
        of({
          data: { access_token: 'mock_token_123', expiry_timestamp: String(Math.floor(Date.now() / 1000) + 86400) },
          status: 200,
        } as AxiosResponse),
      );

      mockHttpService.get.mockReturnValue(
        of({
          data: { found: 0, results: [] },
          status: 200,
        } as AxiosResponse),
      );

      await service.reverseGeocode(1.3041, 103.832);

      expect(mockHttpService.get).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          params: expect.objectContaining({
            location: '1.3041,103.832',
            buffer: 10,
            addressType: 'All',
          }),
        }),
      );
    });

    it('should throw HttpException on reverse geocode failure', async () => {
      mockHttpService.post.mockReturnValue(
        of({
          data: { access_token: 'mock_token_123', expire_in: 86400 },
          status: 200,
        } as AxiosResponse),
      );

      mockHttpService.get.mockReturnValue(
        throwError(() => new Error('Network error')),
      );

      await expect(service.reverseGeocode(1.3041, 103.832)).rejects.toThrow(
        new HttpException(
          'Failed to reverse geocode',
          HttpStatus.BAD_GATEWAY,
        ),
      );
    });
  });

  describe('getRoute', () => {
    it('should return route result successfully', async () => {
      const mockResult = {
        route_summary: {
          total_time: 600,
          total_distance: 5000,
        },
        route_geometry: 'encoded_polyline_string',
        route_instructions: [
          ['Head north', 100, 10, 0, 0],
          ['Turn right', 200, 20, 90, 1],
        ],
      };

      mockHttpService.post.mockReturnValue(
        of({
          data: { access_token: 'mock_token_123', expire_in: 86400 },
          status: 200,
        } as AxiosResponse),
      );

      mockHttpService.get.mockReturnValue(
        of({
          data: mockResult,
          status: 200,
        } as AxiosResponse),
      );

      const result = await service.getRoute(
        '1.3521,103.8198',
        '1.2897,103.8520',
      );

      expect(result).toEqual(mockResult);
      expect(result.route_summary.total_time).toBe(600);
      expect(result.route_summary.total_distance).toBe(5000);
    });

    it('should use custom routeType when provided', async () => {
      mockHttpService.post.mockReturnValue(
        of({
          data: { access_token: 'mock_token_123', expire_in: 86400 },
          status: 200,
        } as AxiosResponse),
      );

      mockHttpService.get.mockReturnValue(
        of({
          data: {
            route_summary: { total_time: 0, total_distance: 0 },
            route_geometry: '',
            route_instructions: [],
          },
          status: 200,
        } as AxiosResponse),
      );

      await service.getRoute(
        '1.3521,103.8198',
        '1.2897,103.8520',
        'walk',
      );

      expect(mockHttpService.get).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          params: expect.objectContaining({
            start: '1.3521,103.8198',
            end: '1.2897,103.8520',
            routeType: 'walk',
          }),
        }),
      );
    });

    it('should use drive as default routeType', async () => {
      mockHttpService.post.mockReturnValue(
        of({
          data: { access_token: 'mock_token_123', expire_in: 86400 },
          status: 200,
        } as AxiosResponse),
      );

      mockHttpService.get.mockReturnValue(
        of({
          data: {
            route_summary: { total_time: 0, total_distance: 0 },
            route_geometry: '',
            route_instructions: [],
          },
          status: 200,
        } as AxiosResponse),
      );

      await service.getRoute('1.3521,103.8198', '1.2897,103.8520');

      expect(mockHttpService.get).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          params: expect.objectContaining({
            routeType: 'drive',
          }),
        }),
      );
    });

    it('should throw BadRequestException for invalid start coordinate format', async () => {
      await expect(
        service.getRoute('invalid', '1.2897,103.8520'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for invalid end coordinate format', async () => {
      await expect(
        service.getRoute('1.3521,103.8198', 'invalid'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for non-numeric coordinates', async () => {
      await expect(
        service.getRoute('abc,def', '1.2897,103.8520'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw HttpException on route failure', async () => {
      mockHttpService.post.mockReturnValue(
        of({
          data: { access_token: 'mock_token_123', expire_in: 86400 },
          status: 200,
        } as AxiosResponse),
      );

      mockHttpService.get.mockReturnValue(
        throwError(() => new Error('Network error')),
      );

      await expect(
        service.getRoute('1.3521,103.8198', '1.2897,103.8520'),
      ).rejects.toThrow(
        new HttpException('Failed to get route', HttpStatus.BAD_GATEWAY),
      );
    });
  });

  describe('getNearby', () => {
    it('should return nearby places successfully', async () => {
      const mockResult = {
        found: 1,
        results: [
          {
            NAME: 'DBS ATM',
            ADDRESS: '100 ORCHARD ROAD',
            POSTAL: '238840',
            X: 29538.5,
            Y: 30735.2,
            LATITUDE: 1.3041,
            LONGITUDE: 103.832,
            DISTANCE: 50,
            CATEGORY: 'ATM',
          },
        ],
      };

      mockHttpService.post.mockReturnValue(
        of({
          data: { access_token: 'mock_token_123', expire_in: 86400 },
          status: 200,
        } as AxiosResponse),
      );

      mockHttpService.get.mockReturnValue(
        of({
          data: mockResult,
          status: 200,
        } as AxiosResponse),
      );

      const result = await service.getNearby(1.3041, 103.832, 'ATM');

      expect(result).toEqual(mockResult);
      expect(result.found).toBe(1);
      expect(result.results[0].NAME).toBe('DBS ATM');
      expect(result.results[0].CATEGORY).toBe('ATM');
    });

    it('should use custom radius when provided', async () => {
      mockHttpService.post.mockReturnValue(
        of({
          data: { access_token: 'mock_token_123', expire_in: 86400 },
          status: 200,
        } as AxiosResponse),
      );

      mockHttpService.get.mockReturnValue(
        of({
          data: { found: 0, results: [] },
          status: 200,
        } as AxiosResponse),
      );

      await service.getNearby(1.3041, 103.832, 'ATM', 1000);

      expect(mockHttpService.get).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          params: expect.objectContaining({
            lat: 1.3041,
            long: 103.832,
            radius: 1000,
            category: 'ATM',
          }),
        }),
      );
    });

    it('should use default radius when not provided', async () => {
      mockHttpService.post.mockReturnValue(
        of({
          data: { access_token: 'mock_token_123', expire_in: 86400 },
          status: 200,
        } as AxiosResponse),
      );

      mockHttpService.get.mockReturnValue(
        of({
          data: { found: 0, results: [] },
          status: 200,
        } as AxiosResponse),
      );

      await service.getNearby(1.3041, 103.832, 'ATM');

      expect(mockHttpService.get).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          params: expect.objectContaining({
            lat: 1.3041,
            long: 103.832,
            radius: 500,
            category: 'ATM',
          }),
        }),
      );
    });

    it('should throw HttpException on nearby failure', async () => {
      mockHttpService.post.mockReturnValue(
        of({
          data: { access_token: 'mock_token_123', expire_in: 86400 },
          status: 200,
        } as AxiosResponse),
      );

      mockHttpService.get.mockReturnValue(
        throwError(() => new Error('Network error')),
      );

      await expect(
        service.getNearby(1.3041, 103.832, 'ATM'),
      ).rejects.toThrow(
        new HttpException(
          'Failed to get nearby places',
          HttpStatus.BAD_GATEWAY,
        ),
      );
    });
  });

  describe('getToken', () => {
    it('should return mock token when credentials not configured', async () => {
      const result = await service.getToken();

      expect(result).toHaveProperty('access_token');
      expect(result).toHaveProperty('expiry_timestamp');
      expect(result.access_token).toContain('mock_token_');
    });

    it('should call auth endpoint when credentials configured', async () => {
      jest.spyOn(configService, 'get').mockImplementation((key: string, defaultValue: string) => {
        if (key === 'ONEMAP_EMAIL') return 'user@example.com';
        if (key === 'ONEMAP_PASSWORD') return 'password123';
        return defaultValue;
      });

      // Recreate service with new config
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          OneMapService,
          { provide: HttpService, useValue: mockHttpService },
          {
            provide: ConfigService,
            useValue: {
              get: jest.fn((key: string, defaultValue: string) => {
                if (key === 'ONEMAP_BASE_URL')
                  return 'https://developers.onemap.sg/privateapi';
                if (key === 'ONEMAP_AUTH_URL')
                  return 'https://developers.onemap.sg/privateapi/auth/token';
                if (key === 'ONEMAP_EMAIL') return 'user@example.com';
                if (key === 'ONEMAP_PASSWORD') return 'password123';
                return defaultValue;
              }),
            },
          },
        ],
      }).compile();

      const newService = module.get<OneMapService>(OneMapService);

      const mockTokenResponse = {
        access_token: 'real_token_abc',
        expiry_timestamp: String(Math.floor(Date.now() / 1000) + 86400),
      };

      mockHttpService.post.mockReturnValue(
        of({
          data: mockTokenResponse,
          status: 200,
        } as AxiosResponse),
      );

      const result = await newService.getToken();

      expect(result.access_token).toBe('real_token_abc');
      expect(result.expiry_timestamp).toBeDefined();
      // Verify timestamp is approximately 24 hours from now (within 10 seconds tolerance)
      const expectedTimestamp = Math.floor(Date.now() / 1000) + 86400;
      expect(parseInt(result.expiry_timestamp, 10)).toBeCloseTo(expectedTimestamp, -1);
      expect(mockHttpService.post).toHaveBeenCalledWith(
        'https://developers.onemap.sg/privateapi/auth/token',
        expect.objectContaining({
          email: 'user@example.com',
          password: 'password123',
        }),
        expect.any(Object),
      );
    });

    it('should cache token and reuse for subsequent requests', async () => {
      mockHttpService.post.mockReturnValue(
        of({
          data: { access_token: 'cached_token', expiry_timestamp: String(Math.floor(Date.now() / 1000) + 86400) },
          status: 200,
        } as AxiosResponse),
      );

      mockHttpService.get.mockReturnValue(
        of({
          data: { found: 0, totalNumPages: 0, pageNum: 1, results: [] },
          status: 200,
        } as AxiosResponse),
      );

      // First request - should fetch token
      await service.search({ searchVal: 'test' });
      const firstCallCount = mockHttpService.post.mock.calls.length;

      // Second request - should use cached token
      await service.search({ searchVal: 'test2' });
      const secondCallCount = mockHttpService.post.mock.calls.length;

      // Token should only be fetched once
      expect(firstCallCount).toBe(1);
      expect(secondCallCount).toBe(1);
    });

    it('should throw HttpException on token failure', async () => {
      jest.spyOn(configService, 'get').mockImplementation((key: string, defaultValue: string) => {
        if (key === 'ONEMAP_EMAIL') return 'user@example.com';
        if (key === 'ONEMAP_PASSWORD') return 'password123';
        return defaultValue;
      });

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          OneMapService,
          { provide: HttpService, useValue: mockHttpService },
          {
            provide: ConfigService,
            useValue: {
              get: jest.fn((key: string, defaultValue: string) => {
                if (key === 'ONEMAP_BASE_URL')
                  return 'https://developers.onemap.sg/privateapi';
                if (key === 'ONEMAP_AUTH_URL')
                  return 'https://developers.onemap.sg/privateapi/auth/token';
                if (key === 'ONEMAP_EMAIL') return 'user@example.com';
                if (key === 'ONEMAP_PASSWORD') return 'password123';
                return defaultValue;
              }),
            },
          },
        ],
      }).compile();

      const newService = module.get<OneMapService>(OneMapService);

      mockHttpService.post.mockReturnValue(
        throwError(() => new Error('Auth failed')),
      );

      await expect(newService.getToken()).rejects.toThrow(
        new HttpException(
          'Failed to authenticate with OneMap API',
          HttpStatus.BAD_GATEWAY,
        ),
      );
    });
  });

  describe('getValidToken', () => {
    it('should fetch new token when cache is empty', async () => {
      mockHttpService.post.mockReturnValue(
        of({
          data: { access_token: 'fresh_token', expiry_timestamp: String(Math.floor(Date.now() / 1000) + 86400) },
          status: 200,
        } as AxiosResponse),
      );

      const token = await service['getValidToken']();

      expect(token).toBe('fresh_token');
      expect(mockHttpService.post).toHaveBeenCalledTimes(1);
    });

    it('should return cached token when still valid', async () => {
      mockHttpService.post.mockReturnValue(
        of({
          data: { access_token: 'cached_token', expiry_timestamp: String(Math.floor(Date.now() / 1000) + 86400) },
          status: 200,
        } as AxiosResponse),
      );

      // First call - should fetch
      const token1 = await service['getValidToken']();
      expect(mockHttpService.post).toHaveBeenCalledTimes(1);

      // Second call - should use cache
      const token2 = await service['getValidToken']();
      expect(mockHttpService.post).toHaveBeenCalledTimes(1); // Still 1

      expect(token1).toBe(token2);
    });
  });
});
