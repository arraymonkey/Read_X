// CodeMirror, copyright (c) by Marijn Haverbeke and others
// Distributed under an MIT license: https://codemirror.net/5/LICENSE

(function (mod) {
  if (typeof exports == "object" && typeof module == "object")
    // CommonJS
    mod(require("../../lib/codemirror"));
  else if (typeof define == "function" && define.amd)
    // AMD
    define(["../../lib/codemirror"], mod);
  // Plain browser env
  else mod(CodeMirror);
})(function (CodeMirror) {
  "use strict";

  CodeMirror.defineMode("readxconf", function (config) {
    var Context = function (tokenizer, parent) {
      this.next = tokenizer;
      this.parent = parent;
    };

    var Token = function (name, context, eos) {
      this.name = name;
      this.context = context;
      this.eos = eos;
    };

    var State = function () {
      this.context = new Context(next, null);
      this.expectVariable = true;
      this.indentation = 0;
      this.userIndentationDelta = 0;
    };

    State.prototype.userIndent = function (indentation) {
      this.userIndentationDelta = indentation > 0 ? indentation / config.indentUnit - this.indentation : 0;
    };

    function myPeek(stream) {
      let peek = stream.peek();
      if (peek == null) {
        peek = " ";
      }
      return peek;
    }

    var next = function (stream, context, state) {
      var token = new Token(null, context, false);
      var aChar = stream.next();

      if (aChar === "/" && myPeek(stream).toLowerCase() == "/") {
        let found = stream.string.match(/^\/\/.*/gim);
        let notFound = stream.string.match(/=>/gim);
        if (found && found[0] && notFound == null) {
          for (let i = 0; i < found[0].length - 1; i++) {
            stream.next();
          }
          token = new Token("meta", context, true);
          return token;
        }
      }

      if (aChar === "#") {
        let found = stream.string.match(
          /^#dynamiccontent:|^#readAriaHidden:|^#voice:|^#attributeName:|^#attributeValue:|^#removenicknames:|^#listofvoices:|^#listOfLocales:|^#outputwhatisbeingread:|^#outputoriginaltext:|^#lastParagraphShortcutKey:|^#nextParagraphShortcutKey:|#playpauseshortcutkey:/gim
        );
        if (found && found[0]) {
          for (let i = 0; i < found[0].length - 1; i++) {
            stream.next();
          }
          token = new Token("property", context, true);
          return token;
        }

        found = stream.string.match(/^#domain:.*$/gim);
        if (found && found[0]) {
          for (let i = 0; i < found[0].length - 1; i++) {
            stream.next();
          }
          token = new Token("number", context, true);

          return token;
        }
      }

      let match = "regex";
      let foundIt = false;
      for (let i = 0; i < match.length - 1; i++) {
        if (aChar && aChar.toLowerCase() == match[i] && myPeek(stream).toLowerCase() == match[i + 1]) {
          foundIt = true;
          aChar = stream.next();
        } else {
          foundIt = false;
          break;
        }
      }
      if (foundIt) {
        token = new Token("tag", context, true);
        return token;
      }

      match = "erase";
      foundIt = false;
      for (let i = 0; i < match.length - 1; i++) {
        if (aChar && aChar.toLowerCase() == match[i] && myPeek(stream).toLowerCase() == match[i + 1]) {
          foundIt = true;
          aChar = stream.next();
        } else {
          foundIt = false;
          break;
        }
      }
      if (foundIt) {
        token = new Token("tag", context, true);
        return token;
      }

      if (myPeek(stream) == "=") {
        return token;
      }

      if (aChar === "=") {
        var aChar = stream.next();
        if (aChar === ">") {
          token = new Token("comment", context, true);
          return token;
        }
      }
      /*if (aChar === "#") {
        token = new Token('keyword', context, true);
        return token;
      }*/

      return token;
    };

    return {
      startState: function () {
        return new State();
      },

      token: function (stream, state) {
        state.userIndent(stream.indentation());

        if (stream.eatSpace()) {
          return null;
        }

        var token = state.context.next(stream, state.context, state);
        state.context = token.context;
        state.expectVariable = token.eos;

        return token.name;
      },

      fold: "indent",
    };
  });

  CodeMirror.defineMIME("text/readxconf", { name: "readxconf" });
});
