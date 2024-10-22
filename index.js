#!/usr/bin/env node

import figlet from "figlet";
import chalk from "chalk";
import gradient from "gradient-string";
import inquirer from "inquirer";
import { execSync } from "child_process";
import path from "path";
import fs from "fs-extra";

import { Command } from "commander";
import { runScript } from "./commands.js"; // Import the command handler

const scaffoldProject = () => {
  // Prompt for project name and structure type (monorepo vs single app)
  inquirer
    .prompt([
      {
        type: "input",
        name: "projectName",
        message: "What is your project name?",
      },
      {
        type: "list",
        name: "structureType",
        message: "Choose the structure you want to scaffold:",
        choices: ["Single application", "Monorepo (npm workspaces)"],
        default: "Monorepo (npm workspaces)",
      },
    ])
    .then(async (answers) => {
      let { projectName, structureType } = answers;

      // Handle case when project name contains more than one word

      // Replace spaces in the project name with hyphens
      projectName = projectName.split(" ").join("-");

      // Define the path where the new project will be created
      const projectPath = path.join(process.cwd(), projectName);

      // Check if the directory already exists
      if (fs.existsSync(projectPath)) {
        console.error(
          chalk.red(
            `❌ Error: A folder with the name "${projectName}" already exists.`
          )
        );
        process.exit(1);
      }

      try {
        // Run degit to clone the monorepo template
        execSync(`npx degit v-sekulic/vega-react-starter ${projectName}`, {
          stdio: "inherit",
          cwd: process.cwd(),
        });

        console.log(
          chalk.green(`✅ Successfully cloned project: ${projectName}`)
        );

        // for SINGLE APP restructure code from monorepo
        if (structureType === "Single App")
          transformMonorepoToSingleApp({ projectPath });

        renameProjectNameInPackageJson({ projectPath, projectName });
        
        // for MONOREPO just pull all the code

        // Step 10: Prompt to initialize git repository
        inquirer
          .prompt([
            {
              type: "confirm",
              name: "initGit",
              message: "Do you want to initialize a Git repository?",
              default: true,
            },
          ])
          .then((gitAnswer) => {
            if (gitAnswer.initGit) {
              try {
                execSync(`git init`, {
                  stdio: "inherit",
                  cwd: projectPath,
                });
                console.log(chalk.green(`✅ Git repository initialized.`));
              } catch (error) {
                console.error(
                  chalk.red(`❌ Error initializing Git: ${error.message}`)
                );
              }
            }

            // Step 11: Ask the user if they want to install dependencies after Git initialization
            inquirer
              .prompt([
                {
                  type: "confirm",
                  name: "installDeps",
                  message: "Do you want to install dependencies now?",
                  default: true,
                },
              ])
              .then((installAnswer) => {
                if (installAnswer.installDeps) {
                  try {
                    execSync(`npm install`, {
                      stdio: "inherit",
                      cwd: projectPath,
                    });
                    console.log(
                      chalk.green(
                        `✅ Dependencies installed successfully for ${projectName}.`
                      )
                    );
                  } catch (error) {
                    console.error(
                      chalk.red(
                        `❌ Error running npm install: ${error.message}`
                      )
                    );
                  }
                } else {
                  console.log(
                    chalk.yellow(
                      `⚠️  You chose not to install dependencies. Run 'npm install' manually when ready.`
                    )
                  );
                }
              });
          });
      } catch (error) {
        console.error(chalk.red(`❌ Error creating project: ${error.message}`));
        process.exit(1);
      }
    });
};

