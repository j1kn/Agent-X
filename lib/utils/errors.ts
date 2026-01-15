export class PipelineError extends Error {
  constructor(
    message: string,
    public step: string,
    public details?: unknown
  ) {
    super(message)
    this.name = 'PipelineError'
  }
}

export class AuthenticationError extends Error {
  constructor(message: string = 'Authentication required') {
    super(message)
    this.name = 'AuthenticationError'
  }
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ValidationError'
  }
}


