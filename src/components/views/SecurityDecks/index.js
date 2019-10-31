import React, {Fragment, Component} from "react";
import {graphql, withApollo} from "react-apollo";
import {
  Row,
  Col,
  ListGroup,
  ListGroupItem,
  Button,
  Card,
  CardBody,
} from "helpers/reactstrap";
import Tour from "helpers/tourHelper";
import SubscriptionHelper from "helpers/subscriptionHelper";

import gql from "graphql-tag.macro";
import {RoomDropdown} from "helpers/shipStructure";

import "./style.scss";
import BulkheadDoors from "./bulkheadDoors";

const incidentDefinitions = ["Send Security Team"];

const trainingSteps = [
  {
    selector: ".nothing",
    content:
      "This screen allows you to see the status of each deck on the ship, as well as evacuating decks and sealing them off with bulkhead doors.",
  },
  {
    selector: ".deck-list",
    content:
      "This is the list of the decks on your ship. Click a deck to access it.",
  },
  {
    selector: ".doors",
    content: "Use this button to open and close the bulkhead doors.",
  },
  {
    selector: ".evac",
    content:
      "Use this button to evacuate the deck or sound the all-clear. Make sure the bulkhead doors are open before evacuating - otherwise your crew will be stuck on the deck!",
  },
  {
    selector: ".tranzine-gas",
    content:
      "Tranzine gas can be released in specific rooms on the ship. Click the button to release or siphon the gas. Be careful - tranzine gas is a dangerous chemical and can cause medical problems to anyone who inhales it.",
  },
];

const fragments = {
  deckFragment: gql`
    fragment DeckData on Deck {
      id
      number
      evac
      doors
      crewCount
      rooms {
        id
        name
        gas
      }
    }
  `,
  taskFragment: gql`
    fragment SecurityTaskData on Task {
      id
      verified
      instructions
      definition
      values
      verifyRequested
    }
  `,
};

export const DECK_SUB = gql`
  subscription DeckSubscribe($simulatorId: ID!) {
    decksUpdate(simulatorId: $simulatorId) {
      ...DeckData
    }
  }
  ${fragments.deckFragment}
`;

export const DECK_TASK_SUB = gql`
  subscription TasksUpdate($simulatorId: ID!, $definitions: [String!]) {
    tasksUpdate(simulatorId: $simulatorId, definitions: $definitions) {
      ...SecurityTaskData
    }
  }
  ${fragments.taskFragment}
`;

