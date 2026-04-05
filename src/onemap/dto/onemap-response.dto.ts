export class SearchResponseDto {
  success: boolean;
  data?: any;
  error?: string;
  message?: string;
}

export class ReverseGeocodeResponseDto {
  success: boolean;
  data?: any;
  error?: string;
  message?: string;
}

export class RoutingResponseDto {
  success: boolean;
  data?: any;
  error?: string;
  message?: string;
}

export class NearbyResponseDto {
  success: boolean;
  data?: any;
  error?: string;
  message?: string;
}

export class TokenResponseDto {
  success: boolean;
  data?: {
    access_token: string;
    expiry_timestamp: string;
  };
  error?: string;
  message?: string;
}
