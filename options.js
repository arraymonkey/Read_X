var voices;
var g_voiceIndex;
var g_voiceName;
var g_rate;
var longestWord = "";
var myCodeMirror;
var periodicSaveInterval;

const processChange = debounce(() => saveOnChange());

function legacyStorageData() {
  chrome.storage.sync.get(
    {
      voiceIndex: "10",
      voiceName: "Microsoft Aria",
      voiceSeed: 100,
      replaceStr: "",
      divhilight: false,
      yhighlightonly: true,
      clickValue: true,
      slideValue: true,
      dragsizeValue: "30",
      continousValue: true,
      spacebarValue: true,
      autoscrollValue: true,
      longestWord: "",
      useDoubleClick: true,
      rescan: false,
    },
    function (items) {
      if (items.voiceName != "Microsoft Aria") {
        loadItems(items);
        setTimeout(function () {
          save_options();
        }, 1000);
      }
    }
  );
}

var lastScan = "";
function periodicSaveIfNeeded() {
  try {
    if (!myCodeMirror?.getScrollInfo()) {
      clearInterval(periodicSaveInterval);
      return;
    }

    let scan = objToString(myCodeMirror?.getScrollInfo());
    scan += objToString(myCodeMirror?.getDoc().getAllMarks().length);
    if (lastScan != "" && lastScan != scan) {
      save_options();
    }
    lastScan = scan;
  } catch (ex) {
    clearInterval(periodicSaveInterval);
  }
}

function objToString(obj) {
  if (obj instanceof Object == false) {
    return obj;
  }
  let str = "";
  for (const [key, value] of Object.entries(obj)) {
    str += `${key} ${objToString(value)}`;
  }
  return str;
}

// Saves options to chrome.storage
function save_options() {
  var marks = myCodeMirror?.getDoc().getAllMarks();
  var markLocations = [];
  for (let i = marks?.length - 1; i >= 0; i--) {
    var fnd = marks[i].find();
    markLocations.push({ from: fnd.from.line, to: fnd.to.line });
  }

  var index = document.getElementById("voice").value;
  var name = regexEscape(voices[index].name);
  var speed = document.getElementById("speed").value;
  //var replace = document.getElementById("replace").value;
  var replace = myCodeMirror?.getValue();
  var spacetoplay = document.getElementById("txtspacebartoplay").value;
  var autoplay = document.getElementById("txtautoplay").value;
  var highlightonly = document.getElementById("highlightonly").checked;
  var highlight = document.getElementById("highlight").checked;
  var click = document.getElementById("click").checked;
  var slide = document.getElementById("slide").checked;
  var dragsize = document.getElementById("dragsize").value;
  var continous = document.getElementById("continous").checked;
  var spacebar = document.getElementById("spacebar").checked;
  var autoscroll = document.getElementById("autoscroll").checked;
  var useDoubleClick = document.getElementById("double").checked;
  var rescan = document.getElementById("rescan").checked;
  var CMscrollTop = myCodeMirror?.getScrollInfo().top;

  chrome.storage.local.set(
    {
      voiceIndex: index,
      voiceName: name,
      voiceSeed: speed,
      replaceStr: replace,
      spacetoplay: spacetoplay,
      autoplay: autoplay,
      divhilight: highlight,
      yhighlightonly: highlightonly,
      clickValue: click,
      slideValue: slide,
      dragsizeValue: dragsize,
      continousValue: continous,
      spacebarValue: spacebar,
      autoscrollValue: autoscroll,
      longestWord: longestWord,
      useDoubleClick: useDoubleClick,
      rescan: rescan,
      CMscrollTop: CMscrollTop,
      markLocations,
      markLocations,
    },
    function () {
      // Update status to let user know options were saved.
      var status = document.getElementById("status");
      status.textContent = "";
      sendMessageToBackground("readx save update");
      setTimeout(function () {
        status.textContent = "";
      }, 750);
    }
  );
}

