/**
 * OneMap API Interfaces
 * Based on https://www.onemap.gov.sg/apidocs/
 */

export interface OneMapSearchResult {
  found: number;
  totalNumPages: number;
  pageNum: number;
  results: OneMapSearchRecord[];
}

export interface OneMapSearchRecord {
  BLK_NO: string;
  ROAD_NAME: string;
  BUILDING: string;
  ADDRESS: string;
  POSTAL: string;
  X: number; // SVY21 X coordinate
  Y: number; // SVY21 Y coordinate
  LATITUDE: number;
  LONGITUDE: number;
}

export interface OneMapReverseGeocodeResult {
  found: number;
  results: OneMapAddressRecord[];
}

export interface OneMapAddressRecord {
  ADDRESS: string;
  BLK_NO: string;
  ROAD_NAME: string;
  BUILDING: string;
  POSTAL: string;
  X: number; // SVY21 X coordinate
  Y: number; // SVY21 Y coordinate
  LATITUDE: number;
  LONGITUDE: number;
  DISTANCE: number; // Distance from query point in meters
}

export interface OneMapRouteResult {
  route_summary: {
    total_time: number; // in seconds
    total_distance: number; // in meters
  };
  route_geometry: string; // Encoded polyline
  route_instructions: OneMapRouteInstruction[];
}

export interface OneMapRouteInstruction {
  instruction: string;
  distance: number; // in meters
  time: number; // in seconds
  turn_angle: number; // degrees
  index: number;
}

export interface OneMapNearbyResult {
  found: number;
  results: OneMapNearbyPlace[];
}

export interface OneMapNearbyPlace {
  NAME: string;
  ADDRESS: string;
  POSTAL: string;
  X: number; // SVY21 X coordinate
  Y: number; // SVY21 Y coordinate
  LATITUDE: number;
  LONGITUDE: number;
  DISTANCE: number; // Distance from query point in meters
  CATEGORY: string;
}

export interface OneMapTokenResponse {
  access_token: string;
  expiry_timestamp: string; // Unix timestamp as string
}
