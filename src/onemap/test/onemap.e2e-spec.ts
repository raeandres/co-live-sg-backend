import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import supertest from 'supertest';
import { OneMapModule } from '../onemap.module';
import { OneMapService } from '../onemap.service';

describe('OneMapController (e2e)', () => {
  let app: INestApplication;
  let oneMapService: OneMapService;

  const mockOneMapService = {
    search: jest.fn(),
    reverseGeocode: jest.fn(),
    getRoute: jest.fn(),
    getNearby: jest.fn(),
    getToken: jest.fn(),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [OneMapModule],
    })
      .overrideProvider(OneMapService)
      .useValue(mockOneMapService)
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    oneMapService = moduleFixture.get<OneMapService>(OneMapService);
  });

  afterAll(async () => {
    await app.close();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('/onemap/search (GET)', () => {
    it('should return search results', () => {
      mockOneMapService.search.mockResolvedValue({
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
      });

      return supertest(app.getHttpServer())
        .get('/onemap/search')
        .query({ searchVal: '100 Orchard Road' })
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(res.body.data.found).toBe(1);
          expect(res.body.data.results).toHaveLength(1);
          expect(res.body.data.results[0].BUILDING).toBe('ION ORCHARD');
        });
    });

    it('should return 400 for missing searchVal', () => {
      return supertest(app.getHttpServer())
        .get('/onemap/search')
        .query({})
        .expect(400);
    });

    it('should accept optional parameters', () => {
      mockOneMapService.search.mockResolvedValue({
        found: 0,
        totalNumPages: 0,
        pageNum: 1,
        results: [],
      });

      return supertest(app.getHttpServer())
        .get('/onemap/search')
        .query({
          searchVal: 'restaurant',
          returnGeom: 'Y',
          getAddrDetails: 'Y',
          pageNum: 2,
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(true);
        });
    });
  });

  describe('/onemap/revgeocode (GET)', () => {
    it('should return reverse geocode result', () => {
      mockOneMapService.reverseGeocode.mockResolvedValue({
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
      });

      return supertest(app.getHttpServer())
        .get('/onemap/revgeocode')
        .query({ lat: 1.3041, long: 103.832 })
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(res.body.data.found).toBe(1);
          expect(res.body.data.results[0].ADDRESS).toBe('100 ORCHARD ROAD');
        });
    });

    it('should return 400 for invalid coordinates', () => {
      return supertest(app.getHttpServer())
        .get('/onemap/revgeocode')
        .query({ lat: 'invalid', long: 'invalid' })
        .expect(400);
    });

    it('should accept buffer parameter', () => {
      mockOneMapService.reverseGeocode.mockResolvedValue({
        found: 0,
        results: [],
      });

      return supertest(app.getHttpServer())
        .get('/onemap/revgeocode')
        .query({ lat: 1.3041, long: 103.832, buffer: 100 })
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(true);
        });
    });
  });

  describe('/onemap/routingsvc (GET)', () => {
    it('should return route result', () => {
      mockOneMapService.getRoute.mockResolvedValue({
        route_summary: {
          total_time: 600,
          total_distance: 5000,
        },
        route_geometry: 'encoded_polyline',
        route_instructions: [
          ['Head north', 100, 10, 0, 0],
        ],
      });

      return supertest(app.getHttpServer())
        .get('/onemap/routingsvc')
        .query({
          start: '1.3521,103.8198',
          end: '1.2897,103.8520',
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(res.body.data.route_summary.total_time).toBe(600);
          expect(res.body.data.route_summary.total_distance).toBe(5000);
        });
    });

    it('should return 400 for missing start parameter', () => {
      return supertest(app.getHttpServer())
        .get('/onemap/routingsvc')
        .query({ end: '1.2897,103.8520' })
        .expect(400);
    });

    it('should return 400 for missing end parameter', () => {
      return supertest(app.getHttpServer())
        .get('/onemap/routingsvc')
        .query({ start: '1.3521,103.8198' })
        .expect(400);
    });

    it('should accept routeType parameter', () => {
      mockOneMapService.getRoute.mockResolvedValue({
        route_summary: {
          total_time: 900,
          total_distance: 3000,
        },
        route_geometry: 'encoded_polyline',
        route_instructions: [],
      });

      return supertest(app.getHttpServer())
        .get('/onemap/routingsvc')
        .query({
          start: '1.3521,103.8198',
          end: '1.2897,103.8520',
          routeType: 'walk',
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(true);
        });
    });
  });

  describe('/onemap/nearbysvc (GET)', () => {
    it('should return nearby places', () => {
      mockOneMapService.getNearby.mockResolvedValue({
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
      });

      return supertest(app.getHttpServer())
        .get('/onemap/nearbysvc')
        .query({
          lat: 1.3041,
          long: 103.832,
          category: 'ATM',
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(res.body.data.found).toBe(1);
          expect(res.body.data.results[0].NAME).toBe('DBS ATM');
          expect(res.body.data.results[0].CATEGORY).toBe('ATM');
        });
    });

    it('should return 400 for invalid coordinates', () => {
      return supertest(app.getHttpServer())
        .get('/onemap/nearbysvc')
        .query({ lat: 'invalid', long: 'invalid', category: 'ATM' })
        .expect(400);
    });

    it('should return 400 for missing category', () => {
      return supertest(app.getHttpServer())
        .get('/onemap/nearbysvc')
        .query({ lat: 1.3041, long: 103.832 })
        .expect(400);
    });

    it('should accept radius parameter', () => {
      mockOneMapService.getNearby.mockResolvedValue({
        found: 0,
        results: [],
      });

      return supertest(app.getHttpServer())
        .get('/onemap/nearbysvc')
        .query({
          lat: 1.3041,
          long: 103.832,
          category: 'ATM',
          radius: 1000,
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(true);
        });
    });
  });

  describe('/onemap/gettoken (GET)', () => {
    it('should return token', () => {
      mockOneMapService.getToken.mockResolvedValue({
        access_token: 'test_token',
        expiry_timestamp: String(Math.floor(Date.now() / 1000) + 86400),
      });

      return supertest(app.getHttpServer())
        .get('/onemap/gettoken')
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(res.body.data.access_token).toBe('test_token');
          expect(res.body.data.expiry_timestamp).toBeDefined();
        });
    });
  });
});
