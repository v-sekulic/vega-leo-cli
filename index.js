#!/usr/bin/env node

import figlet from 'figlet';
import chalk from 'chalk';
import inquirer from 'inquirer';
import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';

// Display ASCII Art
console.log(chalk.blue(figlet.textSync('Leo CLI', {
  font: 'Standard',
  horizontalLayout: 'default',
  verticalLayout: 'default'
})));

// Prompt for project name
inquirer.prompt([
  {
    type: 'input',
    name: 'projectName',
    message: 'What is your project name?'
  }
]).then((answers) => {
  const { projectName } = answers;

  // Define the path where the new project will be created
  const projectPath = path.join(process.cwd(), projectName);

  // Check if the directory already exists
  if (fs.existsSync(projectPath)) {
    console.error(chalk.red(`❌ Error: A folder with the name "${projectName}" already exists.`));
    process.exit(1);
  }

  // Run degit to clone the vega-react-starter template
  try {
    execSync(`npx degit v-sekulic/vega-react-starter ${projectName}`, {
      stdio: 'inherit',
      cwd: process.cwd(), // Create in the current directory
    });

    console.log(chalk.green(`✅ Successfully created project: ${projectName}`));

    // Path to the package.json of the newly created project
    const packageJsonPath = path.join(projectPath, 'package.json');

    // Check if package.json exists
    if (fs.existsSync(packageJsonPath)) {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      
      // Update the name field
      packageJson.name = projectName;

      // Write the updated package.json back to disk
      fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2), 'utf8');
      console.log(chalk.green(`✅ Updated package.json with the project name: ${projectName}`));
    } else {
      console.error(chalk.red(`❌ package.json not found in ${projectPath}.`));
    }

    // Ask the user if they want to run npm install
    inquirer.prompt([
      {
        type: 'confirm',
        name: 'installDeps',
        message: 'Do you want to install dependencies now?',
        default: true,
      }
    ]).then((installAnswer) => {
      if (installAnswer.installDeps) {
        // Run npm install
        try {
          execSync(`npm install`, {
            stdio: 'inherit',
            cwd: projectPath // Run npm install in the newly created project folder
          });
          console.log(chalk.green(`✅ Dependencies installed successfully for ${projectName}.`));
        } catch (error) {
          console.error(chalk.red(`❌ Error running npm install: ${error.message}`));
        }
      } else {
        console.log(chalk.yellow(`⚠️ You chose not to install dependencies. Run 'npm install' manually when ready.`));
      }
    });

  } catch (error) {
    console.error(chalk.red(`❌ Error creating project: ${error.message}`));
    process.exit(1);
  }
});
