import App from '../../app';

export const NavigationQueries = {
  navigation(rootValue, {simulatorId}){
    let returnVal = App.systems.filter(s => s.type === 'Navigation');
    if (simulatorId){
      returnVal = returnVal.filter(s => s.simulatorId === simulatorId);
    }
    return returnVal;
  }
};

export const NavigationMutations = {
  navCalculateCourse(rootValue, args, context){
    App.handleEvent(args, 'navCalculateCourse', context.clientId);
  },
  navCancelCalculation(rootValue, args, context){
    App.handleEvent(args, 'navCancelCalculation', context.clientId);
  },
  navCourseResponse(rootValue, args, context){
    App.handleEvent(args, 'navCourseResponse', context.clientId);
  },
  navCourseEntry(rootValue, args, context){
    App.handleEvent(args, 'navCourseEntry', context.clientId);
  },
  navToggleCalculate(rootValue, args, context){
    App.handleEvent(args, 'navToggleCalculate', context.clientId);
  }
};

export const NavigationSubscriptions = {
  navigationUpdate(rootValue, {simulatorId}){
    let returnRes = rootValue;
    if (simulatorId) returnRes = returnRes.filter(s => s.simulatorId === simulatorId);
    return returnRes;
  }
};