function variablesAreloaded() {
  addVoiceTolist(0, g_voiceName.replace(/\\/gi, ""));
  addVoiceTolist(1, longestWord);

  var interval = setInterval(function () {
    voices = speechSynthesis.getVoices();

    if (voices.length) {
      clearInterval(interval);
      document.getElementById("voice").innerHTML = "";
      loadLangList();
    } else {
      return;
    }
  }, 100);
}

function loadLangList() {
  g_voiceIndex = selectVoice(g_voiceName);

  for (var i = 0; i < voices.length; i++) {
    option = addVoiceTolist(i, voices[i].name);
    if (i == g_voiceIndex) {
      option.selected = "true";
    }
  }

  document.getElementById("body").style.visibility = "visible";
}

function addVoiceTolist(i, name) {
  var option = document.createElement("option");
  option.setAttribute("value", i);
  option.text = name;
  document.getElementById("voice").appendChild(option);
  setLongestWord(name);

  return option;
}

function setLongestWord(word) {
  if (word.length > longestWord.length) {
    longestWord = word;
  }
}

function sendMessageToBackground(message) {
  chrome.runtime.sendMessage({ greeting: message }, (result) => {
    if (!chrome.runtime.lastError) {
    } else {
      console.log(chrome.runtime.lastError.message);
    }
  });
}

function selectVoice(strMatch) {
  var i;

  for (i = 0; i < voices.length; i++) {
    if (voices[i].name.match(new RegExp(strMatch, "ig"))) {
      return i;
    }
  }
  //if no match found
  return 0;
}

function regexEscape(str) {
  if (str == null) {
    return "";
  }

  return str.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&");
}

function getTabUrl() {
  var query = { active: true, currentWindow: true };
  chrome.tabs.query(query, callback);
}

function callback(tabs) {
  var currentTab = tabs[0];
  console.log(currentTab.url);
}

function redoUI() {
  var dragdiv = document.getElementById("dragSizesDiv");
  var dragsizeValue = document.getElementById("dragsize").value;
  var slideIsChecked = document.getElementById("slide").checked;
  if (slideIsChecked) {
    dragdiv.style.display = "initial";
  } else {
    dragdiv.style.display = "none";
  }

  rescaleSpeechCircle(dragsizeValue);
}

function rescaleSpeechCircle(value) {
  var speechCircle = document.getElementById("draggula");
  if (speechCircle) {
    speechCircle.style.lineHeight = value + "px";
    speechCircle.style.height = value + "px";
    speechCircle.style.width = value + "px";
  }
}

