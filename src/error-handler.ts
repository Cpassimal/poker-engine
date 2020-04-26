// tslint:disable:no-console
export function errorHandler(error: any, level: 'info' | 'error' | 'async' | 'fatal' = 'fatal'): void {
  if (level === 'info') {
    console.info(error);
  } else {
    console.error(error);
  }
}

const consoleHandlerFactory = (bk: any, std: string) => function handler(...cargs: any[]): void {
  if (!(cargs[0] instanceof Error)) {
    return bk.call(console, ...cargs);
  }

  const newArgs = [...cargs];
  const err = newArgs[0];

  newArgs[0] = err.stack
  .split('\n')
  .map(line => line.replace(/(at |\()(\/.+\/[^\/]+)$/, '$1file://$2').replace('.ts:', '.ts? [sm]:'))
  .join('\n');

  const writeBk = process[std].write;

  process[std].write = function (...wargs: any[]): boolean {
    return writeBk.call(process[std], err.stack + '\n');
  };

  const ret = bk.call(console, ...newArgs);
  process[std].write = writeBk;

  return ret;
};

console.error = consoleHandlerFactory(console.error, 'stderr');
console.info = consoleHandlerFactory(console.info, 'stdout');

