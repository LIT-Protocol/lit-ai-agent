import { TextEncoder, TextDecoder } from 'util';
import { LocalStorage } from 'node-localstorage';

// Create a storage directory if it doesn't exist
const localStorage = new LocalStorage('./scratch');

// Extend the NodeJS global type
declare global {
  // eslint-disable-next-line no-var
  var localStorage: Storage;
}

// Setup LocalStorage for Node.js environment
Object.assign(global, { localStorage });

// TextEncoder and TextDecoder are already available in the global scope in Node.js
// No need to explicitly declare or assign them