const transformMonorepoToSingleApp = ({ projectPath }) => {
  // Start the process of transforming into a single app

  // Step 1: Copy only 'ui-kit/src' to 'apps/web/src/ui-kit'
  const uiKitSrcPath = path.join(projectPath, "packages/ui-kit/src");
  const webSrcPath = path.join(projectPath, "apps/web/src/ui-kit");

  if (fs.existsSync(uiKitSrcPath)) {
    fs.mkdirSync(path.dirname(webSrcPath), { recursive: true });
    fs.copySync(uiKitSrcPath, webSrcPath);
    console.log(
      chalk.green(`✅ Copied 'ui-kit/src' to 'apps/web/src/ui-kit'.`)
    );
  } else {
    console.error(chalk.red(`❌ 'ui-kit/src' not found.`));
    process.exit(1);
  }

  // Step 2: Move 'base-tailwind-config.cjs' to the root and update import path in tailwind.config.ts
  const tailwindConfigSrc = path.join(
    projectPath,
    "packages/ui-kit/src/tailwind/base-tailwind-config.cjs"
  );
  const rootTailwindConfig = path.join(projectPath, "base-tailwind-config.cjs");

  if (fs.existsSync(tailwindConfigSrc)) {
    fs.renameSync(tailwindConfigSrc, rootTailwindConfig);
    console.log(
      chalk.green(`✅ Moved 'base-tailwind-config.cjs' to the root.`)
    );
  } else {
    console.error(chalk.red(`❌ 'base-tailwind-config.cjs' not found.`));
    process.exit(1);
  }

  // Update import path in 'apps/web/tailwind.config.ts'
  const tailwindConfigTsPath = path.join(
    projectPath,
    "apps/web/tailwind.config.ts"
  );
  if (fs.existsSync(tailwindConfigTsPath)) {
    const tailwindConfigContent = fs.readFileSync(tailwindConfigTsPath, "utf8");
    const updatedTailwindConfig = tailwindConfigContent.replace(
      "../../packages/ui-kit/src/tailwind/base-tailwind-config",
      "./base-tailwind-config"
    );
    fs.writeFileSync(tailwindConfigTsPath, updatedTailwindConfig);
    console.log(chalk.green(`✅ Updated import path in 'tailwind.config.ts'.`));
  }

  // Step 3: Merge root package.json into apps/web/package.json
  const rootPackageJsonPath = path.join(projectPath, "package.json");
  const webPackageJsonPath = path.join(projectPath, "apps/web/package.json");

  const rootPackageJson = JSON.parse(
    fs.readFileSync(rootPackageJsonPath, "utf8")
  );
  const webPackageJson = JSON.parse(
    fs.readFileSync(webPackageJsonPath, "utf8")
  );

  // Merge dependencies and devDependencies
  webPackageJson.dependencies = {
    ...webPackageJson.dependencies,
    ...rootPackageJson.dependencies,
  };
  webPackageJson.devDependencies = {
    ...webPackageJson.devDependencies,
    ...rootPackageJson.devDependencies,
  };
  webPackageJson.scripts = {
    ...webPackageJson.scripts,
    ...rootPackageJson.scripts,
  };

  // Step 4: Remove 'ui-kit' dependency from web package.json if it exists
  if (webPackageJson.dependencies["ui-kit"]) {
    delete webPackageJson.dependencies["ui-kit"];
    console.log(
      chalk.green(
        `✅ Removed 'ui-kit' dependency from 'apps/web/package.json'.`
      )
    );
  }

  // Remove specific commands in Single App mode
  delete webPackageJson.scripts["create:ts-lib"];
  delete webPackageJson.scripts["create:react-lib"];
  delete webPackageJson.scripts["dev:web"];
  delete webPackageJson.scripts["build:web"];
  delete webPackageJson.scripts["preview:web"];
  delete webPackageJson.scripts["create:react-app"];

  // Write the updated web package.json
  fs.writeFileSync(webPackageJsonPath, JSON.stringify(webPackageJson, null, 2));
  console.log(
    chalk.green(
      `✅ Merged root package.json into 'apps/web/package.json' and removed unwanted scripts.`
    )
  );

  // Step 5: Clean up the root package.json and delete unnecessary files
  execSync(`rm -rf ${path.join(projectPath, "packages")}`, {
    stdio: "inherit",
  });
  execSync(`rm -rf ${path.join(projectPath, "node_modules")}`, {
    stdio: "inherit",
  });
  execSync(`rm -f ${rootPackageJsonPath}`, { stdio: "inherit" });

  console.log(chalk.green(`✅ Removed monorepo-specific files.`));

  // Step 6: Remove the 'scripts' folder if it exists
  const scriptsPath = path.join(projectPath, "scripts");
  if (fs.existsSync(scriptsPath)) {
    execSync(`rm -rf ${scriptsPath}`, { stdio: "inherit" });
    console.log(chalk.green(`✅ Removed 'scripts' folder.`));
  }

  // Step 7: Move 'apps/web' to the root level
  const webAppPath = path.join(projectPath, "apps/web");
  fs.readdirSync(webAppPath).forEach((file) => {
    fs.renameSync(path.join(webAppPath, file), path.join(projectPath, file));
  });

  // Remove the now-empty 'apps' folder
  execSync(`rm -rf ${path.join(projectPath, "apps")}`, { stdio: "inherit" });

  console.log(chalk.green(`✅ Moved 'apps/web' to the root level.`));

  // Step 8: Update import paths in 'main.tsx', 'routes/index.tsx', and 'App.tsx'
  const mainTsxPath = path.join(projectPath, "src/main.tsx");
  const routesIndexPath = path.join(projectPath, "src/routes/index.tsx");
  const appTsxPath = path.join(projectPath, "src/App.tsx");

  // Update import path in 'main.tsx'
  if (fs.existsSync(mainTsxPath)) {
    let mainTsxContent = fs.readFileSync(mainTsxPath, "utf8");
    mainTsxContent = mainTsxContent.replace(
      "../../../packages/ui-kit/src/styles/index.css",
      "./ui-kit/styles/index.css"
    );
    fs.writeFileSync(mainTsxPath, mainTsxContent);
    console.log(chalk.green(`✅ Updated import path in 'main.tsx'.`));
  }

  // Update import paths in 'routes/index.tsx'
  if (fs.existsSync(routesIndexPath)) {
    let routesIndexContent = fs.readFileSync(routesIndexPath, "utf8");
    routesIndexContent = routesIndexContent.replace(
      "from 'ui-kit'",
      "from '@/ui-kit/ui'"
    );
    fs.writeFileSync(routesIndexPath, routesIndexContent);
    console.log(chalk.green(`✅ Updated import path in 'routes/index.tsx'.`));
  }

  // Update import paths in 'App.tsx'
  if (fs.existsSync(appTsxPath)) {
    let appTsxContent = fs.readFileSync(appTsxPath, "utf8");
    appTsxContent = appTsxContent.replace(
      "from 'ui-kit'",
      "from '@/ui-kit/ui'"
    );
    fs.writeFileSync(appTsxPath, appTsxContent);
    console.log(chalk.green(`✅ Updated import path in 'App.tsx'.`));
  }

  // Step 9: Update 'components.json' for Single App
  const componentsJsonPath = path.join(projectPath, "components.json");
  if (fs.existsSync(componentsJsonPath)) {
    const componentsJson = JSON.parse(
      fs.readFileSync(componentsJsonPath, "utf8")
    );

    // Update paths for Single App
    componentsJson.tailwind.config = "./base-tailwind-config.ts";
    componentsJson.tailwind.css = "./src/ui-kit/styles/globals.css";
    componentsJson.aliases.components = "src/ui-kit";
    componentsJson.aliases.utils = "src/ui-kit/utils";

    fs.writeFileSync(
      componentsJsonPath,
      JSON.stringify(componentsJson, null, 2)
    );
    console.log(chalk.green(`✅ Updated 'components.json' for Single App.`));
  }
};

