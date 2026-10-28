import { Client } from "colyseus.js";

const SERVER_URL = "ws://localhost:2567";

export const client = new Client(SERVER_URL);

export async function createRoom() {
  const room = await client.create("cricket");
  console.log("Created room, code:", room.roomId);
  return room;
}

export async function joinRoom(roomCode: string) {
  const room = await client.joinById(roomCode);
  console.log("Joined room:", room.roomId);
  return room;
}
