// check:nojs: zero client-side JavaScript in dist/ (specs/00-principles.md, JS-1..JS-4, AL-1).
// Usage: node scripts/check-nojs.ts [--dist <dir>]
import { CommandLine } from './lib/command-line.ts';
import { Report } from './lib/violation.ts';
import { NoJsCheck } from './nojs/no-js-check.ts';
import { TAG_RULES } from './nojs/rules.ts';

const CHECK = 'check:nojs';
const files = await new CommandLine(process.argv).buildOutput(CHECK).files();
const violations = await new NoJsCheck(TAG_RULES).violations(files);
process.exitCode = new Report(CHECK, violations).print('no client-side JavaScript found');
