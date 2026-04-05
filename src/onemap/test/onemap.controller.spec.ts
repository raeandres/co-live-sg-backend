import { Test, TestingModule } from '@nestjs/testing';
import { OneMapController } from '../onemap.controller';
import { OneMapService } from '../onemap.service';

describe('OneMapController', () => {
  let controller: OneMapController;
  let service: OneMapService;

  const mockOneMapService = {
    search: jest.fn(),
    reverseGeocode: jest.fn(),
    getRoute: jest.fn(),
    getNearby: jest.fn(),
    getToken: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OneMapController],
      providers: [
        {
          provide: OneMapService,
          useValue: mockOneMapService,
        },
      ],
    }).compile();

    controller = module.get<OneMapController>(OneMapController);
    service = module.get<OneMapService>(OneMapService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('search', () => {
    it('should return search results', async () => {
      const mockResults = {
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

      mockOneMapService.search.mockResolvedValue(mockResults);

      const result = await controller.search({ searchVal: '100 Orchard Road' });

      expect(result).toEqual({
        success: true,
        data: mockResults,
        message: 'Search completed successfully',
      });
      expect(mockOneMapService.search).toHaveBeenCalledWith(
        expect.objectContaining({ searchVal: '100 Orchard Road' }),
      );
    });

    it('should handle search errors', async () => {
      mockOneMapService.search.mockRejectedValue(
        new Error('Search failed'),
      );

      const result = await controller.search({ searchVal: 'test' });

      expect(result).toEqual({
        success: false,
        error: 'Search failed',
        message: 'Search failed',
      });
    });

    it('should pass optional parameters', async () => {
      mockOneMapService.search.mockResolvedValue({
        found: 0,
        totalNumPages: 0,
        pageNum: 1,
        results: [],
      });

      await controller.search({
        searchVal: 'restaurant',
        returnGeom: 'Y',
        getAddrDetails: 'Y',
        pageNum: 2,
      });

      expect(mockOneMapService.search).toHaveBeenCalledWith(
        expect.objectContaining({
          searchVal: 'restaurant',
          returnGeom: 'Y',
          getAddrDetails: 'Y',
          pageNum: 2,
        }),
      );
    });
  });

  describe('revgeocode', () => {
    it('should return reverse geocode result', async () => {
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

      mockOneMapService.reverseGeocode.mockResolvedValue(mockResult);

      const result = await controller.revgeocode({
        lat: 1.3041,
        long: 103.832,
      });

      expect(result).toEqual({
        success: true,
        data: mockResult,
        message: 'Reverse geocoding completed successfully',
      });
      expect(mockOneMapService.reverseGeocode).toHaveBeenCalledWith(
        1.3041,
        103.832,
        undefined,
        undefined,
      );
    });

    it('should handle reverse geocode errors', async () => {
      mockOneMapService.reverseGeocode.mockRejectedValue(
        new Error('Reverse geocode failed'),
      );

      const result = await controller.revgeocode({
        lat: 1.3041,
        long: 103.832,
      });

      expect(result).toEqual({
        success: false,
        error: 'Reverse geocode failed',
        message: 'Reverse geocoding failed',
      });
    });

    it('should pass buffer and addressType parameters when provided', async () => {
      mockOneMapService.reverseGeocode.mockResolvedValue({
        found: 0,
        results: [],
      });

      await controller.revgeocode({
        lat: 1.3041,
        long: 103.832,
        buffer: 100,
        addressType: 'Block',
      });

      expect(mockOneMapService.reverseGeocode).toHaveBeenCalledWith(
        1.3041,
        103.832,
        100,
        'Block',
      );
    });
  });

  describe('routingsvc', () => {
    it('should return route result', async () => {
      const mockResult = {
        route_summary: {
          total_time: 600,
          total_distance: 5000,
        },
        route_geometry: 'encoded_polyline',
        route_instructions: [
          ['Head north', 100, 10, 0, 0],
        ],
      };

      mockOneMapService.getRoute.mockResolvedValue(mockResult);

      const result = await controller.routingsvc({
        start: '1.3521,103.8198',
        end: '1.2897,103.8520',
      });

      expect(result).toEqual({
        success: true,
        data: mockResult,
        message: 'Route calculation completed successfully',
      });
      expect(mockOneMapService.getRoute).toHaveBeenCalledWith(
        '1.3521,103.8198',
        '1.2897,103.8520',
        'drive',
      );
    });

    it('should handle route errors', async () => {
      mockOneMapService.getRoute.mockRejectedValue(
        new Error('Route failed'),
      );

      const result = await controller.routingsvc({
        start: '1.3521,103.8198',
        end: '1.2897,103.8520',
      });

      expect(result).toEqual({
        success: false,
        error: 'Route failed',
        message: 'Route calculation failed',
      });
    });

    it('should pass routeType parameter when provided', async () => {
      mockOneMapService.getRoute.mockResolvedValue({
        route_summary: { total_time: 0, total_distance: 0 },
        route_geometry: '',
        route_instructions: [],
      });

      await controller.routingsvc({
        start: '1.3521,103.8198',
        end: '1.2897,103.8520',
        routeType: 'walk',
      });

      expect(mockOneMapService.getRoute).toHaveBeenCalledWith(
        '1.3521,103.8198',
        '1.2897,103.8520',
        'walk',
      );
    });
  });

  describe('nearbysvc', () => {
    it('should return nearby places', async () => {
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

      mockOneMapService.getNearby.mockResolvedValue(mockResult);

      const result = await controller.nearbysvc({
        lat: 1.3041,
        long: 103.832,
        category: 'ATM',
      });

      expect(result).toEqual({
        success: true,
        data: mockResult,
        message: 'Nearby places search completed successfully',
      });
      expect(mockOneMapService.getNearby).toHaveBeenCalledWith(
        1.3041,
        103.832,
        'ATM',
        undefined,
      );
    });

    it('should handle nearby errors', async () => {
      mockOneMapService.getNearby.mockRejectedValue(
        new Error('Nearby search failed'),
      );

      const result = await controller.nearbysvc({
        lat: 1.3041,
        long: 103.832,
        category: 'ATM',
      });

      expect(result).toEqual({
        success: false,
        error: 'Nearby search failed',
        message: 'Nearby places search failed',
      });
    });

    it('should pass radius parameter when provided', async () => {
      mockOneMapService.getNearby.mockResolvedValue({
        found: 0,
        results: [],
      });

      await controller.nearbysvc({
        lat: 1.3041,
        long: 103.832,
        category: 'ATM',
        radius: 1000,
      });

      expect(mockOneMapService.getNearby).toHaveBeenCalledWith(
        1.3041,
        103.832,
        'ATM',
        1000,
      );
    });
  });

  describe('gettoken', () => {
    it('should return token', async () => {
      const mockToken = {
        access_token: 'test_token',
        expiry_timestamp: String(Math.floor(Date.now() / 1000) + 86400),
      };

      mockOneMapService.getToken.mockResolvedValue(mockToken);

      const result = await controller.gettoken();

      expect(result).toEqual({
        success: true,
        data: mockToken,
        message: 'Token retrieved successfully',
      });
      expect(mockOneMapService.getToken).toHaveBeenCalled();
    });

    it('should handle token errors', async () => {
      mockOneMapService.getToken.mockRejectedValue(
        new Error('Token failed'),
      );

      const result = await controller.gettoken();

      expect(result).toEqual({
        success: false,
        error: 'Token failed',
        message: 'Token retrieval failed',
      });
    });
  });
});