// Restores select box and checkbox state using the preferences
// stored in chrome.storage.
function restore_options() {
  document.getElementById("save").style.display = "none";

  var toggleBtn = document.getElementById("toggle");
  toggleBtn.style.width = "32px";
  toggleBtn.style.height = "32px";
  toggleBtn.addEventListener("click", function () {
    sendMessageToBackground("readx toggle");
    if (toggleBtn.checked == true) {
      startIt();
    } else {
      stopIt();
    }
  });

  //tab switching
  document.getElementById("first").addEventListener("click", openTab);
  document.getElementById("second").addEventListener("click", openTab);
  //tab select functions
  document.getElementById("btnspacebartoplay").addEventListener("click", select);
  document.getElementById("btnautoplay").addEventListener("click", select);

  //speed slider
  document.getElementById("speed").addEventListener("input", function () {
    document.getElementById("mySpeedValue").textContent = this.value / 100;
  });
  //drag to read slider value
  document.getElementById("dragsize").addEventListener("input", function () {
    document.getElementById("dragsizeValue").textContent = this.value;
    rescaleSpeechCircle(this.value);
  });

  //drag to read slider change refresh ui
  document.getElementById("slide").addEventListener("change", function () {
    redoUI();
  });

  function select(e) {
    sendMessageToBackground("readx select " + e.target.name);
    window.close();
  }

  function openTab(e) {
    tabcontent = document.getElementsByClassName("tabcontent");
    for (i = 0; i < tabcontent.length; i++) {
      tabcontent[i].style.display = "none";
    }
    document.getElementById(e.target.name).style.display = "block";

    let tablinks = document.getElementsByClassName("tablinks");
    for (i = 0; i < tablinks.length; i++) {
      tablinks[i].className = tablinks[i].className.replace(" active", "");
    }
    e.currentTarget.className += " active";
  }

  chrome.storage.local.get({ onOff: "off" }, function (data) {
    if (data.onOff === "on") {
      toggleBtn.checked = true;
      startIt();
    } else {
      toggleBtn.checked = false;
      stopIt();
    }
  });

  var tmpVoiceHolder = "Microsoft Aria Online";
  if (/Edg/.test(navigator.userAgent) == false) {
    tmpVoiceHolder = "Google US";
  }

  // Use default value color = 'red' and likesColor = true.
  chrome.storage.local.get(
    {
      voiceIndex: "10",
      voiceName: tmpVoiceHolder,
      voiceSeed: 100,
      replaceStr: "",
      spacetoplay: "",
      autoplay: "",
      divhilight: false,
      yhighlightonly: true,
      clickValue: true,
      slideValue: true,
      dragsizeValue: "30",
      continousValue: true,
      spacebarValue: true,
      autoscrollValue: true,
      longestWord: "",
      useDoubleClick: true,
      rescan: false,
      CMscrollTop: 0,
      markLocations: null,
    },
    function (items) {
      loadItems(items);
      /*if ( items.voiceName == "Microsoft Aria") {
        legacyStorageData();
      }*/
    }
  );
}

function saveOnChange() {
  document.getElementById("save").style.display = "none";
  save_options();
}

