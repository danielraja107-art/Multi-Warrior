import { Room, Client } from 'colyseus';
import { GameState } from '@storm-arena/shared';
export declare class GameRoom extends Room<GameState> {
    maxClients: number;
    private movement;
    onCreate(options: {
        difficulty?: string;
    }): void;
    onJoin(client: Client): void;
    onLeave(client: Client, consented: boolean): void;
    onDispose(): void;
    private normalizeMoveInput;
    private serverTick;
}
//# sourceMappingURL=GameRoom.d.ts.map