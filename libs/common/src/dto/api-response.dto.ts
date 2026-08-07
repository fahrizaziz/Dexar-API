export class ApiResponseDto<T> {
  success: boolean;
  message: string;
  data?: T;
  error?: any;
  timestamp: string;

  constructor(success: boolean, message: string, data?: T, error?: any) {
    this.success = success;
    this.message = message;
    this.data = data;
    this.error = error;
    this.timestamp = new Date().toISOString();
  }
}
