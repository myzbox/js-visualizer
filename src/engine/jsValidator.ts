export function validateJS(code: string): string | null {
  try {
    new Function(code);
    return null;
  } catch (err: any) {
    return err.message;
  }
}
