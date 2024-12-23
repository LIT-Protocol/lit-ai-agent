import { inquirer } from './setup';

export async function promptForUserIntent(): Promise<string> {
  const { intent } = await inquirer.prompt([
    {
      type: 'input',
      name: 'intent',
      message: 'What would you like me to help you with?',
      validate: (input: string) => {
        if (!input.trim()) {
          return 'Please provide a description of what you would like me to help you with.';
        }
        return true;
      },
    },
  ]);

  return intent.trim();
}