class SecurityDecks extends Component {
  constructor(props) {
    super(props);
    this.state = {
      selectedDeck: null,
      selectedRoom: null,
    };
  }
  _selectDeck(deck) {
    this.setState({
      selectedDeck: deck,
      selectedRoom: null,
    });
  }
  _selectRoom = e => {
    this.setState({
      selectedRoom: e.room,
    });
  };
  _toggleDoors() {
    const mutation = gql`
      mutation ToggleDoors($deckId: ID!, $doors: Boolean!) {
        deckDoors(deckId: $deckId, doors: $doors)
      }
    `;
    const variables = {
      deckId: this.state.selectedDeck,
      doors: !this.props.data.decks.find(d => d.id === this.state.selectedDeck)
        .doors,
    };
    this.props.client.mutate({
      mutation,
      variables,
    });
  }
  _toggleEvac() {
    const mutation = gql`
      mutation ToggleEvac($deckId: ID!, $evac: Boolean!) {
        deckEvac(deckId: $deckId, evac: $evac)
      }
    `;
    const variables = {
      deckId: this.state.selectedDeck,
      evac: !this.props.data.decks.find(d => d.id === this.state.selectedDeck)
        .evac,
    };
    this.props.client.mutate({
      mutation,
      variables,
    });
  }
  _toggleGas() {
    const mutation = gql`
      mutation ToggleGas($roomId: ID!, $gas: Boolean!) {
        roomGas(roomId: $roomId, gas: $gas)
      }
    `;
    const deck = this.props.data.decks.find(
      d => d.id === this.state.selectedDeck,
    );
    const variables = {
      roomId: this.state.selectedRoom,
      gas: !deck.rooms.find(r => r.id === this.state.selectedRoom).gas,
    };
    this.props.client.mutate({
      mutation,
      variables,
    });
  }
  render() {
    if (this.props.data.loading || !this.props.data.decks) return null;
    const {decks, tasks} = this.props.data;
    let deck;
    let room = {};
    if (this.state.selectedDeck) {
      deck = decks.find(d => d.id === this.state.selectedDeck);
    }
    if (this.state.selectedRoom) {
      room = deck.rooms.find(r => r.id === this.state.selectedRoom);
    }
    const taskDecks = tasks
      ? tasks
          .map(t =>
            decks.reduce((prev, next) => {
              if (!t.values || !t.values.room) return prev;
              if (
                next.id === t.values.room ||
                next.rooms.find(r => r.id === t.values.room)
              )
                return next;
              return prev;
            }, null),
          )
          .filter(Boolean)
          .map(d => d.number)
      : [];

    const deckTasks = deck
      ? tasks.filter(
          t =>
            !t.verified &&
            t.values &&
            t.values.room &&
            (t.values.room === deck.id ||
              deck.rooms.find(r => r.id === t.values.room)),
        )
      : [];
    return (
      <Row className="security-decks">
        <SubscriptionHelper
          subscribe={() =>
            this.props.data.subscribeToMore({
              document: DECK_SUB,
              variables: {
                simulatorId: this.props.simulator.id,
              },
              updateQuery: (previousResult, {subscriptionData}) => {
                return Object.assign({}, previousResult, {
                  decks: subscriptionData.data.decksUpdate,
                });
              },
            })
          }
        />
        <SubscriptionHelper
          subscribe={() =>
            this.props.data.subscribeToMore({
              document: DECK_TASK_SUB,
              variables: {
                simulatorId: this.props.simulator.id,
                definitions: incidentDefinitions,
              },
              updateQuery: (previousResult, {subscriptionData}) => {
                return Object.assign({}, previousResult, {
                  tasks: subscriptionData.data.tasksUpdate,
                });
              },
            })
          }
        />
        <Col sm={3} className="deck-list">
          <h4>Decks</h4>
          <ListGroup>
            {decks &&
              decks
                .concat()
                .sort((a, b) => {
                  if (a.number < b.number) return -1;
                  if (b.number < a.number) return 1;
                  return 0;
                })
                .map(d => (
                  <ListGroupItem
                    key={d.id}
                    onClick={this._selectDeck.bind(this, d.id)}
                    className={`${
                      this.state.selectedDeck === d.id ? "selected" : ""
                    } ${d.doors ? "doors" : ""} ${d.evac ? "evac" : ""} ${
                      d.rooms.find(r => r.gas) ? "tranzine" : ""
                    } ${taskDecks.indexOf(d.number) > -1 ? "incident" : ""}`}
                  >
                    Deck {d.number}
                  </ListGroupItem>
                ))}
          </ListGroup>
        </Col>
        <Col sm={{size: 7, offset: 1}}>
          <Row>
            <Col sm={7}>
              <h1>Deck {deck && deck.number} Status:</h1>
              <h2>Bulkhead Doors: {deck && deck.doors ? "Closed" : "Open"}</h2>
              <h2>
                Crew Status:{" "}
                {deck && deck.evac
                  ? deck.crewCount > 0
                    ? "Evacuating..."
                    : "Evacuated"
                  : "On Duty"}
              </h2>
              <h2>Crew Count: {deck && deck.crewCount}</h2>
            </Col>
            <Col sm={5}>
              <div
                key={deck && deck.id}
                style={{margin: "20px", border: "solid 2px black"}}
              >
                <BulkheadDoors open={deck && !deck.doors} />
              </div>
            </Col>
          </Row>
          <Row>
            <Col sm={6}>
              <Button
                className="doors"
                color="warning"
                block
                size="lg"
                disabled={!deck}
                onClick={this._toggleDoors.bind(this)}
              >
                {deck && deck.doors ? "Open Doors" : "Close Doors"}
              </Button>
            </Col>
            <Col sm={6}>
              <Button
                className="evac"
                color="warning"
                block
                size="lg"
                disabled={!deck}
                onClick={this._toggleEvac.bind(this)}
              >
                {deck && deck.evac ? "Sound All-Clear" : "Evacuate Deck"}
              </Button>
            </Col>
          </Row>
          <Row>
            <Col sm={6} className="tranzine-gas">
              <Card>
                <CardBody>
                  <h4>Tranzine Gas</h4>
                  <RoomDropdown
                    selectedDeck={deck && deck.id}
                    selectedRoom={this.state.selectedRoom}
                    decks={decks}
                    disabled={!deck}
                    setSelected={a => this._selectRoom(a)}
                  />
                  <Button
                    color="warning"
                    block
                    disabled={!deck || !this.state.selectedRoom}
                    onClick={this._toggleGas.bind(this)}
                  >{`${room.gas ? "Siphon" : "Release"} Tranzine Gas`}</Button>
                  <p>
                    <em>
                      Warning: The release of tranzine gas will cause
                      unconsiousness to anyone who inhales the gas. Use with
                      caution. Access to tranzine gas is limited to security
                      personnel only. Access is restricted.
                    </em>
                  </p>
                </CardBody>
              </Card>
            </Col>
            {deckTasks.length > 0 && (
              <Col sm={6}>
                <Card style={{maxHeight: "300px", overflowY: "auto"}}>
                  <CardBody>
                    <h4>Security Incidents</h4>
                    <div>
                      {deckTasks.map((d, i, arr) => (
                        <Fragment key={d.id}>
                          <p style={{whiteSpace: "pre-line"}}>
                            {d.instructions}
                          </p>
                          {arr.length > i + 1 && <hr />}
                        </Fragment>
                      ))}
                    </div>
                  </CardBody>
                </Card>
              </Col>
            )}
          </Row>
        </Col>
        <Tour steps={trainingSteps} client={this.props.clientObj} />
      </Row>
    );
  }
}

export const DECK_QUERY = gql`
  query SimulatorDecks($simulatorId: ID!, $definitions: [String!]) {
    decks(simulatorId: $simulatorId) {
      ...DeckData
    }
    tasks(simulatorId: $simulatorId, definitions: $definitions) {
      ...SecurityTaskData
    }
  }
  ${fragments.taskFragment}
  ${fragments.deckFragment}
`;

export default graphql(DECK_QUERY, {
  options: ownProps => ({
    fetchPolicy: "cache-and-network",
    variables: {
      simulatorId: ownProps.simulator.id,
      definitions: incidentDefinitions,
    },
  }),
})(withApollo(SecurityDecks));
