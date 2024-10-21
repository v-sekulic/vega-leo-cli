import { execSync } from 'child_process';
import chalk from 'chalk';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Resolve the directory of the current script file
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const scriptsDir = path.join(__dirname, 'scripts');

// Function to check if you're in an npm workspace
export const checkWorkspace = () => {
  const rootPath = path.join(process.cwd(), 'package.json');
  if (!fs.existsSync(rootPath)) {
    console.error(chalk.red('❌ package.json not found.'));
    process.exit(1);
  }

  const packageJson = JSON.parse(fs.readFileSync(rootPath, 'utf8'));

  if (!packageJson.workspaces) {
    console.error(chalk.red('❌ This command can only be executed in an npm workspace.'));
    process.exit(1);
  }
};

// Function to run a script
export const runScript = (script, name) => {
  try {
    checkWorkspace(); // Ensure you're in an npm workspace
    const scriptPath = path.join(scriptsDir, `${script}.js`);
    
    if (!fs.existsSync(scriptPath)) {
      console.error(chalk.red(`❌ Script not found: ${scriptPath}`));
      process.exit(1);
    }

    console.log(chalk.blue(`Running ${script} with name: ${name}`));
    execSync(`node ${scriptPath} ${name}`, { stdio: 'inherit' });
    console.log(chalk.green(`✅ Successfully created ${script}: ${name}`));
  } catch (error) {
    console.error(chalk.red(`❌ Error running ${script}: ${error.message}`));
  }
};
