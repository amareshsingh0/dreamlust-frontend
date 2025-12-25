import type {
  Request,
  Response as ExpressResponse,
  NextFunction,
  RequestHandler,
} from 'express';

export const asyncHandler =
  (
    fn: (
      req: Request,
      res: ExpressResponse,
      next: NextFunction
    ) => Promise<unknown>
  ): RequestHandler =>
  (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
