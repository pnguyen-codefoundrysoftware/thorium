import App from "../app";
import { System } from "./generic";
import {
  randomFromList,
  greekLetters
} from "./generic/damageReports/constants";

export default class InternalComm extends System {
  constructor(params = {}) {
    super(params);
    this.type = "InternalComm";
    this.class = "InternalComm";
    this.name = params.name || "Internal Communications";
    this.displayName = params.displayName || "Internal Comm";
    this.state = params.state || "idle"; //One of 'idle', 'connected'
    this.outgoing = params.outgoing || null;
    this.incoming = params.incoming || null;
  }
  static tasks = [
    {
      name: "Internal Call",
      active({ simulator, stations }) {
        // Check cards and system
        const decks = App.decks.filter(d => d.simulatorId === simulator.id);
        const rooms = App.rooms.filter(r => r.simulatorId === simulator.id);
        return (
          stations.find(s =>
            s.cards.find(c => c.component === "CommInternal")
          ) &&
          decks.length > 0 &&
          rooms.length > 0
        );
      },
      values: {
        preamble: {
          input: () => "text",
          value: () => "A call must be made within the ship."
        },
        room: {
          input: ({ simulator }) => (simulator ? "roomPicker" : "text"),
          value: ({ simulator }) =>
            randomFromList(
              App.rooms
                .filter(r => r.simulatorId === simulator.id)
                .map(r => r.id)
            )
        },
        message: {
          input: () => "textarea",
          value: () => {
            const messageList = [
              `Run a level ${Math.floor(Math.random() * 5)} diagnostic.`,
              `Activate the ${randomFromList(greekLetters)} protocol.`,
              `Ensure there is no residual power flow in the junction capacitors.`
            ];
            return randomFromList(messageList);
          }
        }
      },
      instructions({
        simulator,
        requiredValues: { preamble, room: roomId, message }
      }) {
        const station = simulator.stations.find(s =>
          s.cards.find(c => c.component === "CommInternal")
        );
        const room = App.rooms.find(r => r.id === roomId);
        const deck = App.decks.find(
          d => d.id === (room ? room.deckId : roomId)
        );
        return `${preamble} Ask the ${
          station
            ? `${station.name} Officer`
            : "person in charge of internal communication"
        } to make the following internal call:
        
Location: ${
          !room && !deck
            ? "All Decks"
            : room
              ? `${room.name}, Deck ${deck.number}`
              : `Deck ${deck.number}`
        }
Message: ${message}
        `;
        // TODO: Make it so it knows if the task is assigned to the station
        // performing the task, or if it needs to be delegated to another station
      },
      verify({ requiredValues, simulator }) {
        const system = App.systems.find(
          s => s.id === simulator.id && s.type === "InternalComm"
        );
        const room = App.rooms.find(r => r.id === requiredValues.room);
        const deck = App.decks.find(
          d => d.id === (room ? room.deck : requiredValues.room)
        );
        const locString = deck
          ? `${room ? `${room.name}, ` : ``}Deck ${deck.number}`
          : "All Decks";
        return system && system.outgoing === locString;
      }
    }
  ];
  break(report, destroyed, which) {
    this.state = "idle";
    super.break(report, destroyed, which);
  }
  connectOutgoing() {
    this.state = "connected";
    this.incoming = this.outgoing;
  }
  connectIncoming() {
    this.state = "connected";
    this.outgoing = this.incoming;
  }
  callIncoming(incoming) {
    this.incoming = incoming;
  }
  callOutgoing(outgoing) {
    this.outgoing = outgoing;
  }
  cancelIncomingCall() {
    this.state = "idle";
    if (this.outgoing === this.incoming) this.outgoing = null;
    this.incoming = null;
  }
  cancelOutgoingCall() {
    this.state = "idle";
    if (this.incoming === this.outgoing) this.incoming = null;
    this.outgoing = null;
  }
  setPower(powerLevel) {
    if (
      this.power.powerLevels.length &&
      powerLevel < this.power.powerLevels[0]
    ) {
      this.state = "idle";
    }
    super.setPower(powerLevel);
  }
}
