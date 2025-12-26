import { GameServer } from '../lib/gameLogic.js';

// Start the game server when this module is imported
const gameServer = new GameServer(8080);

export default gameServer;