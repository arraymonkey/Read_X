// Copyright 2018 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

"use strict";

var enabled = true;
var currentReadingTab = -1;

/*chrome.action.onClicked.addListener((tab) => {
  activateExtention();
});*/

function activateExtention() {
  chrome.storage.local.get({ onOff: "off" }, function (data) {
    if (data.onOff === "on") {
      chrome.storage.local.set({ onOff: "off", isPlaying: "off" }, function () {
        chrome.action.setIcon({
          path: {
            16: "images/gray16.png",
            48: "images/gray48.png",
            128: "images/gray128.png",
          },
        });

        currentReadingTab = -1;
        enabled = false;
        //sendMessageToChild("it's off");
        sendMessageToOthers("off was pressed");

        /*console.log("Data saved to off");*/
      });
    } else {
      chrome.storage.local.set({ onOff: "on", isPlaying: "off" }, function () {
        chrome.action.setIcon({
          path: {
            16: "images/get_started16.png",
            48: "images/get_started48.png",
            128: "images/get_started128.png",
          },
        });

        currentReadingTab = -1;
        enabled = true;
        //sendMessageToChild("it's on");
        sendMessageToOthers("it's on");
        sendMessageToOthers("on was pressed");

        /*console.log("Data saved to on");*/
      });
    }
  });
}

chrome.commands.onCommand.addListener((command) => {
  //TODO handle event
  if (command === "activateextension") {
    activateExtention();
  }
});

chrome.webNavigation.onHistoryStateUpdated.addListener(function () {
  if (enabled) {
    sendMessageToChild("update");
  }
  /*console.log("History updated");*/
});

chrome.webNavigation.onCompleted.addListener(function () {
  if (enabled) {
    sendMessageToChild("update");
  }
  /*console.log("navigation completed");*/
});

async function sendMessageToChild(message) {
  //console.log( message );
  let queryOptions = { active: true, lastFocusedWindow: true };
  let [tab] = await chrome.tabs.query(queryOptions);
  if (tab) {
    //console.log(tab.id + " " + tab.url + " " + message);
    if (!/\/\/extensions/.test(tab.url) && !/\/\/newtab/.test(tab.url)) {
      setTimeout(function () {
        chrome.tabs.sendMessage(tab.id, { greeting: message + "[url]=>" + tab.url }, (result) => {
          if (!chrome.runtime.lastError) {
          } else {
            //console.log(chrome.runtime.lastError.message);
          }
        });
      }, 250);
    }
  }
}

async function sendMessageToSender(message) {
  setTimeout(function () {
    chrome.runtime.sendMessage({
      msg: "readx replytoextramessage",
      data: {
        subject: message,
      },
    });
  }, 250);
}

// only happens when addon is switched on or off
async function sendMessageToOthers(message) {
  let queryOptions = {};
  let tabs = await chrome.tabs.query(queryOptions);

  if (tabs[0]) {
    for (var i = 0; i < tabs.length; i++) {
      if (!/\/\/extensions/.test(tabs[i].url) && !/\/\/newtab/.test(tabs[i].url) && !/data:text\/html/.test(tabs[i].url) && !/chrome-extension:\/\//.test(tabs[i].url)) {
        //chrome.tabs.sendMessage(tabs[i].id, { greeting: message });
        chrome.tabs.sendMessage(tabs[i].id, { greeting: message }, (result) => {
          if (!chrome.runtime.lastError) {
          } else {
            //console.log(chrome.runtime.lastError.message);
          }
        });
      }
    }
  }
}

chrome.tabs.onUpdated.addListener(function (tabId, changeInfo, tab) {
  if (tabId == currentReadingTab) {
    /*console.log( "set to off " );*/
    //chrome.storage.local.set({ isPlaying: "off" });
    if (changeInfo.title) {
      return;
    }

    setIsPlaying("off");
    currentReadingTab = -1;
  }
});

