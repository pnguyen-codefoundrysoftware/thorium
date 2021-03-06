import uuid from "uuid";
import App from "../../app";
import {
  defaultOptionalSteps,
  damagePositions,
  randomFromList,
} from "./damageReports/constants";
import * as damageReportFunctions from "./damageReports/functions";
import processReport from "./processReport";
import DamageStep from "./damageStep";
import DamageTask from "./damageTask";
import {Station, Card} from "../stationSet";

const damageStepFunctions: {[key: string]: any} = {...damageReportFunctions};

// TODO: Replace these anys with proper type defintitions
export interface DamageStepContext extends System {
  damageSteps: any[];
  simulator: any;
  stations: Station[];
  deck: any;
  room: any;
  location: string;
  crew: any;
  damageTeamCrew: any;
  damageTeamCrewCount: any;
  securityTeamCrew: any;
}
export interface DamageStepArgs {
  preamble: string;
  name: string;
  orders: string;
  inventory: any;
  room: string;
  code: string;
  backup: string;
  equipment: string;
  query: string;
  end: boolean;
  message: string;
  destination: string;
  reactivate: boolean;
  cleanup: boolean;
  type: string;
}

export class Macro {
  id: string;
  event: string;
  args: string;
  delay: number;
  noCancelOnReset: boolean;
  constructor(params: Macro) {
    this.id = params.id || uuid.v4();
    this.event = params.event || "";
    this.args = params.args || "{}";
    this.delay = params.delay || 0;
    this.noCancelOnReset = params.noCancelOnReset || false;
  }
}

