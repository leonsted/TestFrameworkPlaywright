export class OneCError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'OneCError';
  }
}
