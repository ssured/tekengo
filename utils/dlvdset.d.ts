export function dlv(
  object: object,
  key: string | Array<string | number>,
  defaultValue?: any
): any;

export function dset<T extends object, V>(
  obj: T,
  keys: string | ArrayLike<string | number>,
  value: V
): void;
