#!/usr/bin/env node

import { createAlkemist, parseArguments } from '../lib/create-alkemist.mjs';

try {
  const result = await createAlkemist(parseArguments(process.argv.slice(2)));
  console.log(
    `Created ${result.destination}\nProvider: ${result.provider}\nNext: open that directory, run npm install, npm run verify, then npm run dev.\nRead HOSTING.md before publishing. No project dependencies, Git repository, account, or deployment were created.`,
  );
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
