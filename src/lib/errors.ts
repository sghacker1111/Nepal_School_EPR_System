export class AppError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = new.target.name;
  }
}

export class ValidationError extends AppError {
  constructor(message = "Please check the information and try again.") {
    super(message, "VALIDATION_ERROR", 400);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Please sign in to continue.") {
    super(message, "UNAUTHORIZED", 401);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "You do not have permission to perform this action.") {
    super(message, "FORBIDDEN", 403);
  }
}

export class NotFoundError extends AppError {
  constructor(message = "The requested record was not found.") {
    super(message, "NOT_FOUND", 404);
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, "CONFLICT", 409);
  }
}

export function toPublicMessage(error: unknown) {
  if (error instanceof AppError) return error.message;
  return "Something went wrong. Please try again.";
}
