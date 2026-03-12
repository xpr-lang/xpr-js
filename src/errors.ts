export class XprError extends Error {
  constructor(
    message: string,
    public readonly position: number = -1
  ) {
    super(message);
    this.name = "XprError";
  }
}