function loadItems(items) {
  longestWord = items.longestWord;
  g_voiceIndex = items.voiceIndex;
  g_voiceName = items.voiceName;
  g_rate = items.voiceSeed;
  document.getElementById("mySpeedValue").textContent = g_rate / 100;
  document.getElementById("speed").value = g_rate;

  document.getElementById("dragsizeValue").textContent = items.dragsizeValue;
  document.getElementById("dragsize").value = items.dragsizeValue;

  document.getElementById("replace").placeholder =
    "Replace spoken words.\n\nExample:\nthat're=>that are\nJan.=>January\n\nOr with RegEx\nRegEx=>that[\\u2018\\u2019']re=>that are\nRegEx=>\\bJan\\.\\b=>January";
  //document.getElementById("replace").value = items.replaceStr;

  CodeMirror.defineInitHook(function (cm) {
    //console.log("defining");
    //cm.on("cursorActivity", function(){ processChange(); } );
    cm.on("cursorActivity", function () {
      document.getElementById("save").style.display = "";
    });
  });

  var comp = [
    ["erase", "erase=>http(?:s)?://[^s]*[^ .]=>igm"],
    ["erase=>", "erase=>http(?:s)?://[^s]*[^ .]=>igm"],
    [
      "",
      "#attributeName:",
      "#attributeValue:",
      "#domain:all",
      "#dynamicContent:yes",
      "#listOfVoices:",
      "#listOfLocales:",
      "#voice:",
      "#removeNicknames:yes",
      "#outputWhatIsBeingRead:yes",
      "#outputOriginalText:yes",
      "#lastParagraphShortcutKey:",
      "#nextParagraphShortcutKey:",
      "#playPauseShortcutKey:",
      "#readAriaHidden:yes",
    ],
    [
      "#attributeName:",
      "#attributeValue:",
      "#domain:all",
      "#dynamicContent:yes",
      "#listOfVoices:",
      "#listOfLocales:",
      "#voice:",
      "#removeNicknames:yes",
      "#outputWhatIsBeingRead:yes",
      "#outputOriginalText:yes",
      "#lastParagraphShortcutKey:",
      "#nextParagraphShortcutKey:",
      "#playPauseShortcutKey:",
      "#readAriaHidden:yes",
    ],
  ];

  var comp2 = [
    [":", ":yes", ":no"],
    ["yes", "no"],
  ];

  function synonyms(cm, option) {
    return new Promise(function (accept) {
      setTimeout(function () {
        var cursor = cm.getCursor(),
          line = cm.getLine(cursor.line);
        var start = cursor.ch,
          end = cursor.ch;

        if (!line.match(/#domain:/gi)) {
          if (line.charAt(start) == "") --start;
          while (start && /[^:]/.test(line.charAt(start))) --start;
          while (end < line.length && /\w/.test(line.charAt(end))) ++end;
          var word = line.slice(start, end).toLowerCase();
          for (var i = 0; i < comp2.length; i++)
            if (comp2[i].indexOf(word) != -1) return accept({ list: comp2[i + 1], from: CodeMirror.Pos(cursor.line, start + 1), to: CodeMirror.Pos(cursor.line, end) });

          var cursor = cm.getCursor(),
            line = cm.getLine(cursor.line);
          var start = cursor.ch,
            end = cursor.ch;

          while (start && /\w/.test(line.charAt(start - 1))) --start;
          while (end < line.length && /\w/.test(line.charAt(end))) ++end;
          var word = line.slice(start, end).toLowerCase();
          for (var i = 0; i < comp.length; i++)
            if (line.trim().length < 1 || i == 0) {
              if (comp[i].indexOf(word) != -1) return accept({ list: comp[i + 1], from: CodeMirror.Pos(cursor.line, start), to: CodeMirror.Pos(cursor.line, end) });
            }
        }
        return accept(null);
      }, 100);
    });
  }

  var myTextArea = document.getElementById("replace");
  myTextArea.value = items.replaceStr;
  myCodeMirror = CodeMirror.fromTextArea(myTextArea, {
    tabSize: 4,
    mode: "readxconf",
    theme: "default",
    lineWrapping: true,
    value: myTextArea.value,
    lineNumbers: true,
    extraKeys: { "Ctrl-Space": "autocomplete" },
    hintOptions: { hint: synonyms },
    styleActiveSelected: false,
    styleActiveLine: false,
    indentWithTabs: false,
    matchBrackets: false,
    highlightMatches: false,
    foldGutter: true,
    gutters: ["CodeMirror-linenumbers", "CodeMirror-foldgutter"],
  });

  myCodeMirror.on("blur", function () {
    saveOnChange();
  });

  myCodeMirror.setSize("99%", "195px");

  //CodeMirror.commands.foldAll(myCodeMirror);
  let mLoc = items.markLocations;
  for (i = 0; mLoc && i < mLoc.length; i++) {
    myCodeMirror.foldCode(CodeMirror.Pos(mLoc[i].from, mLoc[i].to), "fold");
  }
  myCodeMirror.scrollTo(0, items.CMscrollTop);

  if (items.spacetoplay !== undefined) {
    document.getElementById("txtspacebartoplay").value = items.spacetoplay;
  }
  if (items.autoplay !== undefined) {
    document.getElementById("txtautoplay").value = items.autoplay;
  }

  document.getElementById("highlight").checked = items.divhilight;
  document.getElementById("highlightonly").checked = items.yhighlightonly;

  if (items.divhilight == false) {
    document.getElementById("hidden").style.display = "none";
  }

  document.getElementById("continous").checked = items.continousValue;
  document.getElementById("spacebar").checked = items.spacebarValue;

  document.getElementById("autoscroll").checked = items.autoscrollValue;

  document.getElementById("double").checked = items.useDoubleClick;

  document.getElementById("rescan").checked = items.rescan;

  document.getElementById("click").checked = items.clickValue;
  document.getElementById("slide").checked = items.slideValue;
  variablesAreloaded();

  periodicSaveInterval = setInterval(() => {
    periodicSaveIfNeeded();
  }, 1000);

  redoUI();
  addListeners();
  sendMessageToBackground("readx select nothing");
}

function addListeners() {
  //auto save code for elements

  //on key and mouse up
  document.getElementById("dragsize").addEventListener("mouseup", function () {
    saveOnChange();
  });

  document.getElementById("speed").addEventListener("mouseup", function () {
    saveOnChange();
  });

  //on key and key up
  document.getElementById("dragsize").addEventListener("keyup", function () {
    saveOnChange();
  });
  document.getElementById("speed").addEventListener("keyup", function () {
    saveOnChange();
  });

  //on change listeners
  document.getElementById("voice").addEventListener("change", function () {
    saveOnChange();
  });
  document.getElementById("continous").addEventListener("change", function () {
    saveOnChange();
  });
  document.getElementById("slide").addEventListener("change", function () {
    saveOnChange();
  });
  document.getElementById("spacebar").addEventListener("change", function () {
    saveOnChange();
  });
  document.getElementById("click").addEventListener("change", function () {
    saveOnChange();
  });
  document.getElementById("highlightonly").addEventListener("change", function () {
    saveOnChange();
  });

  document.getElementById("autoscroll").addEventListener("change", function () {
    saveOnChange();
  });

  document.getElementById("single").addEventListener("change", function () {
    saveOnChange();
  });
  document.getElementById("double").addEventListener("change", function () {
    saveOnChange();
  });

  document.getElementById("rescan").addEventListener("change", function () {
    saveOnChange();
  });

  document.getElementById("replace").addEventListener("change", function () {
    //alert("alert");
    saveOnChange();
  });

  document.getElementById("replace").addEventListener("keyup", function () {
    //alert("alert");
    //document.getElementById("save").style.display = "";
  });

  document.getElementById("txtspacebartoplay").addEventListener("change", function () {
    //alert("alert");
    saveOnChange();
  });

  document.getElementById("txtautoplay").addEventListener("change", function () {
    //alert("alert");
    saveOnChange();
  });
}

document.addEventListener("DOMContentLoaded", restore_options);
document.getElementById("save").addEventListener("click", function () {
  document.getElementById("save").style.display = "none";
});

function debounce(func, timeout = 500) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      func.apply(this, args);
    }, timeout);
  };
}