export class Damage {
  systemId?: string;
  damaged?: boolean;
  report?: string | null;
  reportSteps?: any;
  requested?: boolean;
  currentStep?: number;
  reactivationCode?: string | null;
  reactivationRequester?: string | null;
  neededReactivationCode?: string | null;
  exocompParts?: string[];
  validate?: boolean;
  destroyed?: boolean;
  which?: string;
  constructor(params: Damage = {}, systemId: string) {
    this.systemId = systemId;
    this.damaged = params.damaged || false;
    this.report = params.report || null;
    this.reportSteps = params.reportSteps || null;
    this.requested = params.requested || false;
    this.currentStep = params.currentStep || 0;
    this.reactivationCode = params.reactivationCode || null;
    this.reactivationRequester = params.reactivationRequester || null;
    this.neededReactivationCode = params.neededReactivationCode || null;
    this.exocompParts = params.exocompParts || [];
    this.validate = params.validate || false;
    this.destroyed = params.destroyed || false;
    this.which = params.which || "default";
  }
}
interface Power {
  power: number;
  powerLevels: number[];
  defaultLevel: number;
}
export class System {
  id: string;
  class: string;
  type: string;
  simulatorId: string;
  name: string | null;
  storedDisplayName: string;
  upgradeName: string;
  upgraded: boolean;
  upgradeBoard: string | null;
  upgradeMacros: any[];
  power: Power;
  damage: Damage;
  extra: boolean;
  locations: string[];
  requiredDamageSteps: DamageStep[];
  optionalDamageSteps: DamageStep[];
  damageTasks: DamageTask[];
  wing: "left" | "right";
  stealthCompromised: boolean;
  [key: string]: any;
  constructor(params: any = {}) {
    this.id = params.id || uuid.v4();
    this.class = "System";
    this.type = "System";
    this.simulatorId = params.simulatorId || null;
    this.name = params.name || null;
    this.wing = params.wing || "left";
    this.storedDisplayName =
      params.storedDisplayName || params.displayName || params.name;
    this.upgradeName = params.upgradeName || this.storedDisplayName;
    this.upgraded = params.upgraded || false;
    this.upgradeBoard = params.upgradeBoard || null;
    this.upgradeMacros = [];
    params.upgradeMacros &&
      params.upgradeMacros.forEach((m: Macro) =>
        this.upgradeMacros.push(new Macro(m)),
      );
    this.stealthCompromised = false;

    this.power = params.power
      ? {...params.power}
      : {
          power: 5,
          powerLevels: params.extra ? [] : [5],
          defaultLevel: 0,
        };
    this.damage = new Damage(params.damage || {}, this.id);
    this.extra = params.extra || false;
    this.locations = params.locations || [];
    this.requiredDamageSteps = [];
    this.optionalDamageSteps = [];
    params.requiredDamageSteps &&
      params.requiredDamageSteps.forEach((s: DamageStep) =>
        this.requiredDamageSteps.push(new DamageStep(s)),
      );
    params.optionalDamageSteps &&
      params.optionalDamageSteps.forEach((s: DamageStep) =>
        this.optionalDamageSteps.push(new DamageStep(s)),
      );
    // Task-based damage reports
    this.damageTasks = [];
    params.damageTasks &&
      params.damageTasks.forEach((s: DamageTask) =>
        this.damageTasks.push(new DamageTask(s)),
      );
  }
  get stealthFactor(): number | null {
    if (this.stealthCompromised) return 0.8;
    return null;
  }
  set displayName(value) {
    this.storedDisplayName = value;
  }
  get displayName() {
    if (this.upgraded && this.upgradeName) {
      return this.upgradeName;
    }
    return this.storedDisplayName;
  }
  trainingMode() {
    return;
  }
  setWing(wing) {
    this.wing = wing;
  }
  updateName({
    name,
    displayName,
    upgradeName,
  }: {
    name: string;
    displayName: string;
    upgradeName: string;
  }) {
    if (name || name === "") this.name = name;
    if (displayName || displayName === "") this.displayName = displayName;
    if (upgradeName || upgradeName === "") this.upgradeName = upgradeName;
  }
  setUpgradeMacros(macros: Macro[]) {
    this.upgradeMacros = macros || [];
  }
  setUpgradeBoard(board: string) {
    this.upgradeBoard = board;
  }
  upgrade() {
    this.upgraded = true;
  }
  updateLocations(locations: string[]) {
    this.locations = locations || [];
  }
  setPower(powerLevel: number) {
    this.power.power = powerLevel;
  }
  setPowerLevels(levels: number[]) {
    this.power.powerLevels = levels;
    if (this.power.defaultLevel >= levels.length) {
      this.power.defaultLevel = levels.length - 1;
    }
  }
  setDefaultPowerLevel(level: number) {
    this.power.defaultLevel = level;
  }
  break(report: string, destroyed: boolean, which: string = "default") {
    this.damage.damaged = true;
    if (destroyed) this.damage.destroyed = true;
    this.damage.report = processReport(report, this);
    this.damage.requested = false;
    this.damage.currentStep = 0;
    this.damage.which = which;
  }
  addDamageStep({
    name,
    args,
    type,
  }: {
    name: string;
    args: string;
    type: string;
  }) {
    this[`${type}DamageSteps`].push(new DamageStep({name, args}));
  }
  updateDamageStep({id, name, args}: {id: string; name: string; args: string}) {
    const step =
      this.requiredDamageSteps.find(s => s.id === id) ||
      this.optionalDamageSteps.find(s => s.id === id);
    step.update({name, args});
  }
  removeDamageStep(stepId: string) {
    // Check both required and optional
    this.requiredDamageSteps = this.requiredDamageSteps.filter(
      s => s.id !== stepId,
    );
    this.optionalDamageSteps = this.optionalDamageSteps.filter(
      s => s.id !== stepId,
    );
  }
  generateDamageReport(stepCount = 5) {
    const sim = App.simulators.find(s => s.id === this.simulatorId);
    const decks = App.decks.filter(d => d.simulatorId === this.simulatorId);
    const rooms = App.rooms.filter(r => this.locations.indexOf(r.id) > -1);
    const crew = App.crew.filter(c => c.simulatorId === this.simulatorId);

    //
    // Gather Information
    //

    // Get the damage team positions
    const damageTeamCrew = crew
      .map(c => c.position)
      .filter(c => damagePositions.indexOf(c) > -1)
      .filter((c, i, a) => a.indexOf(c) === i);
    const damageTeamCrewCount = crew
      .filter(c => damagePositions.indexOf(c.position) > -1)
      .reduce((prev, next) => {
        prev[next.position] = prev[next.position] ? prev[next.position] + 1 : 1;
        return prev;
      }, {});
    const securityTeamCrew = crew
      .map(c => c.position)
      .filter(c => c.indexOf("Security") > -1);
    const stations = sim.stations;
    const components = stations.reduce((prev: string[], s: Station) => {
      return prev.concat(s.cards.map((c: Card) => c.component));
    }, []);

    const widgets = stations
      .reduce((prev: string[], s: Station) => {
        return prev.concat(s.widgets);
      }, [])
      .filter((c: string, i: number, a: string[]) => a.indexOf(c) !== i);
    const damageSteps = [];

    //
    // Create a list of all the damage report steps
    //

    // Remove power if the system has power
    if (
      this.power.powerLevels &&
      this.power.powerLevels.length > 0 &&
      components.indexOf("PowerDistribution") > -1
    ) {
      damageSteps.push({name: "power", args: {end: false}});
    }

    // Add in any required damage steps at the start
    this.requiredDamageSteps
      .concat(sim.requiredDamageSteps)
      .filter(step => step.args.end !== true)
      .forEach(step => damageSteps.push(step));
    let hasDamageTeam = false;
    // Add in a number of optional steps
    let optionalSteps = defaultOptionalSteps
      .concat(this.optionalDamageSteps)
      .concat(sim.optionalDamageSteps)
      .filter((step: DamageStep) => {
        if (step.name === "damageTeam") {
          const output =
            damageTeamCrew.length > 0 &&
            this.locations.length > 0 &&
            components.indexOf("DamageTeams") > -1;
          hasDamageTeam = output;
          return output;
        }
        if (step.name === "damageTeamMessage") {
          return (
            (components.indexOf("Messaging") > -1 ||
              widgets.indexOf("messages") > -1) &&
            damageTeamCrew.length > 0 &&
            hasDamageTeam
          );
        }
        if (step.name === "remoteAccess") {
          return widgets.indexOf("remote") > -1;
        }
        if (step.name === "sendInventory") {
          return (
            App.inventory.filter(
              i =>
                i.simulatorId === this.simulatorId &&
                i.metadata.type === "repair",
            ).length > 0
          );
        }
        if (step.name === "longRangeMessage") {
          return (
            widgets.indexOf("composer") > -1 &&
            components.indexOf("LongRangeComm") > -1 &&
            this.class !== "LongRangeComm"
          );
        }
        if (step.name === "probeLaunch") {
          return (
            components.indexOf("ProbeConstruction") > -1 &&
            this.class !== "Probes"
          );
        }
        if (step.name === "generic") return true;
        if (step.name === "securityTeam") {
          return (
            components.indexOf("SecurityTeams") > -1 &&
            securityTeamCrew.length > -1
          );
        }
        if (step.name === "securityEvac") {
          return components.indexOf("SecurityDecks") > -1 && decks.length > -1;
        }
        if (step.name === "internalCall") {
          return (
            components.indexOf("CommInternal") > -1 &&
            decks.length > -1 &&
            this.class !== "InternalComm"
          );
        }
        if (step.name === "exocomps") {
          return (
            components.indexOf("Exocomps") > -1 &&
            App.exocomps.find(e => e.simulatorId === sim.id)
          );
        }
        if (step.name === "softwarePanel") {
          return App.softwarePanels.find(e => e.simulatorId === sim.id);
        }
        if (step.name === "computerCore") {
          return components.indexOf("ComputerCore") > -1;
        }
        return false;
      });

    let stepIteration = 0;

    // Start with a damage team, if possible
    if (optionalSteps.find((s: DamageStep) => s.name === "damageTeam")) {
      damageSteps.push({name: "damageTeam", args: {}});
      stepIteration = 1;
    }
    while (damageSteps.length < stepCount && stepIteration < 50) {
      // Ensure we don't infinitely loop
      stepIteration++;
      // Grab a random optional step
      const stepIndex = Math.floor(Math.random() * optionalSteps.length);
      if (optionalSteps.length > 0) {
        if (
          optionalSteps[stepIndex].name === "generic" ||
          !damageSteps.find(d => d.name === optionalSteps[stepIndex].name)
        ) {
          damageSteps.push(optionalSteps[stepIndex]);
          if (optionalSteps[stepIndex].name !== "damageTeam") {
            // We need to remove this optional step from the list so it is not repeated;
            // Keep damage teams so we can get a cleanup team.
            optionalSteps = optionalSteps.filter(
              (_: never, i: number) => i !== stepIndex,
            );
          }
        } else if (
          optionalSteps[stepIndex].name === "damageTeam" &&
          damageSteps.filter(d => d.name === "damageTeam").length === 1
        ) {
          // Clear the damage team
          damageSteps.push({name: "damageTeam", args: {end: true}});
          // Add a cleanup team
          damageSteps.push({
            name: "damageTeam",
            args: {end: false, cleanup: true},
          });
        }
      }
    }

    // Finishing Steps
    // Add in any required damage steps at the end
    this.requiredDamageSteps
      .concat(sim.requiredDamageSteps)
      .filter(step => step.args.end === true)
      .forEach(step => damageSteps.push(step));

    // Clear out any damage teams
    if (damageSteps.find(d => d.name === "damageTeam")) {
      damageSteps.push({name: "damageTeam", args: {end: true}});
    }
    // Add power if the system has power
    if (damageSteps.find(d => d.name === "power")) {
      damageSteps.push({name: "power", args: {end: true}});
    }

    // Add the finishing step. Include reactivation code.
    damageSteps.push({name: "finish", args: {reactivate: true}});

    // Now put together our damage report usign the damage step functions
    // Pick a location for the damage team
    const randomRoom = randomFromList(this.locations || []);
    const room = rooms.find(r => r.id === randomRoom);
    const deck = room && App.decks.find(d => d.id === room.deckId);
    const randomLocation = randomFromList(
      App.rooms.filter(r => r.simulatorId === this.simulatorId),
    );
    const randomLocationDeck = randomLocation
      ? App.decks.find(d => d.id === randomLocation.deckId)
      : {number: null};
    const location = room
      ? `${room.name}, Deck ${deck.number}`
      : deck
      ? `Deck ${deck.number}`
      : randomLocation
      ? `${randomLocation.name}, Deck ${randomLocationDeck?.number}`
      : "None";
    // First create our context object
    const context = Object.assign(
      {
        damageSteps,
        simulator: sim,
        stations,
        deck,
        room,
        location,
        crew,
        damageTeamCrew,
        damageTeamCrewCount,
        securityTeamCrew,
      },
      this,
    );
    const damageReport = damageSteps
      .map((d, index) => ({
        ...d,
        report: damageStepFunctions[d.name](d.args || {}, context, index),
      }))
      .filter(f => f.report)
      .reduce((prev, {report}, index) => {
        return `${prev}
Step ${index + 1}:
${report}

`;
      }, "");
    return damageReport;
  }

