import { Command } from 'commander';
import { geoScoreCommand } from './commands/geo-score.js';

export function createProgram(): Command {
  const program = new Command()
    .name('seopen')
    .description('SEOpen — open-source SEO and GEO platform')
    .version('0.0.0');

  program
    .command('geo')
    .description('Generative Engine Optimization commands')
    .addCommand(geoScoreCommand());

  return program;
}