var c = document.getElementById("c");
var ctx = c.getContext("2d");
c.height = 1080 * 0.56; //window.innerHeight;
c.width = 1920 * 0.56; //window.innerWidth;
var chinese = "田由甲申甴电甶男甸甹町画甼甽甾甿畀畁畂畃畄畅畆畇畈畉畊畋界畍畎畏畐畑";
chinese = chinese.split("");
var font_size = 10;
var columns = c.width / font_size;
var drops = [];
var erase = [];
var redLine = -1;
for (var x = 0; x < columns; x++) {
  drops[x] = c.height;
  erase[x] = c.height;
}
function draw() {
  ctx.fillStyle = "rgba(255, 255, 255, 0.05)";
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.fillStyle = "#0F0";
  ctx.font = font_size + "px arial";
  for (var i = 0; i < drops.length; i++) {
    if (checkDrops(drops[i])) {
      drops[i] = 0;
    }
    if (drops[i] < c.height && checkDrops(erase[i]) && drops[i] > 20) {
      erase[i] = 0;
    }

    var text = chinese[Math.floor(Math.random() * chinese.length)];
    ctx.fillStyle = "#BDBDE9";
    ctx.fillText(text, i * font_size, drops[i] * font_size);
    drops[i]++;

    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(i * font_size, erase[i] * font_size, font_size, font_size);
    erase[i]++;
  }
}

function checkDrops(e) {
  return e * font_size > c.height && Math.random() > 0.975;
}

var interV = 0;
function startIt() {
  if (interV == 0) {
    interV = setInterval(draw, 66);
  }
}

function stopIt() {
  if (interV != 0) {
    clearInterval(interV);
    interV = 0;
  }
}

ctx.fillStyle = "rgba(255, 255, 255, 1.0)";
ctx.fillRect(0, 0, c.width, c.height);