  damageReport(report: string) {
    this.damage.report = processReport(report, this);
    this.damage.requested = false;
  }
  repair() {
    this.damage.damaged = false;
    this.damage.destroyed = false;
    this.damage.report = null;
    this.damage.requested = false;
    this.damage.neededReactivationCode = null;
    this.damage.reactivationCode = null;
    this.damage.reactivationRequester = null;
    this.damage.exocompParts = [];
    this.damage.currentStep = 0;
    this.damage.which = null;
  }
  updateCurrentStep(step: number) {
    this.damage.currentStep = step;
  }
  requestReport() {
    this.damage.requested = true;
  }
  reactivationCode(code: string, station: string) {
    this.damage.reactivationCode = code;
    this.damage.reactivationRequester = station;
  }
  reactivationCodeResponse(response: string) {
    this.damage.reactivationCode = null;
    this.damage.reactivationRequester = null;
  }
  // Damage Tasks
  // As a side note, can I just say how much more elegant
  // the damage tasks system is already? Look at this!
  // It's much simpler. Why didn't I do it this
  // way in the first place? ~A
  addDamageTask(task: DamageTask) {
    if (!task || !task.id || this.damageTasks.find(t => t.id === task.id))
      return;
    this.damageTasks.push(new DamageTask(task));
  }
  updateDamageTask(task: DamageTask) {
    this.damageTasks.find(t => t.id === task.id).update(task);
  }
  removeDamageTask(id: String) {
    this.damageTasks = this.damageTasks.filter(t => t.id !== id);
  }
}
