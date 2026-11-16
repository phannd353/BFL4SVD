export interface ApiResponseDto<T> {
  data: T;
  message?: string;
  statusCode: number;
  timestamp: string;
  pagination?: {
    total: number;
    limit: number;
    totalPages: number;
    page: number;
  };
}

export interface HealthResponseDto {
  status: "ok";
}
