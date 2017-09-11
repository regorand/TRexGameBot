var population = 8;

var amountObstacles = 1;

var inputs = 3 + amountObstacles * 3;

var botLoopInterval;

var currentNetworkIndex = 0;

var networks = [];

var genetics;

var lastKeyPress;

var epochCount = 0;

var stopAtNextEpoch = false;

var bestFitnessSoFar = 0;

function startNew(){
  setup(false);
  startNextBot();
}

function load(){
  setup(true);
  startNextBot();
}

function startNextBot(){
  doKeyPress(true, true);
  doKeyPress(true, false);
  botLoopInterval = setInterval(doBotLoop, 50);
}

function setup(load){

  for(var i = 0; i < population; i++){
    networks[i] = new Brainwave.Network(inputs, 3, 1, 3);
  }
  if(load){
    for(var i = 0; i < networks.length; i++){
      networks[i].importWeights(parseSavedWeights(localStorage.getItem("networkWeights_" + i) ));
    }
  }
  genetics = new Brainwave.Genetics(population, networks[0].getNumWeights());
}


function doBotLoop(){
  if(!Runner.instance_.crashed){
    if(lastKeyPress == 1){
      doKeyPress(true, false);
    } else if(lastKeyPress == 2){
      doKeyPress(false, false);
    }
    var inputs = parseInputs();
    var output = networks[currentNetworkIndex].run(inputs);
    handleOutput(output);
  } else {
    //not running

    doKeyPress(true, false);
    doKeyPress(false, false);
    handleGameOver();
  }
}

var upKeyCode = 38;
var downKeyCode = 40;

function doKeyPress(isUp, isKeyDown){
  var event = document.createEvent('Event');
  event.initEvent((isKeyDown ? 'keydown' : 'keyup'), true, true);
  event.keyCode = isUp ? upKeyCode : downKeyCode;
  document.dispatchEvent(event);
}

function handleOutput(output){
  if(output.length != 3){
    return; //this should never happen
  }
  lastKeyPress = 0;

  if(output[0] > output[1] && output[0] > output[2]){
    lastKeyPress = 1;
    doKeyPress(true, true);
  } else if(output[2] > output[0] && output[2] > output[1]) {
    lastKeyPress = 2;
    doKeyPress(false, true);
  }
}

function parseSavedWeights(rawData){
  splitString = rawData.split(",");
  var floats = [];
  for(var i = 0; i < splitString.length; i++){
    floats.push(parseFloat(splitString[i]));
  }
  return floats;
}

function parseInputs(){
  var result = [];
  var obstacles = Runner.instance_.horizon.obstacles;
  result.push(sigmoid(Runner.instance_.tRex.xPos));
  result.push(sigmoid(Runner.instance_.tRex.yPos));
  result.push(sigmoid(Runner.instance_.currentSpeed));
  for(var i = 0; i < amountObstacles; i++){
    var obs = obstacles[i];
    if(obs !== undefined){
      result.push(sigmoid(obs.xPos));
      result.push(sigmoid(obs.yPos));
      result.push(sigmoid(getNumOfObstacleType(obs.typeConfig.type)));
    } else {
      result.push(sigmoid(-1));
      result.push(sigmoid(-1));
      result.push(sigmoid(-1));
    }
  }
  return result;
}

function handleGameOver(){
  stopInterval();
  if(currentNetworkIndex >= population - 1){
    doNewEpoch();
    epochCount++;
    console.log("finished epoch " + epochCount + "!");
    if(!stopAtNextEpoch){
      currentNetworkIndex = 0;
      setTimeout(startNextBot, 2000);
    }
  } else {
    var fitness = getFitnessScore();
    genetics.population[currentNetworkIndex].fitness = fitness;
    if(fitness > bestFitnessSoFar){
      bestFitnessSoFar = fitness;
      console.log("new best attempt with fitness score: " +  fitness);
      saveNetworkWeights(networks[currentNetworkIndex], "bestAttempt");
    }
    currentNetworkIndex++;
    setTimeout(startNextBot, 1000);
  }
}

function doNewEpoch(){
  genetics.epoch(genetics.population);
  for(var i = 0; i < population; i++){
    networks[i].importWeights(genetics.population[i].weights);
  }
}

function getFitnessScore(){
  return Runner.instance_.distanceRan;
}

function getNumOfObstacleType(typeString){
  switch(typeString){
    case "CACTUS_SMALL":
      return 0;
    case "CACTUS_LARGE":
      return 1;
    case "PTERODACTYL":
      return 2;
  }
}

function saveNetworkWeights(network, localStorageName){
  localStorage.setItem(localStorageName, network.exportWeights());
}

function sigmoid(t) {
    return 1/(1+Math.pow(Math.E, -t));
}

function stopNextEpoch(){
  stopAtNextEpoch = true;
}

function stopInterval(){
  clearInterval(botLoopInterval);
}
