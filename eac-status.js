const readline = require("readline");
const vrchat = require("vrchat");
const EventEmitter = require("events");
const eventEmitter = new EventEmitter();
const fs = require("fs");

let VRCCurrentUser;
let AuthenticationApi;
let UsersApi;

let EACAcronyms;
EACAcronyms = fs.readFileSync('EAC.txt').toString().split("\n");

// Prompts for input, Python style
function prompt(query) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise(resolve => rl.question(query, ans => {
    
    rl.close();
    resolve(ans);
  }))
}

// Prompts for input but masks it
function passwordEntry(query) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  rl._writeToOutput(query);
  rl._writeToOutput = function _writeToOutput(stringToWrite) { rl.output.write("*"); }

  return new Promise(resolve => {
    rl.question(query, ans => {
      rl.history = rl.history.slice(1);
      rl.close();
      resolve(ans);
    });
  });
}

// Handle authenticating with VRChat API
// TODO: Save authentication cookie so don't have to login each time
const VRCLoginFlow = async function() {
let VRCUsername = await prompt("VRC Username: ");
let VRCPassword = await passwordEntry("VRC Password: ");
const configuration = new vrchat.Configuration({
  username: VRCUsername,
  password: VRCPassword
});
  AuthenticationApi = new vrchat.AuthenticationApi(configuration);
  UsersApi = new vrchat.UsersApi(configuration);
  AuthenticationApi.getCurrentUser().then(async resp => {
    if (resp.data.requiresTwoFactorAuth != undefined) {  
      let twoFactorAuthCode = await prompt("Enter 2FA: ");
      await AuthenticationApi.verify2FA( {'code': twoFactorAuthCode} ).then(async resp2 => { // weird hack to get vrchat module to work properly, sending a raw string gives HTTP 400
        await AuthenticationApi.getCurrentUser().then(async resp3 => {VRCCurrentUser = resp3.data;});
      });
    } else {
      VRCCurrentUser = resp.data;
    }
    console.log(`Logged in as: ${VRCCurrentUser.username}`);
    isVRChat = true;
    eventEmitter.emit('ready');
  });
}

// Sets your status message in VRChat
function updateVRCStatus() {
    const str = EACAcronyms[Math.floor(Math.random() * EACAcronyms.length)];
    if ( str.length > 31 )  str = str.substring(0, 31); 
    try {
        UsersApi.updateUser(VRCCurrentUser.id, {"statusDescription": str});
        console.log(`Updated status message to: ${str}`);
    } catch (e) {
        console.log("Could not update VRC status: " + e);
    }
}

eventEmitter.once("ready", () => {
    console.log("Everything is ready!");
    updateVRCStatus();
    setInterval(updateVRCStatus, 60 * 60e3);
});

VRCLoginFlow();

// process.stdin.resume();
// process.on('SIGINT', () => {   process.exit(); });
