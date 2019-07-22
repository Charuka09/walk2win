let marks = require('../constants');
let Player = require('../models/player');
let Team = require('../models/team');
let bonusLimits = {
  individual: 15500,
  team: 60000
};
let bonusPoints = {
  individual: 100,
  team: 100
}

let calculatePoints = (options) => {
    let steps = options.steps;
    let type = options.type;
    let points = 0;

    switch(type) {
        case 'team':
            for (mark of marks.teamMarks) {
                if(mark[0] <= steps) {
                    points = mark[1];
                    break;
                }
            }
            break;
        case 'solo':
            for (mark of marks.soloMarks) {
                if(mark[0] <= steps) {
                    points = mark[1];
                    break;
                }
            }
            break;
    }

    return points;
};

let calculateTotalsSolo = async (id) => {
    let player = await Player.findOne({_id: id});
    if(!player) return;
    let totalPoints = player.total_steps.reduce((a, b) => (a + b.points), 0);
    let totalSteps = player.total_steps.reduce((a, b) => (a + b.steps), 0);
    await Player.updateOne({_id: id}, {points: totalPoints, steps: totalSteps});
    return {
        totalPoints: totalPoints,
        totalSteps: totalSteps
    };
}


let calculateTotalsTeam = async (id, myId) => {
    let players = await Player.find({team: id});
    if(!players) return;
    let steps = 0;
    let points = 0;
    let myRes = {};

    for(let player of players) {
        let res = await calculateTotalsSolo(player.id);
        if(player.id == myId) 
            myRes = res;
        points += res.totalPoints;
        steps += res.totalSteps;
    }

    await Team.updateOne({_id: id}, {steps: steps, points: points});
    return myRes;
}

let leaderboardComparator = (a, b) => {
    const c = b.points - a.points;
    if(c == 0)
        return b.steps - a.steps;
    return c;
}

let calculateBonusSolo = async (id, date) => {
    let player = await Player.findOne({_id: id, "total_steps.date": date});
    if(!player) return;
    let totalPoints = player.total_steps.points;
    let totalSteps = player.total_steps.steps;
    if(totalSteps >= bonusLimits.individual) {
      totalPoints = totalPoints + bonusPoints.individual;
    }

    const opt = {
      upsert: true
    };

    let elem = await Player.findOneAndUpdate({_id: player.id, "total_steps.date": date}, {
      "$set": {
        "total_steps.$.points": points
      }, opt
    });

    return {
        totalPoints: totalPoints,
    };
}

let calculateTeamBonus = async (id, date) => {
    let players = await Player.find({team: id});
    if(!players) return;
    let steps = 0;
    let points = 0;
    let myRes = {};

    for(let player of players) {
        let res = await calculateBonusSolo(player.id, date);
        if(player.id == myId) 
            myRes = res;
        points += res.totalPoints;
    }
   
    if(totalSteps >= bonusLimits.team) {
      totalPoints = totalPoints + bonusPoints.team;	
    }

    await Team.updateOne({_id: id}, {points: totalPoints});
    return myRes;
}

module.exports = {
    calculatePoints: calculatePoints,
    calculateTotalsSolo: calculateTotalsSolo,
    calculateTotalsTeam: calculateTotalsTeam,
    leaderboardComparator: leaderboardComparator,
    calculateBonusSolo: calculateBonusSolo,
    calculateTeamBonus: calculateTeamBonus
};
