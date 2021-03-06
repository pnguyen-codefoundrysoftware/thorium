import React, {Component} from "react";
import {Query} from "react-apollo";
import gql from "graphql-tag.macro";
import SubscriptionHelper from "helpers/subscriptionHelper";
import Railgun from "./railgun";
import "./style.scss";

const fragments = {
  railgunFragment: gql`
    fragment RailgunData on Railgun {
      id
      displayName
      damage {
        damaged
      }
      power {
        power
        powerLevels
      }
      ammo
      maxAmmo
      availableAmmo
    }
  `,
  contactFragment: gql`
    fragment RailgunContactData on SensorContact {
      id
      location {
        x
        y
        z
      }
      destination {
        x
        y
        z
      }
      position {
        x
        y
        z
      }
      type
      hitpoints
      destroyed
      startTime
      endTime
      speed
    }
  `,
};
export const RAILGUN_QUERY = gql`
  query Railgun($simulatorId: ID!) {
    railgun(simulatorId: $simulatorId) {
      ...RailgunData
    }
    sensorContacts(simulatorId: $simulatorId, type: "projectile") {
      ...RailgunContactData
    }
  }
  ${fragments.railgunFragment}
  ${fragments.contactFragment}
`;
export const RAILGUN_SUB = gql`
  subscription RailgunUpdate($simulatorId: ID!) {
    railgunUpdate(simulatorId: $simulatorId) {
      ...RailgunData
    }
  }
  ${fragments.railgunFragment}
`;

export const RAILGUN_CONTACTS_SUB = gql`
  subscription SensorContactsChanged($simulatorId: ID) {
    sensorContactUpdate(simulatorId: $simulatorId, type: "projectile") {
      ...RailgunContactData
    }
  }
  ${fragments.contactFragment}
`;
class RailgunData extends Component {
  state = {};
  render() {
    return (
      <Query
        query={RAILGUN_QUERY}
        variables={{simulatorId: this.props.simulator.id}}
      >
        {({loading, data, error, subscribeToMore}) => {
          if (loading || !data) return null;
          const {railgun, sensorContacts = []} = data;
          if (!railgun[0]) return <div>No Railgun</div>;
          return (
            <SubscriptionHelper
              subscribe={() =>
                subscribeToMore({
                  document: RAILGUN_SUB,
                  variables: {simulatorId: this.props.simulator.id},
                  updateQuery: (previousResult, {subscriptionData}) => {
                    return Object.assign({}, previousResult, {
                      railgun: subscriptionData.data.railgunUpdate,
                    });
                  },
                })
              }
            >
              <SubscriptionHelper
                subscribe={() =>
                  subscribeToMore({
                    document: RAILGUN_CONTACTS_SUB,
                    variables: {simulatorId: this.props.simulator.id},
                    updateQuery: (previousResult, {subscriptionData}) => {
                      return Object.assign({}, previousResult, {
                        sensorContacts:
                          subscriptionData.data.sensorContactUpdate,
                      });
                    },
                  })
                }
              />
              <Railgun
                {...this.props}
                {...railgun[0]}
                contacts={sensorContacts}
              />
            </SubscriptionHelper>
          );
        }}
      </Query>
    );
  }
}

export default RailgunData;
