import inquirer from 'inquirer';

// Register the prompts
inquirer.registerPrompt('list', require('inquirer/lib/prompts/list'));
inquirer.registerPrompt('input', require('inquirer/lib/prompts/input'));
inquirer.registerPrompt('confirm', require('inquirer/lib/prompts/confirm'));
inquirer.registerPrompt('password', require('inquirer/lib/prompts/password'));

export { inquirer };
