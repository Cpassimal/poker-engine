// tslint:disable:no-var-requires
// tslint:disable:no-require-imports
import {
  SpecReporter,
  StacktraceOption
} from 'jasmine-spec-reporter';
import * as watcher from 'node-watch';
import 'reflect-metadata';
import { cp } from 'shelljs';
import { errorHandler } from './error-handler';
import { SpecColorsProcessor } from 'jasmine-spec-reporter/built/processors/spec-colors-processor';
import { CustomReporterResult } from 'jasmine-spec-reporter/built/spec-reporter';

require('source-map-support').install({
  hookRequire: true,
  environment: 'node',
});
const IntlPolyfill = require('intl');
Intl.NumberFormat = IntlPolyfill.NumberFormat;

Number.prototype.toLocaleString = function (locales?: string | string[], options?: Intl.NumberFormatOptions): string {
  return new Intl.NumberFormat(locales, options).format(this);
};

const inspector = require('inspector');
const closeInspector = inspector.close;

const Jasmine = require('jasmine');

process.removeAllListeners('unhandledRejection');
process.removeAllListeners('uncaughtException');

process.on('unhandledRejection', e => errorHandler(e));
process.on('uncaughtException', e => errorHandler(e));

const jasmine = new Jasmine();

const environment: any = {};
environment.ext = __filename.endsWith('.js') ? 'js' : 'ts';
environment.rootDir = environment.ext === 'js' ? 'dist-test' : 'src';

jasmine.loadConfig({
  spec_dir: environment.rootDir.split('/').pop(),
  spec_files: [
    '**/*.spec.' + environment.ext,
  ],
  helpers: [
    'test.' + environment.ext,
  ],
  stopSpecOnExpectationFailure: false,
});

jasmine.clearReporters();

class CustomProcessor extends SpecColorsProcessor {
  constructor(conf: any) {
    super(conf);
  }

  public displaySpecErrorMessages(spec: CustomReporterResult, log: String): string {
    for (const failedExpectation of spec.failedExpectations) {
      const e = Error();
      const stack = (failedExpectation.matcherName ? '' : failedExpectation.message + '\n') + failedExpectation.stack;

      e.stack = stack
      .split('\n')
      .filter((line, i) => i === 0 || line.includes('.ts'))
      .join('\n');

      errorHandler(e);
    }

    return '';
  }

  public displaySummaryErrorMessages(spec: CustomReporterResult, log: String): string {
    for (const failedExpectation of spec.failedExpectations) {
      const e = Error();
      const stack = (failedExpectation.matcherName ? '' : failedExpectation.message + '\n') + failedExpectation.stack;

      e.stack = stack
      .split('\n')
      .filter((line, i) => i === 0 || line.includes('.ts'))
      .filter((line, i) => i < 2)
      .join('\n');

      errorHandler(e);
    }

    return '';
  }
}

const failBack = fail;

(global as any).fail = (err) => {
  // tslint:disable-next-line:no-console
  console.log(err);
  failBack(err);
};

jasmine.addReporter(new SpecReporter({
  summary: {
    displayDuration: true,
    displayStacktrace: StacktraceOption.PRETTY,
    displaySuccessful: true,
  },
  customProcessors: [CustomProcessor as any],
}));

jasmine.execute();

if (process.argv.includes('keepAlive')) {
  jasmine.onComplete(() => {
    setInterval(() => {
      // tslint:disable-next-line:no-console
      console.log('Keeping process alive');
    }, 10000);
  });
}

const watch = (watcher as any)('./src', { recursive: true, filter: /\.ts$/ }, () => {
  watch.close();
  process.exit(0);
});

if (environment.rootDir === 'dist-test') {
  cp('-R', './src/assets', './dist-test');
}

process.on('exit', closeInspector);
