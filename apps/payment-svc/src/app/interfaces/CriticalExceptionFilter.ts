// import { ArgumentsHost, Catch, ExceptionFilter } from '@nestjs/common';
// import { CriticalException } from './CriticalException';
//
// @Catch(CriticalException)
// export class CriticalExceptionFilter implements ExceptionFilter {
//   catch(exception: CriticalException, host: ArgumentsHost): any {
//     const ctx = host.switchToHttp();
//     const response = ctx.getResponse<Response>();
//     const request = ctx.getRequest<Request>();
//     const status = exception.getStatus();
//
//     response.status(status).json({
//       statusCode: status,
//       message: exception.message,
//       timestamp: new Date().toISOString(),
//       path: request.url,
//     });
//   }
// }