const renameProjectNameInPackageJson = ({ projectPath, projectName }) => { 
  const rootPackageJsonPath = path.join(projectPath, "package.json");
  const lockFilePath = path.join(projectPath, "package-lock.json");
    
  if (fs.existsSync(rootPackageJsonPath)) {
      const rootPackageJson = JSON.parse(
          fs.readFileSync(rootPackageJsonPath, "utf8")
      );
      
      // Update the name field in package.json
      rootPackageJson.name = projectName; // Set the name from user input
      fs.writeFileSync(rootPackageJsonPath, JSON.stringify(rootPackageJson, null, 2));
  } else {
      console.error(chalk.red(`❌ 'package.json' not found in the cloned project.`));
      process.exit(1);
  }

  // Update the name field in package-lock.json if it exists
  if (fs.existsSync(lockFilePath)) {
      const lockFile = JSON.parse(
          fs.readFileSync(lockFilePath, "utf8")
      );
      
      // Update the name field
      lockFile.name = projectName; // Set the name from user input
      lockFile.packages[""].name = projectName; // Set the name at the root level
      fs.writeFileSync(lockFilePath, JSON.stringify(lockFile, null, 2));
  } else {
      console.error(chalk.red(`❌ 'package-lock.json' not found in the cloned project.`));
  }
}

const program = new Command();

program
  .command("init")
  .description("Sets up the project")
  .action(() => {
    scaffoldProject();
  });

// Define the 'create:ts-lib' command
program
  .command("create:ts-lib <name>")
  .description("Create a new TypeScript library")
  .action((name) => {
    runScript("create-ts-lib", name);
  });

// Define the 'create:react-lib' command
program
  .command("create:react-lib <name>")
  .description("Create a new React library")
  .action((name) => {
    runScript("create-react-lib", name);
  });

// Define the 'create:react-app' command
program
  .command("create:react-app <name>")
  .description("Create a new React app")
  .action((name) => {
    runScript("create-react-app", name);
  });

program
  .command("component <name>")
  .description("Adds Shadcn component to the ui-kit")
  .action((name) => {
    try {
      execSync(`npx shadcn@latest add ${name}`, {
        stdio: "inherit",
      });
      console.log(
        `✅ Successfully added Shadcn component to 'packages/ui-kit': ${name}`
      );
    } catch (error) {
      console.error(`❌ Error adding component: ${error.message}`);
      process.exit(1);
    }
  });

// Show help if no command is provided
program.parse(process.argv);

if (!process.argv.slice(2).length) {
  program.outputHelp();
}

const leoText = figlet.textSync("Leo", {
  font: "Standard",
  horizontalLayout: "default",
  verticalLayout: "default",
}).split("\n");

const cliText = figlet.textSync("CLI", {
  font: "Standard",
  horizontalLayout: "default",
  verticalLayout: "default",
}).split("\n");

leoText.forEach((line, index) => {
  console.log(
    gradient(['orange', 'yellow'])(line) + 
    gradient(['blue', 'purple'])(cliText[index] || "") 
  );
});