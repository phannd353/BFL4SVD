interface IBaseApiResponse {
  statusCode: number;
  timestamp: string;
}

export interface IPaginatedResponse<T> extends IBaseApiResponse {
  data: T[];
  pagination: {
    total: number;
    totalPages: number;
    page: number;
    limit: number;
  };
}

export interface IApiResponse<T> extends IBaseApiResponse {
  data?: T;
}