function setIsPlaying(playing) {
  //console.log( "playing: " + playing );
  chrome.storage.local.set({ isPlaying: playing });
}

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  /*console.log(
    sender.tab
      ? "from a content script:" + sender.tab.url + " " + sender.tab.id
      : "from the extension"
  );*/

  if (request.toSay != null) {
    /*chrome.tts.getVoices(
      function(voices) {
        for (var i = 0; i < voices.length; i++) {
          console.log('Voice ' + i + ':');
          console.log('  name: ' + voices[i].voiceName);
          console.log('  lang: ' + voices[i].lang);
          console.log('  extension id: ' + voices[i].extensionId);
          console.log('  event types: ' + voices[i].eventTypes);
        }
      }
    );*/

    var DELIM = "\n\n|\n\n";
    var parts = request.toSay.split(DELIM);

    //var speechData = { voiceName: parts[0], lang: parts[1], rate: parts[2] };
    console.log(parts);

    if (parts.length >= 4) {
      var speechData = { voiceName: parts[0], lang: parts[1], rate: parseInt(parts[0]) };
      chrome.tts.speak(
        parts[3],
        {
          voiceName: speechData.voiceName,
          lang: speechData.lang,
          rate: speechData.rate,
          onEvent: function (event) {
            console.log("Event " + event.type + " at position " + event.charIndex);
            if (event.type == "end") {
              sendEnd();
            }
            if (event.type == "word") {
              sendOnBoundary(event.charIndex + " " + event.length);
            }
            if (event.type == "error") {
              //console.log("Error: " + event.errorMessage);
            }
          },
        },
        catchLastError
      );
    }
  }
  if (request.greeting) {
    if (currentReadingTab == -1 && request.greeting == "reading") {
      if (currentReadingTab == -1) {
        currentReadingTab = sender.tab.id;
        setIsPlaying("on");
      }
    }
    if (request.greeting == "paused") {
      currentReadingTab = -1;
      setIsPlaying("off");
    }

    if (request.greeting == "readx save update") {
      sendMessageToOthers("update readx");
    }

    if (request.greeting == "play-selection") {
      sendMessageToChild("play-selection");
    }

    if (request.greeting == "readx-page-is-disabled") {
      sendMessageToChild("readx-page-is-disabled");
    }

    if (request.greeting == "readx toggle") {
      activateExtention();
    }

    if (request.greeting.match(/readx select/gim)) {
      sendMessageToChild(request.greeting);
    }

    if (request.greeting.match(/readx extramessage/gim)) {
      sendMessageToChild(request.greeting);
    }

    if (request.greeting.match(/readx replytoextramessage/gim)) {
      sendMessageToSender(request.greeting);
    }
  }

  return true;
});

async function sendEnd() {
  let queryOptions = {};
  let tabs = await chrome.tabs.query(queryOptions);
  chrome.storage.local.set({ isPlaying: "off" });
  if (currentReadingTab >= 0) {
    for (let i = 0; i < tabs.length; i++) {
      if (tabs[i].id == currentReadingTab) {
        chrome.tabs.sendMessage(tabs[i].id, { toSay: "on end" });
      }
    }
  }
}

async function sendOnBoundary(str) {
  let queryOptions = {};
  let tabs = await chrome.tabs.query(queryOptions);
  if (currentReadingTab >= 0) {
    for (let i = 0; i < tabs.length; i++) {
      if (tabs[i].id == currentReadingTab) {
        chrome.tabs.sendMessage(tabs[i].id, { onBoundary: str });
      }
    }
  }
}

function catchLastError() {
  if (chrome.runtime.lastError) {
    console.log("error: ", chrome.runtime.lastError);
    chrome.storage.local.set({ isPlaying: "off" });
    currentReadingTab = -1;
  } else {
    // some code goes here.
  }
}

chrome.tabs.onRemoved.addListener(function (tabId, removeInfo) {
  if (tabId == currentReadingTab) {
    /*console.log( "removed" );*/
    chrome.storage.local.set({ isPlaying: "off" });
    currentReadingTab = -1;
  }
});

chrome.runtime.onInstalled.addListener(function (detals) {
  updateData();

  if (detals.reason == chrome.runtime.OnInstalledReason.INSTALL /*|| detals.reason == chrome.runtime.OnInstalledReason.UPDATE*/) {
    chrome.tabs.create(
      {
        active: true,
        url: "options.html",
      },
      null
    );
  }
  /*console.log("onInstalled");*/
});

chrome.runtime.onStartup.addListener(function () {
  updateData();
  /*console.log("onStartup");*/
});

function updateData() {
  chrome.storage.local.get({ onOff: "on" }, function (data) {
    if (data.onOff === "off") {
      chrome.action.setIcon({
        path: {
          16: "images/gray16.png",
          48: "images/gray48.png",
          128: "images/gray128.png",
        },
      });

      enabled = false;
      /*console.log("open and enabled 2= " + enabled);*/
    } else {
      chrome.storage.local.set({ onOff: "on", isPlaying: "off" }, function () {});
      chrome.action.setIcon({
        path: {
          16: "images/get_started16.png",
          48: "images/get_started48.png",
          128: "images/get_started128.png",
        },
      });

      enabled = true;
      /*console.log("open and enabled 2= " + enabled);*/
    }
  });
}
